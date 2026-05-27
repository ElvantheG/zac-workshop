/* ============================================================
   POKER CALCULATOR  –  Texas Hold'em
   ============================================================ */

// ── Card representation ──────────────────────────────────────
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['s','h','d','c'];
const RANK_VAL = Object.fromEntries(RANKS.map((r,i) => [r, i+2]));
const SUIT_SYMBOLS = { s:'♠', h:'♥', d:'♦', c:'♣' };
const SUIT_LABEL   = { s:'Spar', h:'Hjerter', d:'Ruder', c:'Klør' };

function cardKey(rank, suit) { return rank + suit; }
function cardDisplay(rank, suit) {
  const r = rank === 'T' ? '10' : rank;
  return `${r}${SUIT_SYMBOLS[suit]}`;
}
function isRed(suit) { return suit === 'h' || suit === 'd'; }

// ── Hand Evaluator ───────────────────────────────────────────
// Returns { rank, name, tiebreaker[] }
// rank: 8=SF,7=Quads,6=FH,5=Flush,4=Straight,3=Trips,2=TwoPair,1=Pair,0=HighCard

function evaluateHand(cards) {
  // cards: array of {rank, suit} – exactly 5
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a,b) => b-a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = vals.every((v,i) => i === 0 || vals[i-1] - v === 1);
  let straightHigh = vals[0];
  // Wheel: A-2-3-4-5
  if (!isStraight && vals[0] === 14 && vals[1] === 5 && vals[2] === 4 && vals[3] === 3 && vals[4] === 2) {
    isStraight = true; straightHigh = 5;
  }

  // Count ranks
  const cnt = {};
  vals.forEach(v => cnt[v] = (cnt[v]||0)+1);
  const groups = Object.entries(cnt).map(([v,c]) => [+v,c]).sort((a,b) => b[1]-a[1]||b[0]-a[0]);

  if (isFlush && isStraight) {
    const name = straightHigh === 14 ? 'Royal Flush' : 'Straight Flush';
    return { rank: 8, name, tb: [straightHigh] };
  }
  if (groups[0][1] === 4) return { rank:7, name:'Four of a Kind', tb: [groups[0][0], groups[1][0]] };
  if (groups[0][1] === 3 && groups[1][1] === 2) return { rank:6, name:'Full House', tb:[groups[0][0],groups[1][0]] };
  if (isFlush) return { rank:5, name:'Flush', tb: vals };
  if (isStraight) return { rank:4, name:'Straight', tb:[straightHigh] };
  if (groups[0][1] === 3) return { rank:3, name:'Three of a Kind', tb:[groups[0][0],...groups.slice(1).map(g=>g[0])] };
  if (groups[0][1] === 2 && groups[1][1] === 2) return { rank:2, name:'Two Pair', tb:[groups[0][0],groups[1][0],groups[2][0]] };
  if (groups[0][1] === 2) return { rank:1, name:'One Pair', tb:[groups[0][0],...groups.slice(1).map(g=>g[0])] };
  return { rank:0, name:'High Card', tb: vals };
}

