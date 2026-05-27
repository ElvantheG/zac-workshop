#!/usr/bin/env python3
"""
♠ POKER ADVISOR BOT  –  Texas Hold'em Decision Engine
=====================================================
Giver dig optimal spilanbefaling baseret på:
- GTO principper
- Pot Odds & Expected Value
- Position
- Spillertyper-analyse
- Monte Carlo simulering

Kør: python3 bot.py
"""

import random
import itertools
import os
import sys
from typing import Optional

# ══════════════════════════════════════════════
#  KORT SYSTEM
# ══════════════════════════════════════════════
RANKS  = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
SUITS  = ['s','h','d','c']
RANK_V = {r: i+2 for i, r in enumerate(RANKS)}
SUIT_S = {'s':'♠','h':'♥','d':'♦','c':'♣'}
RANK_D = {'T':'10','J':'J','Q':'Q','K':'K','A':'A'}

def display_rank(r):
    return '10' if r == 'T' else r

def card_str(card):
    if card is None: return '??'
    return f"{display_rank(card[0])}{SUIT_S[card[1]]}"

def parse_card(s: str) -> Optional[tuple]:
    """Parse 'As', 'Kh', 'Td', '2c' etc."""
    s = s.strip().upper()
    if len(s) < 2: return None
    rank = s[0]
    suit = s[-1].lower()
    if rank == '1' and len(s) >= 3 and s[1] == '0':
        rank = 'T'
        suit = s[2].lower()
    if rank not in RANKS or suit not in SUITS:
        return None
    return (rank, suit)

# ══════════════════════════════════════════════
#  HÅND EVALUATOR
# ══════════════════════════════════════════════
def evaluate_5(cards):
    """Evaluer en 5-korts hånd. Returner (rank_int, name, [tiebreakers])"""
    vals  = sorted([RANK_V[c[0]] for c in cards], reverse=True)
    suits = [c[1] for c in cards]
    flush = len(set(suits)) == 1

    straight = all(vals[i]-vals[i+1]==1 for i in range(4))
    sh = vals[0]
    if not straight and vals[0]==14 and vals[1]==5 and vals[2]==4 and vals[3]==3 and vals[4]==2:
        straight, sh = True, 5

    cnt = {}
    for v in vals: cnt[v] = cnt.get(v,0)+1
    grp = sorted(cnt.items(), key=lambda x:(-x[1],-x[0]))

    if flush and straight:
        name = 'Royal Flush' if sh==14 else 'Straight Flush'
        return (8, name, [sh])
    if grp[0][1]==4: return (7,'Four of a Kind',[grp[0][0],grp[1][0]])
    if grp[0][1]==3 and grp[1][1]==2: return (6,'Full House',[grp[0][0],grp[1][0]])
    if flush: return (5,'Flush',vals)
    if straight: return (4,'Straight',[sh])
    if grp[0][1]==3: return (3,'Three of a Kind',[grp[0][0]]+[g[0] for g in grp[1:]])
    if grp[0][1]==2 and grp[1][1]==2: return (2,'Two Pair',[grp[0][0],grp[1][0],grp[2][0]])
    if grp[0][1]==2: return (1,'One Pair',[grp[0][0]]+[g[0] for g in grp[1:]])
    return (0,'High Card',vals)

def best_from_7(cards):
    best = None
    for combo in itertools.combinations(cards, 5):
        h = evaluate_5(combo)
        if best is None or h[0] > best[0] or (h[0]==best[0] and h[2] > best[2]):
            best = h
    return best

def cmp_hands(a, b):
    if a[0] != b[0]: return 1 if a[0]>b[0] else -1
    for x,y in zip(a[2], b[2]):
        if x != y: return 1 if x>y else -1
    return 0

# ══════════════════════════════════════════════
#  MONTE CARLO
# ══════════════════════════════════════════════
def monte_carlo(hole, board, n_opp, sims=8000):
    used = set(tuple(c) for c in hole+board)
    deck = [(r,s) for r in RANKS for s in SUITS if (r,s) not in used]

    wins = ties = losses = 0
    needed = 5 - len(board)

    for _ in range(sims):
        random.shuffle(deck)
        run = deck[:needed]
        opp_cards = deck[needed:needed+n_opp*2]
        full_board = board + run

        if len(opp_cards) < n_opp*2:
            continue

        my  = best_from_7(hole + full_board)
        won = True
        tie = False

        for i in range(n_opp):
            opp_hole = [opp_cards[i*2], opp_cards[i*2+1]]
            opp = best_from_7(opp_hole + full_board)
            c = cmp_hands(my, opp)
            if c < 0: won=False; break
            if c == 0: tie=True

        if won and not tie: wins+=1
        elif won and tie:   ties+=1
        else:               losses+=1

    total = wins+ties+losses
    if total == 0: return 33.3, 33.3, 33.3
    return wins/total*100, ties/total*100, losses/total*100

