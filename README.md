# ♠ Poker Advisor – Texas Hold'em

En komplet Texas Hold'em poker calculator og AI-advisor bygget i ren HTML, CSS og JavaScript (+ Python CLI bot).

## 🚀 Kom i gang

Åbn `index.html` direkte i en browser – ingen installation nødvendig!

For Python CLI-botten:
```bash
python3 bot.py
```

## ✨ Features

### 🌐 Web App (`index.html`)
| Fane | Indhold |
|---|---|
| 🎯 **Odds Calculator** | Monte Carlo simulering (10.000+ sims) – beregn din vindeprocent |
| 📋 **Hånds Styrke** | Komplet oversigt over alle 10 pokerhænder med sandsynligheder |
| 🔢 **Outs & Pot Odds** | Rule of 2 & 4 – er det profitable at calle? |
| 🃏 **Pre-Flop Guide** | Hånd-styrke og anbefaling baseret på kort + position |
| 🤖 **Bot Advisor** | Live GTO-baseret beslutningshjælp med modstander-klassificering |

### 🐍 Python CLI Bot (`bot.py`)
- Interaktiv session med hånd-for-hånd analyse
- Monte Carlo simulering (6.000 sims)
- GTO beslutningsmotor: FOLD / CALL / BET / RAISE / SEMI-BLUFF
- Modstander-klassificering via VPIP/PFR
- Session tracker med **tilt-advarsel**
- Expected Value (EV) beregning

## 🃏 Spillertyper

| Type | VPIP | PFR | Strategi mod dem |
|---|---|---|---|
| 🐢 Nit | <15% | <12% | Steal blinds, value bet thin |
| 🎯 TAG | 15–25% | 12–20% | Spil solid GTO |
| ⚡ LAG | 25–40% | 20–35% | Trap, kald bredt |
| 🐟 Calling Station | >35% | <12% | Value bet ALTID, aldrig bluff |
| 🌀 Maniac | >50% | >35% | Trap med stærke hænder |

## 📁 Filer

```
├── index.html   ← Web app (5 faner)
├── style.css    ← Poker felt-tema
├── poker.js     ← Odds engine + Monte Carlo
├── bot-web.js   ← Bot Advisor (web)
├── bot.py       ← Python CLI bot
└── ANALYSE.md   ← Strategi-analyse: hvorfor folk vinder/taber
```

## HJERNE-MASTER
[[HJERNE-MASTER|HJERNE-MASTER]] · [[_Admin/CROSS-DOMAIN-BRIDGES|Cross-Domain Bridges]]