function compareTB(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

function bestHand7(cards) {
  // Best 5-card hand from up to 7 cards
  let best = null;
  const n = cards.length;
  for (let a = 0; a < n-4; a++)
  for (let b = a+1; b < n-3; b++)
  for (let c = b+1; c < n-2; c++)
  for (let d = c+1; d < n-1; d++)
  for (let e = d+1; e < n; e++) {
    const hand = evaluateHand([cards[a],cards[b],cards[c],cards[d],cards[e]]);
    if (!best || hand.rank > best.rank || (hand.rank === best.rank && compareTB(hand.tb, best.tb) > 0)) {
      best = hand;
    }
  }
  return best;
}

// ── Monte Carlo Simulation ───────────────────────────────────
function buildDeck(exclude) {
  const deck = [];
  for (const r of RANKS)
    for (const s of SUITS)
      if (!exclude.has(r+s))
        deck.push({rank:r, suit:s});
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function monteCarlo(holeCards, boardCards, numOpponents, sims = 10000) {
  const used = new Set([...holeCards, ...boardCards].map(c => c.rank+c.suit));
  let wins = 0, ties = 0, losses = 0;
  const needed = 5 - boardCards.length;

  for (let i = 0; i < sims; i++) {
    const deck = shuffle(buildDeck(used));
    const runout = deck.slice(0, needed);
    const board  = [...boardCards, ...runout];
    const myHand = bestHand7([...holeCards, ...board]);

    let won = true, tied = false;
    for (let op = 0; op < numOpponents; op++) {
      const opHole = deck.slice(needed + op*2, needed + op*2 + 2);
      if (opHole.length < 2) continue;
      const opHand = bestHand7([...opHole, ...board]);
      const cmp = myHand.rank !== opHand.rank
        ? myHand.rank - opHand.rank
        : compareTB(myHand.tb, opHand.tb);
      if (cmp < 0) { won = false; break; }
      if (cmp === 0) tied = true;
    }
    if (won && !tied) wins++;
    else if (won && tied) ties++;
    else if (!won) losses++;
  }

  return {
    winPct:  (wins / sims * 100),
    tiePct:  (ties / sims * 100),
    lossPct: (losses / sims * 100),
  };
}

// ── State ────────────────────────────────────────────────────
let holeCards  = [null, null];
let boardCards = [null, null, null, null, null];
let opponents  = 1;

// Picker state
let currentPicker  = null;  // {type, index}
let pickerRank     = null;
let pickerSuit     = null;

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => {
        s.classList.remove('active'); s.classList.add('hidden');
      });
      btn.classList.add('active');
      const sec = document.getElementById(`tab-${btn.dataset.tab}`);
      sec.classList.add('active'); sec.classList.remove('hidden');
    });
  });

  buildPickerButtons();
  buildOutsButtons();
  buildPreflopSelects();
  updateOutsCalc();
});

// ── Tab: Outs ────────────────────────────────────────────────
function buildOutsButtons() {
  const shortcuts = [
    {label:'Flush draw',  outs:9},
    {label:'OESD',        outs:8},
    {label:'Inside draw', outs:4},
    {label:'Overcards',   outs:6},
    {label:'Set→FH',      outs:7},
    {label:'2pair→FH',    outs:4},
  ];
  const grid = document.getElementById('outs-grid');
  shortcuts.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'outs-btn';
    btn.textContent = `${s.outs} (${s.label})`;
    btn.onclick = () => {
      document.getElementById('outs-input').value = s.outs;
      document.querySelectorAll('.outs-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateOutsCalc();
    };
    grid.appendChild(btn);
  });
}

function updateOutsCalc() {
  const outs   = parseInt(document.getElementById('outs-input').value) || 0;
  const pot    = parseFloat(document.getElementById('pot-size').value) || 0;
  const call   = parseFloat(document.getElementById('call-size').value) || 0;
  const street = document.getElementById('street').value;

  // Rule of 4 and 2
  const equity = street === 'flop'
    ? Math.min(outs * 4, 100)   // rough rule of 4 (two cards remaining)
    : Math.min(outs * 2, 100);  // rule of 2 (one card)

  const potOdds  = call > 0 ? (call / (pot + call) * 100) : 0;
  const profitable = equity >= potOdds;

  const el = document.getElementById('outs-result');
  el.className = 'result-box' + (profitable ? '' : ' warning');

  el.innerHTML = `
    <div class="stat-row">
      <div class="stat-item">
        <div class="stat-label">Dine Outs</div>
        <div class="stat-value">${outs}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Hit-chance (${street === 'flop' ? '×4':'×2'})</div>
        <div class="stat-value">${equity.toFixed(1)}%</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Pot Odds</div>
        <div class="stat-value">${potOdds.toFixed(1)}%</div>
      </div>
    </div>
    <div class="win-bar-wrap" style="margin-top:.8rem">
      <div class="win-bar" style="width:${equity}%">${equity.toFixed(0)}%</div>
    </div>
    <div class="advice">
      ${profitable
        ? `✅ <strong>Call er profitable!</strong> Du har ${equity.toFixed(1)}% equity og betaler kun ${potOdds.toFixed(1)}% af potten. ${call > 0 ? `Forventet gevinst pr. krone: ${((equity/100*(pot+call) - call)).toFixed(1)} kr` : ''}`
        : `⚠️ <strong>Overvej at folde.</strong> Pot odds (${potOdds.toFixed(1)}%) overstiger din equity (${equity.toFixed(1)}%). En call har negativ forventet værdi på lang sigt.`
      }
    </div>
    <p style="margin-top:.5rem;font-size:.78rem;color:#888">* Baseret på "Rule of 2 and 4". Ikke præcis beregning – brug som vejledning.</p>
  `;
}