# ══════════════════════════════════════════════
#  PREFLOP STRENGTH
# ══════════════════════════════════════════════
def preflop_strength(hole):
    r1, r2 = RANK_V[hole[0][0]], RANK_V[hole[1][0]]
    suited = hole[0][1] == hole[1][1]
    hi, lo = max(r1,r2), min(r1,r2)
    pair   = r1 == r2
    gap    = hi - lo

    if pair:
        if hi >= 13: return 95, "👑 Premium pair (AA/KK)"
        if hi == 12: return 85, "👑 Premium pair (QQ)"
        if hi == 11: return 75, "🔥 Stærk pair (JJ)"
        if hi == 10: return 68, "🔥 Stærk pair (TT)"
        if hi >= 7:  return 55, "✅ Medium pair"
        return 40, "⚠️ Small pair (set-mining)"
    if hi==14 and lo==13:
        return (82 if suited else 68), f"👑 {'AKs' if suited else 'AKo'} – Top 3 hånd"
    if hi==14 and lo==12:
        return (72 if suited else 60), f"🔥 {'AQs' if suited else 'AQo'}"
    if hi==14 and lo==11 and suited:
        return 66, "🔥 AJs – Stærk suited ace"
    if hi==14 and suited:
        return 52, "✅ Suited Ace"
    if suited and gap<=2 and lo>=8:
        return 55, "✅ Suited connector"
    if suited and gap<=4 and lo>=5:
        return 42, "⚠️ Speculative suited"
    if hi>=10 and lo>=10:
        return 48, "⚠️ Broadway offsuit"
    return 25, "❌ Svag hånd"

# ══════════════════════════════════════════════
#  POSITION
# ══════════════════════════════════════════════
POSITIONS = {
    'UTG': ('Early', 1.0),
    'UTG+1': ('Early', 1.0),
    'MP': ('Middle', 1.3),
    'MP+1': ('Middle', 1.3),
    'CO': ('Late', 1.6),
    'BTN': ('Late', 2.0),
    'SB': ('Blind', 0.9),
    'BB': ('Blind', 1.0),
}

# ══════════════════════════════════════════════
#  SPILLERTYPE ANALYSE
# ══════════════════════════════════════════════
def classify_opponent(vpip: float, pfr: float) -> dict:
    gap = vpip - pfr
    if vpip < 15:
        return {'type':'🐢 Nit','color':'\033[90m',
                'strategy':'Value bet thinly. Steal blinds. Fold mod deres 3-bet.'}
    if vpip<=25 and pfr>=12 and gap<=8:
        return {'type':'🎯 TAG (Tight-Aggressive)','color':'\033[92m',
                'strategy':'Spil solid. 3-bet/fold spots. Undgå store pots uden stærke hænder.'}
    if vpip<=40 and pfr>=20:
        return {'type':'⚡ LAG (Loose-Aggressive)','color':'\033[93m',
                'strategy':'Kald bredt med gode hænder. Lad dem bluf-catch. Trap aggressivt.'}
    if vpip>35 and pfr<12:
        return {'type':'🐟 Calling Station','color':'\033[94m',
                'strategy':'VALUE BET ALTID! Bluff ALDRIG. De folder ikke.'}
    if vpip>50 and pfr>35:
        return {'type':'🌀 Maniac','color':'\033[91m',
                'strategy':'Trap med stærke hænder. Kald bredt. Lad dem ødelægge sig selv.'}
    return {'type':'❓ Ukendt/Mixed','color':'\033[0m',
            'strategy':'Samle mere information. Spil standard GTO til du ser mønster.'}