// ── Tab: Pre-flop ─────────────────────────────────────────────
const RANK_LABELS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
function buildPreflopSelects() {
  ['pf-card1','pf-card2'].forEach(id => {
    const sel = document.getElementById(id);
    RANK_LABELS.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r === 'T' ? '10' : r;
      sel.appendChild(opt);
    });
  });
}

function updatePreflop() {
  const c1 = document.getElementById('pf-card1').value;
  const c2 = document.getElementById('pf-card2').value;
  const suited = document.getElementById('pf-suited').checked;
  const pos  = document.getElementById('pf-position').value;

  if (!c1 || !c2) {
    document.getElementById('preflop-result').classList.add('hidden');
    return;
  }
  if (c1 === c2 && suited) {
    document.getElementById('preflop-result').className = 'result-box warning';
    document.getElementById('preflop-result').classList.remove('hidden');
    document.getElementById('preflop-result').innerHTML = '⚠️ To kort med samme rank kan ikke være suited.';
    return;
  }

  const r1 = RANK_VAL[c1], r2 = RANK_VAL[c2];
  const hi = Math.max(r1,r2), lo = Math.min(r1,r2);
  const isPair = c1 === c2;
  const gap    = hi - lo;
  const advice = preflopAdvice(hi, lo, isPair, suited, gap, pos);

  const el = document.getElementById('preflop-result');
  el.classList.remove('hidden');
  el.className = 'result-box' + (advice.cls ? ' '+advice.cls : '');
  const c1d = c1 === 'T' ? '10' : c1;
  const c2d = c2 === 'T' ? '10' : c2;
  const handStr = isPair ? `${c1d}${c1d}` : suited ? `${c1d}${c2d}s` : `${c1d}${c2d}o`;

  el.innerHTML = `
    <div class="hand-label">${advice.emoji} ${handStr} – ${advice.strength}</div>
    <div class="win-bar-wrap" style="margin:.6rem 0">
      <div class="win-bar" style="width:${advice.pct}%">${advice.pct}%</div>
    </div>
    <div class="advice">${advice.action}</div>
    <div class="advice" style="margin-top:.4rem">${advice.detail}</div>
  `;
}

function preflopAdvice(hi, lo, isPair, suited, gap, pos) {
  // Tier 1: Premium
  if (isPair && hi >= 13) return { strength:'Premium', emoji:'👑', pct:85, cls:'',
    action:'<strong>Raise/Re-raise altid!</strong> AA eller KK er de bedste start-hænder i poker.',
    detail:'3-bet aggressivt, gå all-in pre-flop mod korte stacks.' };
  if (isPair && hi === 12) return { strength:'Premium', emoji:'👑', pct:80, cls:'',
    action:'<strong>Raise altid. Re-raise stærkt.</strong> QQ er meget stærk, men pas på A eller K på board.',
    detail:'Undgå at gå broke mod en 4-bet medmindre stacks er korte.' };
  if (!isPair && hi === 14 && lo === 13 && suited) return { strength:'Premium', emoji:'👑', pct:82, cls:'',
    action:'<strong>Raise/Re-raise.</strong> AKs er den bedste non-pair hånd.',
    detail:'Har flop-equity, flush-draw og straight-draw potentiale.' };

  // Tier 2: Strong
  if (isPair && hi === 11) return { strength:'Stærk', emoji:'🔥', pct:72, cls:'',
    action:'<strong>Raise. Overvej 3-bet.</strong> JJ er stærk, men sårbar mod A/K/Q på board.',
    detail:'Spil stærkt pre-flop og vær forsigtig mod mange modstandere.' };
  if (isPair && hi === 10) return { strength:'Stærk', emoji:'🔥', pct:67, cls:'',
    action:'<strong>Raise fra de fleste positioner.</strong> TT er godt, men pas på over cards.',
    detail:'Er overpair på mange boards – udnyt det.' };
  if (!isPair && hi === 14 && lo === 13) return { strength:'Stærk', emoji:'🔥', pct:67, cls:'',
    action:'<strong>Raise altid.</strong> AKo er stadig en top-5 hånd.',
    detail:'Taber til AA/KK/QQ men slår resten. Go for it!' };
  if (!isPair && hi === 14 && lo === 12 && suited) return { strength:'Stærk', emoji:'🔥', pct:65, cls:'',
    action:'<strong>Raise.</strong> AQs har gode flop-chancer.',
    detail: 'Fold til store 3-bets medmindre du er dybt.' };

  // Tier 3: Good
  if (isPair && hi >= 7) return { strength:'God', emoji:'✅', pct:56, cls:'',
    action:`<strong>Raise/Call.</strong> Medium pair (${hi === 'T'?'10':hi}${hi === 'T'?'10':hi}). Mål: sæt på floppen.`,
    detail:'Spil set-mining. Gå ikke broke pre-flop mod stor 3-bet.' };
  if (!isPair && hi === 14 && suited) return { strength:'God', emoji:'✅', pct:58, cls:'',
    action:'<strong>Raise fra late position.</strong> Suited Ace har flush-equity og top pair mulighed.',
    detail:'Undgå at spille store pots med svag kicker.' };
  if (!isPair && suited && gap <= 2 && lo >= 8) return { strength:'God', emoji:'✅', pct:55, cls:'',
    action:'<strong>Raise/Call fra mid-late position.</strong> Suited connector med potentiale.',
    detail:'Har straight og flush draw. Spil billigt og se flop.' };

  // Tier 4: Playable
  if (!isPair && suited && gap <= 4 && lo >= 5) return { strength:'Playabel', emoji:'⚠️', pct:42, cls:'warning',
    action:'<strong>Call fra sen position. Fold fra early.</strong> Speculative suited hand.',
    detail:'Har potentiale, men kræver billig entry og god flop.' };
  if (!isPair && hi >= 10 && lo >= 10) return { strength:'Playabel', emoji:'⚠️', pct:48, cls:'warning',
    action:'<strong>Raise/Call fra mid-late.</strong> Broadway hand med straight-potentiale.',
    detail:'God til straight draws men ingen flush-fordel.' };

  // Tier 5: Weak
  if (isPair && hi <= 6) return { strength:'Svag', emoji:'❌', pct:32, cls:'danger',
    action:'<strong>Fold fra early. Call billigt fra late position.</strong> Small pair. Mål: sæt.',
    detail:'Sæt-mining: call kun hvis odds er gode (>10x pot).' };

  // Default
  return { strength:'Svag – Fold anbefalet', emoji:'❌', pct:25, cls:'danger',
    action:'<strong>Fold i de fleste situationer.</strong> Denne hånd er for svag til at spille profitabelt.',
    detail:'Undgå at spille ragge kort. Vent på en bedre hånd – tålmodighed er key!' };
}