# ══════════════════════════════════════════════
#  BESLUTNINGS-ENGINE
# ══════════════════════════════════════════════
def make_decision(win_pct: float, pot_odds_pct: float, position_mult: float,
                  street: str, pre_strength: int, opp_type: dict) -> dict:
    """Returner optimal beslutning med anbefaling og reasoning."""

    ev_edge = win_pct - pot_odds_pct
    adj_win = win_pct * position_mult  # position boost

    action = ''
    size   = ''
    reasoning = []
    confidence = ''

    # Special: Pre-flop
    if street == 'preflop':
        if pre_strength >= 80:
            action='RAISE'; size='3–4x BB'
            reasoning.append(f"Premium hånd ({pre_strength}% styrke) – raise/re-raise aggressivt")
            confidence='Meget høj'
        elif pre_strength >= 60:
            action='RAISE'; size='2.5–3x BB'
            reasoning.append(f"Stærk hånd ({pre_strength}% styrke)")
            if position_mult >= 1.6:
                reasoning.append("Sen position giver dig ekstra edge")
            confidence='Høj'
        elif pre_strength >= 45:
            if position_mult >= 1.6:
                action='RAISE/CALL'; size='2x BB'
                reasoning.append("Playabel hånd + sen position = profitable")
            else:
                action='FOLD'; size=''
                reasoning.append("For svag til early/mid position. Tålmodighed!")
            confidence='Medium'
        else:
            action='FOLD'; size=''
            reasoning.append("Hånd for svag til profitable spil pre-flop")
            confidence='Høj'
        return dict(action=action, size=size, reasoning=reasoning,
                    confidence=confidence, ev_edge=ev_edge)

    # Post-flop
    if win_pct >= 75:
        action='RAISE/BET'; size='60–100% pot'
        reasoning.append(f"Du er stor favorit ({win_pct:.0f}%). Byg potten!")
        confidence='Meget høj'
    elif win_pct >= 60:
        action='BET'; size='50–70% pot'
        reasoning.append(f"Du er favorit ({win_pct:.0f}%). Value bet.")
        confidence='Høj'
    elif win_pct >= 45 and ev_edge >= 0:
        action='CHECK/CALL'; size=''
        reasoning.append(f"EV-positiv ({ev_edge:+.1f}%). Kald eller check-call.")
        confidence='Medium'
    elif ev_edge >= 5:
        action='CALL'; size=''
        reasoning.append(f"Pot odds giver dig edge ({ev_edge:+.1f}%). Kald er profitable.")
        confidence='Medium'
    elif win_pct >= 30 and street in ('flop','turn'):
        action='SEMI-BLUFF'; size='40–60% pot'
        reasoning.append("Draw med equity – bet giver 2 vejmuligheder til at vinde")
        confidence='Medium'
    else:
        action='FOLD'; size=''
        reasoning.append(f"Win% ({win_pct:.0f}%) under pot odds ({pot_odds_pct:.0f}%). Negativ EV.")
        confidence='Høj'

    # Position adjustment
    if position_mult >= 1.6 and action in ('CHECK/CALL',):
        reasoning.append("Sen position: overvej at bet/raise i stedet for at check-call")
    if position_mult < 1.0 and action in ('BET','RAISE/BET'):
        reasoning.append("Early position: overvej at size lidt smaller – OOP-ulempe")

    # Opponent adjustment
    if opp_type['type'].startswith('🐟') and 'BLUFF' in action.upper():
        action='CHECK'; reasoning.append("⚠️ Calling Station – bluff IKKE mod dem!")
    if opp_type['type'].startswith('🐢') and action == 'FOLD':
        reasoning.append("Nit folder meget – overvej steal hvis du er i position")

    return dict(action=action, size=size, reasoning=reasoning,
                confidence=confidence, ev_edge=ev_edge)

# ══════════════════════════════════════════════
#  CLI HELPERS
# ══════════════════════════════════════════════
C = {
    'reset':'\033[0m','bold':'\033[1m',
    'green':'\033[92m','yellow':'\033[93m',
    'red':'\033[91m','cyan':'\033[96m',
    'white':'\033[97m','gray':'\033[90m',
    'bg_green':'\033[42m','bg_red':'\033[41m',
}

def clr(text, *codes):
    return ''.join(C.get(c,'') for c in codes) + str(text) + C['reset']

def header():
    os.system('clear' if os.name=='posix' else 'cls')
    print(clr("╔══════════════════════════════════════════╗", 'cyan','bold'))
    print(clr("║    ♠ POKER ADVISOR BOT  –  Texas Hold'em ║", 'cyan','bold'))
    print(clr("╚══════════════════════════════════════════╝", 'cyan','bold'))
    print()

def ask(prompt, default=None):
    suffix = f" [{default}]" if default else ""
    try:
        val = input(clr(f"  → {prompt}{suffix}: ", 'white')).strip()
    except (EOFError, KeyboardInterrupt):
        sys.exit(0)
    return val if val else (default or '')

def ask_cards(prompt, n):
    while True:
        raw = ask(f"{prompt} (fx As Kh)")
        parts = raw.split()
        cards = [parse_card(p) for p in parts]
        cards = [c for c in cards if c]
        if len(cards) == n:
            return cards
        if n == 0 and (not raw or raw.lower() in ('','n','-')):
            return []
        print(clr(f"  ⚠  Skriv præcis {n} gyldige kort (fx: As Kh)","yellow"))