// ── Card Picker ───────────────────────────────────────────────
function buildPickerButtons() {
  const rankWrap = document.getElementById('rank-buttons');
  const suitWrap = document.getElementById('suit-buttons');

  RANKS.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'rank-btn';
    btn.dataset.rank = r;
    btn.textContent = r === 'T' ? '10' : r;
    btn.onclick = () => {
      pickerRank = r;
      document.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePickerPreview();
    };
    rankWrap.appendChild(btn);
  });

  SUITS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'suit-btn';
    btn.dataset.suit = s;
    btn.textContent = SUIT_SYMBOLS[s];
    btn.title = SUIT_LABEL[s];
    btn.onclick = () => {
      pickerSuit = s;
      document.querySelectorAll('.suit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePickerPreview();
    };
    suitWrap.appendChild(btn);
  });
}

function getAllUsedCards() {
  return [...holeCards, ...boardCards].filter(Boolean).map(c => c.rank+c.suit);
}

function updatePickerPreview() {
  const pre = document.getElementById('picker-preview');
  if (pickerRank && pickerSuit) {
    const used = getAllUsedCards();
    const key  = pickerRank + pickerSuit;
    const display = cardDisplay(pickerRank, pickerSuit);
    if (used.includes(key) && !(currentPicker && getCard(currentPicker) && getCard(currentPicker).rank+getCard(currentPicker).suit === key)) {
      pre.innerHTML = `<span style="color:red">❌ Allerede brugt</span>`;
    } else {
      pre.innerHTML = `<span class="${isRed(pickerSuit)?'suit-red':'suit-black'}">${display}</span>`;
    }
  } else {
    pre.innerHTML = '';
  }
}

function getCard(picker) {
  return picker.type === 'hole' ? holeCards[picker.index] : boardCards[picker.index];
}

function openPicker(slotEl) {
  // Determine type and index from parent
  const parentId = slotEl.closest('.card-picker').id;
  const type  = parentId === 'hole-cards' ? 'hole' : 'board';
  const index = parseInt(slotEl.dataset.index);
  currentPicker = { type, index };

  pickerRank = null; pickerSuit = null;
  // Pre-select existing card
  const existing = getCard(currentPicker);
  if (existing) {
    pickerRank = existing.rank; pickerSuit = existing.suit;
  }

  // Reset buttons
  document.querySelectorAll('.rank-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.rank === pickerRank);
  });
  document.querySelectorAll('.suit-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.suit === pickerSuit);
  });
  updatePickerPreview();
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closePicker() {
  document.getElementById('modal-overlay').classList.add('hidden');
  currentPicker = null;
  pickerRank = null; pickerSuit = null;
}

function closePickerIfOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closePicker();
}

function confirmCard() {
  if (!pickerRank || !pickerSuit || !currentPicker) return;
  const key = pickerRank + pickerSuit;
  const used = getAllUsedCards();
  const existingCard = getCard(currentPicker);
  const existingKey  = existingCard ? existingCard.rank+existingCard.suit : null;
  // Allow replacing same slot with same card (no-op)
  if (used.includes(key) && key !== existingKey) {
    alert('Dette kort er allerede valgt!');
    return;
  }

  if (currentPicker.type === 'hole') holeCards[currentPicker.index] = { rank: pickerRank, suit: pickerSuit };
  else boardCards[currentPicker.index] = { rank: pickerRank, suit: pickerSuit };

  renderSlots();
  closePicker();
}

function removeCard() {
  if (!currentPicker) return;
  if (currentPicker.type === 'hole') holeCards[currentPicker.index] = null;
  else boardCards[currentPicker.index] = null;
  renderSlots();
  closePicker();
}

function renderSlots() {
  renderSlotGroup('hole-cards', holeCards);
  renderSlotGroup('board-cards', boardCards);
}