def ask_board():
    while True:
        raw = ask("Board-kort (0-5 kort, eller tryk Enter for pre-flop)")
        if not raw or raw.lower() in ('-','n'):
            return []
        parts = raw.split()
        cards = [parse_card(p) for p in parts]
        cards = [c for c in cards if c]
        if 0 <= len(cards) <= 5:
            return cards
        print(clr("  ⚠  0–5 kort tilladt", 'yellow'))

def progress_bar(pct, width=30, color='green'):
    filled = int(pct/100 * width)
    bar = '█'*filled + '░'*(width-filled)
    return clr(f"[{bar}] {pct:.1f}%", color)

def action_color(action):
    if any(w in action for w in ('FOLD',)): return 'red'
    if any(w in action for w in ('RAISE','BET','SEMI')): return 'green'
    return 'yellow'

# ══════════════════════════════════════════════
#  SESSION TRACKER
# ══════════════════════════════════════════════
class Session:
    def __init__(self):
        self.hands = 0
        self.folds = 0
        self.bets  = 0
        self.calls = 0
        self.avg_equity = []

    def record(self, action, equity):
        self.hands += 1
        self.avg_equity.append(equity)
        a = action.upper()
        if 'FOLD' in a: self.folds += 1
        elif 'BET' in a or 'RAISE' in a: self.bets += 1
        else: self.calls += 1

    def stats(self):
        if self.hands == 0: return
        fold_pct  = self.folds/self.hands*100
        aggr_pct  = self.bets/self.hands*100
        avg_eq    = sum(self.avg_equity)/len(self.avg_equity)
        print(clr("\n  📊 SESSION STATISTIK", 'cyan','bold'))
        print(f"  Hænder analyseret : {self.hands}")
        print(f"  Fold rate         : {fold_pct:.0f}%  {'✅' if 60<fold_pct<85 else '⚠️'}")
        print(f"  Aggression rate   : {aggr_pct:.0f}%  {'✅' if aggr_pct>40 else '⚠️ for passiv'}")
        print(f"  Gns. equity       : {avg_eq:.0f}%")

        # Tilt warning
        if len(self.avg_equity) >= 3:
            recent = self.avg_equity[-3:]
            if all(e < 35 for e in recent):
                print(clr("\n  🔥 TILT-ADVARSEL: Du har haft 3 dårlige hænder i træk.", 'yellow','bold'))
                print(clr("     Overvej en pause! Tilt er den #1 årsag til tab.", 'yellow'))