function renderSlotGroup(containerId, cards) {
  const container = document.getElementById(containerId);
  const slots = container.querySelectorAll('.card-slot');
  slots.forEach((slot, i) => {
    const card = cards[i];
    if (card) {
      const r = card.rank === 'T' ? '10' : card.rank;
      const colorClass = isRed(card.suit) ? 'suit-red' : 'suit-black';
      slot.className = 'card-slot has-card';
      slot.innerHTML = `
        <span class="card-rank ${colorClass}">${r}</span>
        <span class="card-suit ${colorClass}">${SUIT_SYMBOLS[card.suit]}</span>
        <span class="card-rank-small ${colorClass}">${r}</span>
      `;
    } else {
      slot.className = 'card-slot';
      slot.innerHTML = '<span class="add-icon">+</span>';
    }
  });
}

function changeOpponents(delta) {
  opponents = Math.max(1, Math.min(8, opponents + delta));
  document.getElementById('opponent-count').textContent = opponents;
}

function clearAll() {
  holeCards  = [null, null];
  boardCards = [null, null, null, null, null];
  renderSlots();
  document.getElementById('result').classList.add('hidden');
}

// ── Calculate Odds ────────────────────────────────────────────
function calculateOdds() {
  const myHole  = holeCards.filter(Boolean);
  const myBoard = boardCards.filter(Boolean);

  if (myHole.length < 2) {
    showResult('warning', '⚠️ Vælg venligst dine 2 hånds-kort for at beregne odds.');
    return;
  }

  const allCards = [...myHole, ...myBoard];
  const btn = document.querySelector('.calc-btn');
  btn.textContent = '⏳ Beregner...';
  btn.disabled = true;

  // Async so UI updates
  setTimeout(() => {
    const sims  = myBoard.length >= 4 ? 20000 : 10000;
    const { winPct, tiePct, lossPct } = monteCarlo(myHole, myBoard, opponents, sims);

    let currentHandName = '';
    if (myBoard.length >= 3) {
      const best = bestHand7([...myHole, ...myBoard]);
      currentHandName = best ? best.name : '';
    }

    let adviceText = '';
    if (winPct >= 75)      adviceText = '🔥 Du er stor favorit! Bet/Raise aggressivt.';
    else if (winPct >= 55) adviceText = '✅ Du er favorit. Spil selvsikkert, men pas på board texture.';
    else if (winPct >= 45) adviceText = '⚖️ Nogenlunde jævnt. Overvej pot odds og modstanderens range.';
    else if (winPct >= 30) adviceText = '⚠️ Du er underdog. Call kun hvis pot odds berettiger det.';
    else                   adviceText = '❌ Du er stor underdog. Overvej at folde medmindre du er på en draw.';

    const cls = winPct >= 55 ? '' : winPct >= 40 ? 'warning' : 'danger';
    const html = `
      <div class="hand-label">
        ${currentHandName ? `🃏 Nuværende hånd: <em>${currentHandName}</em>` : ''}
      </div>
      <div class="stat-row">
        <div class="stat-item">
          <div class="stat-label">Vinde</div>
          <div class="stat-value" style="color:${winPct>50?'#1a6b35':'#c0392b'}">${winPct.toFixed(1)}%</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Uafgjort</div>
          <div class="stat-value" style="color:#888">${tiePct.toFixed(1)}%</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Tabe</div>
          <div class="stat-value" style="color:#c0392b">${lossPct.toFixed(1)}%</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Modstandere</div>
          <div class="stat-value">${opponents}</div>
        </div>
      </div>
      <div class="win-bar-wrap">
        <div class="win-bar" style="width:${winPct}%">${winPct.toFixed(0)}%</div>
      </div>
      <div class="advice">${adviceText}</div>
      <p style="margin-top:.5rem;font-size:.75rem;color:#888">
        Baseret på ${sims.toLocaleString()} Monte Carlo simuleringer
        · ${5 - myBoard.length} kort tilbage
      </p>
    `;
    showResult(cls, html);
    btn.textContent = '📊 Beregn Odds';
    btn.disabled = false;
  }, 10);
}

function showResult(cls, html) {
  const el = document.getElementById('result');
  el.className = 'result-box' + (cls ? ' '+cls : '');
  el.innerHTML = html;
}