# ══════════════════════════════════════════════
#  HOVED BOT LOOP
# ══════════════════════════════════════════════
def run():
    session = Session()
    header()
    print(clr("  Velkommen til Poker Advisor Bot!", 'white','bold'))
    print(clr("  Jeg analyserer dine hænder og giver dig GTO-baserede anbefalinger.", 'gray'))
    print(clr("  Tryk Ctrl+C eller skriv 'quit' for at afslutte.\n", 'gray'))

    # Valgfri: Modstander info
    print(clr("  ── MODSTANDER SETUP (valgfrit) ──────────────────", 'cyan'))
    vpip_str = ask("Modstander VPIP% (eller Enter for at springe over)", "?")
    pfr_str  = ask("Modstander PFR%  (eller Enter for at springe over)", "?")

    opp_type = {'type':'❓ Ukendt','color':'\033[0m',
                'strategy':'Spil standard GTO. Samle info om modstanderen.'}
    if vpip_str not in ('?','','n') and pfr_str not in ('?','','n'):
        try:
            opp_type = classify_opponent(float(vpip_str), float(pfr_str))
        except:
            pass

    print(f"\n  Modstandertype: {opp_type['color']}{opp_type['type']}\033[0m")
    print(clr(f"  Strategi: {opp_type['strategy']}", 'gray'))

    while True:
        print(clr("\n  ══════════════════════════════════════════════", 'cyan'))
        print(clr(f"  HÅND #{session.hands+1}", 'white','bold'))
        print(clr("  ══════════════════════════════════════════════", 'cyan'))

        # Kort input
        hole = ask_cards("Dine 2 hånds-kort", 2)
        board = ask_board()

        used_keys = set(tuple(c) for c in hole+board)

        # Duplicat check
        if len(used_keys) < len(hole)+len(board):
            print(clr("  ⚠  Duplikerede kort! Prøv igen.", 'red'))
            continue

        # Antal modstandere
        n_opp_str = ask("Antal aktive modstandere", "1")
        try: n_opp = max(1, min(8, int(n_opp_str)))
        except: n_opp = 1

        # Position
        print(clr("\n  Positioner: UTG, UTG+1, MP, MP+1, CO, BTN, SB, BB", 'gray'))
        pos_str = ask("Din position", "BTN").upper()
        pos_info = POSITIONS.get(pos_str, ('Late', 1.5))
        pos_mult = pos_info[1]

        # Pot & Bet
        pot_str  = ask("Pot størrelse (kr/chips)", "100")
        call_str = ask("Bet du skal calle (0 = du checker/betler)", "0")
        try: pot  = float(pot_str)
        except: pot = 100
        try: call = float(call_str)
        except: call = 0

        # Street
        n_board = len(board)
        if n_board == 0:   street = 'preflop'
        elif n_board == 3: street = 'flop'
        elif n_board == 4: street = 'turn'
        else:              street = 'river'

        # ── Beregn ──────────────────────────────
        print(clr("\n  ⏳ Kører Monte Carlo simulation...", 'gray'))
        pre_str, pre_name = preflop_strength(hole)
        win_pct, tie_pct, loss_pct = monte_carlo(hole, board, n_opp, sims=6000)
        pot_odds_pct = (call / (pot+call) * 100) if call > 0 else 0

        # Nuværende hånd
        current_hand = None
        if board:
            h = best_from_7(hole + board)
            current_hand = h[1] if h else None

        decision = make_decision(win_pct, pot_odds_pct, pos_mult,
                                 street, pre_str, opp_type)

        # ── Output ──────────────────────────────
        print()
        print(clr("  ┌─────────────────────────────────────────┐", 'cyan'))
        print(clr("  │            ANALYSE RESULTAT             │", 'cyan','bold'))
        print(clr("  └─────────────────────────────────────────┘", 'cyan'))

        # Kort visning
        hand_disp = ' '.join(card_str(c) for c in hole)
        board_disp = ' '.join(card_str(c) for c in board) if board else '–'
        print(f"\n  🃏 Din hånd   : {clr(hand_disp, 'white','bold')}")
        print(f"  🎴 Board      : {clr(board_disp, 'white')}")
        if current_hand:
            print(f"  🏆 Bedste hånd: {clr(current_hand, 'yellow','bold')}")
        print(f"  📍 Position   : {pos_str} ({pos_info[0]}, mult: {pos_mult}x)")

        # Odds
        print(f"\n  📊 ODDS:")
        wcolor = 'green' if win_pct>50 else 'yellow' if win_pct>35 else 'red'
        print(f"  Vinde   : {progress_bar(win_pct, 25, wcolor)}")
        print(f"  Uafgjort: {progress_bar(tie_pct, 25, 'gray')}")
        print(f"  Tabe    : {progress_bar(loss_pct, 25, 'red')}")

        if call > 0:
            ev = win_pct/100*(pot+call) - call
            ev_color = 'green' if ev > 0 else 'red'
            print(f"\n  💰 Pot Odds : {pot_odds_pct:.1f}%")
            print(f"  💰 EV call  : {clr(f'{ev:+.1f} kr', ev_color, 'bold')}")

        # Anbefaling
        act_color = action_color(decision['action'])
        print(f"\n  {'═'*43}")
        print(f"  🤖 ANBEFALING : {clr(decision['action'], act_color, 'bold')}", end='')
        if decision['size']:
            print(f"  ({clr(decision['size'], 'cyan')})", end='')
        print()
        print(f"  🎯 Sikkerhed  : {decision['confidence']}")
        print(f"  {'═'*43}")

        print(f"\n  📝 Reasoning:")
        for r in decision['reasoning']:
            print(f"  • {r}")

        # Modstander
        print(f"\n  👤 Mod. type  : {opp_type['color']}{opp_type['type']}\033[0m")
        print(f"  💡 Tip        : {clr(opp_type['strategy'], 'gray')}")

        session.record(decision['action'], win_pct)

        # Næste
        print()
        nxt = ask("Næste hånd? (Enter=ja, 's'=statistik, 'q'=afslut)", "ja")
        if nxt.lower() in ('q','quit','nej','no','exit'):
            break
        if nxt.lower() == 's':
            session.stats()
            ask("Tryk Enter for at fortsætte")

    # Afslut
    print(clr("\n  ── SLUT PÅ SESSION ──", 'cyan','bold'))
    session.stats()
    print(clr("\n  Gl&oslash;d luck ved bordet! 🃏\n", 'green'))

# ══════════════════════════════════════════════
if __name__ == '__main__':
    try:
        run()
    except KeyboardInterrupt:
        print(clr("\n\n  Afslutter... Gl med spillet! 🃏\n", 'green'))
