/* ============================================================
   BOT ADVISOR  –  Web version
   ============================================================ */

// Bot state
let botHoleCards  = [null, null];
let botBoardCards = [null, null, null, null, null];
let botCurrentPicker = null;

const POS_MULT = { UTG:1.0,'UTG+1':1.0, MP:1.3,'MP+1':1.3, CO:1.6, BTN:2.0, SB:0.9, BB:1.0 };

// ── Opponent Classifier ──────────────────────────────────────
function botClassifyOpp() {
  const vpip = parseFloat(document.getElementById('bot-vpip').value);
  const pfr  = parseFloat(document.getElementById('bot-pfr').value);
  const el   = document.getElementById('bot-opp-result');
  if (isNaN(vpip) || isNaN(pfr)) { el.classList.add('hidden'); return; }

  const opp = classifyOpp(vpip, pfr);
  el.classList.remove('hidden');
  el.className = `opp-box opp-${opp.cssClass}`;
  el.innerHTML = `
    <strong>${opp.emoji} ${opp.type}</strong> &nbsp;·&nbsp; VPIP: ${vpip}% / PFR: ${pfr}%
    <div style="margin-top:.4rem;font-size:.85rem">${opp.strategy}</div>
  `;
}

function classifyOpp(vpip, pfr) {
  const gap = vpip - pfr;
  if (vpip < 15)
    return { emoji:'🐢', type:'Nit', cssClass:'nit',
             strategy:'Value bet thinly. Steal blinds aggressivt. Fold mod 3-bet.' };
  if (vpip <= 25 && pfr >= 12 && gap <= 8)
    return { emoji:'🎯', type:'TAG (Tight-Aggressive)', cssClass:'tag',
             strategy:'Spil solid. 3-bet/fold spots. Undgå store pots uden stærke hænder.' };
  if (vpip <= 40 && pfr >= 20)
    return { emoji:'⚡', type:'LAG (Loose-Aggressive)', cssClass:'lag',
             strategy:'Kald bredt med gode hænder. Lad dem bluf-catch. Trap aggressivt.' };
  if (vpip > 35 && pfr < 12)
    return { emoji:'🐟', type:'Calling Station', cssClass:'fish',
             strategy:'VALUE BET ALTID! Bluff ALDRIG mod dem. De folder ikke!' };
  if (vpip > 50 && pfr > 35)
    return { emoji:'🌀', type:'Maniac', cssClass:'maniac',
             strategy:'Trap med stærke hænder. Kald bredt. Lad dem ødelægge sig selv.' };
  return { emoji:'❓', type:'Ukendt/Mixed', cssClass:'unknown',
           strategy:'Spil standard GTO. Samle mere information.' };
}

// ── Card Picker (Bot) ────────────────────────────────────────
function openBotPicker(slotEl, type) {
  const index = parseInt(slotEl.dataset.index);
  botCurrentPicker = { type, index };
  pickerRank = null; pickerSuit = null;

  const existing = type === 'hole' ? botHoleCards[index] : botBoardCards[index];
  if (existing) { pickerRank = existing.rank; pickerSuit = existing.suit; }

  document.querySelectorAll('.rank-btn').forEach(b => b.classList.toggle('active', b.dataset.rank === pickerRank));
  document.querySelectorAll('.suit-btn').forEach(b => b.classList.toggle('active', b.dataset.suit === pickerSuit));
  updateBotPickerPreview();

  // Override modal confirm/remove for bot
  document.querySelector('.confirm-btn').onclick = confirmBotCard;
  document.querySelector('.remove-btn').onclick  = removeBotCard;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function updateBotPickerPreview() {
  const pre = document.getElementById('picker-preview');
  if (pickerRank && pickerSuit) {
    const used = getBotUsedCards();
    const key  = pickerRank + pickerSuit;
    const existing = botCurrentPicker?.type === 'hole'
      ? botHoleCards[botCurrentPicker.index]
      : botBoardCards[botCurrentPicker.index];
    const existKey = existing ? existing.rank+existing.suit : null;
    if (used.includes(key) && key !== existKey) {
      pre.innerHTML = `<span style="color:red">❌ Allerede brugt</span>`;
    } else {
      const isR = pickerSuit === 'h' || pickerSuit === 'd';
      const r   = pickerRank === 'T' ? '10' : pickerRank;
      pre.innerHTML = `<span class="${isR?'suit-red':'suit-black'}">${r}${SUIT_SYMBOLS[pickerSuit]}</span>`;
    }
  } else {
    pre.innerHTML = '';
  }
}

function getBotUsedCards() {
  return [...botHoleCards, ...botBoardCards].filter(Boolean).map(c => c.rank+c.suit);
}

function confirmBotCard() {
  if (!pickerRank || !pickerSuit || !botCurrentPicker) return;
  const key = pickerRank + pickerSuit;
  const used = getBotUsedCards();
  const existing = botCurrentPicker.type === 'hole'
    ? botHoleCards[botCurrentPicker.index]
    : botBoardCards[botCurrentPicker.index];
  const existKey = existing ? existing.rank+existing.suit : null;
  if (used.includes(key) && key !== existKey) { alert('Allerede valgt!'); return; }

  const card = { rank: pickerRank, suit: pickerSuit };
  if (botCurrentPicker.type === 'hole') botHoleCards[botCurrentPicker.index] = card;
  else botBoardCards[botCurrentPicker.index] = card;

  renderBotSlots();
  closePicker();
  // Restore original confirm/remove
  document.querySelector('.confirm-btn').onclick = confirmCard;
  document.querySelector('.remove-btn').onclick  = removeCard;
}

function removeBotCard() {
  if (!botCurrentPicker) return;
  if (botCurrentPicker.type === 'hole') botHoleCards[botCurrentPicker.index] = null;
  else botBoardCards[botCurrentPicker.index] = null;
  renderBotSlots();
  closePicker();
  document.querySelector('.confirm-btn').onclick = confirmCard;
  document.querySelector('.remove-btn').onclick  = removeCard;
}

function renderBotSlots() {
  renderBotSlotGroup('bot-hole-cards', botHoleCards);
  renderBotSlotGroup('bot-board-cards', botBoardCards);
}

function renderBotSlotGroup(containerId, cards) {
  const container = document.getElementById(containerId);
  if (!container) return;
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

function clearBotCards() {
  botHoleCards  = [null, null];
  botBoardCards = [null, null, null, null, null];
  renderBotSlots();
  document.getElementById('bot-result').classList.add('hidden');
}

// ── Bot Decision Engine (JS port) ────────────────────────────
function preflopStrength(hole) {
  const rv = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
  const r1 = rv[hole[0].rank], r2 = rv[hole[1].rank];
  const suited = hole[0].suit === hole[1].suit;
  const hi = Math.max(r1,r2), lo = Math.min(r1,r2);
  const pair = r1 === r2;
  const gap  = hi - lo;

  if (pair) {
    if (hi >= 13) return [95,'👑 Premium pair (AA/KK)'];
    if (hi === 12) return [85,'👑 Premium pair (QQ)'];
    if (hi === 11) return [75,'🔥 Stærk pair (JJ)'];
    if (hi === 10) return [68,'🔥 Stærk pair (TT)'];
    if (hi >= 7)  return [55,'✅ Medium pair'];
    return [40,'⚠️ Small pair (set-mining)'];
  }
  if (hi===14 && lo===13) return [suited?82:68, suited?'👑 AKs – Top 3 hånd':'🔥 AKo – Stærk hånd'];
  if (hi===14 && lo===12) return [suited?72:60, suited?'🔥 AQs':'🔥 AQo'];
  if (hi===14 && lo===11 && suited) return [66,'🔥 AJs – Stærk suited ace'];
  if (hi===14 && suited) return [52,'✅ Suited Ace'];
  if (suited && gap<=2 && lo>=8) return [55,'✅ Suited connector'];
  if (suited && gap<=4 && lo>=5) return [42,'⚠️ Speculative suited'];
  if (hi>=10 && lo>=10) return [48,'⚠️ Broadway offsuit'];
  return [25,'❌ Svag hånd'];
}

function botDecision(winPct, potOddsPct, posMult, street, preStr, oppType) {
  const evEdge = winPct - potOddsPct;
  let action='', size='', reasoning=[], confidence='';
  const callAmt = parseFloat(document.getElementById('bot-call').value)||0;
  const potAmt  = parseFloat(document.getElementById('bot-pot').value)||100;

  if (street === 'preflop') {
    if (preStr >= 80) { action='RAISE'; size='3–4x BB'; reasoning.push('Premium hånd – raise/re-raise aggressivt'); confidence='Meget høj'; }
    else if (preStr >= 60) { action='RAISE'; size='2.5–3x BB'; reasoning.push('Stærk hånd'); if(posMult>=1.6) reasoning.push('Sen position giver ekstra edge'); confidence='Høj'; }
    else if (preStr >= 45) {
      if (posMult >= 1.6) { action='RAISE/CALL'; size='2x BB'; reasoning.push('Playabel hånd + sen position = profitable'); }
      else { action='FOLD'; reasoning.push('For svag til early/mid position. Vent på bedre hånd!'); }
      confidence='Medium';
    } else { action='FOLD'; reasoning.push('Hånd for svag til profitable spil pre-flop'); confidence='Høj'; }
    return { action, size, reasoning, confidence, ev: null };
  }

  const ev = callAmt > 0 ? (winPct/100*(potAmt+callAmt) - callAmt) : null;

  if (winPct >= 75) { action='RAISE/BET'; size='60–100% pot'; reasoning.push(`Stor favorit (${winPct.toFixed(0)}%). Byg potten!`); confidence='Meget høj'; }
  else if (winPct >= 60) { action='BET'; size='50–70% pot'; reasoning.push(`Favorit (${winPct.toFixed(0)}%). Value bet.`); confidence='Høj'; }
  else if (winPct >= 45 && evEdge >= 0) { action='CHECK/CALL'; reasoning.push(`EV-positiv (${evEdge.toFixed(1)}%). Kald eller check-call.`); confidence='Medium'; }
  else if (evEdge >= 5) { action='CALL'; reasoning.push(`Pot odds giver edge (${evEdge.toFixed(1)}%). Profitabelt kald.`); confidence='Medium'; }
  else if (winPct >= 28 && street !== 'river') { action='SEMI-BLUFF'; size='40–60% pot'; reasoning.push('Draw med equity – bet for 2 veje til at vinde'); confidence='Medium'; }
  else { action='FOLD'; reasoning.push(`Win% (${winPct.toFixed(0)}%) er for lav ift. pot odds (${potOddsPct.toFixed(0)}%).`); confidence='Høj'; }

  if (posMult >= 1.6 && action === 'CHECK/CALL') reasoning.push('Sen position-fordel: overvej at bet i stedet for check-call');
  if (oppType && oppType.startsWith('🐟') && action.includes('BLUFF')) { action='CHECK'; reasoning.push('⚠️ Calling Station – bluff ALDRIG mod dem!'); }

  return { action, size, reasoning, confidence, ev };
}

// ── Main Bot Runner ───────────────────────────────────────────
function runBotAdvisor() {
  const myHole  = botHoleCards.filter(Boolean);
  const myBoard = botBoardCards.filter(Boolean);

  if (myHole.length < 2) {
    showBotResult('warning', '⚠️ Vælg dine 2 hånds-kort!');
    return;
  }

  const pos    = document.getElementById('bot-position').value;
  const nOpp   = parseInt(document.getElementById('bot-opponents').value)||1;
  const pot    = parseFloat(document.getElementById('bot-pot').value)||100;
  const call   = parseFloat(document.getElementById('bot-call').value)||0;
  const vpipEl = document.getElementById('bot-vpip').value;
  const pfrEl  = document.getElementById('bot-pfr').value;

  const posMult = POS_MULT[pos] || 1.5;
  const nBoard  = myBoard.length;
  const street  = nBoard===0?'preflop':nBoard===3?'flop':nBoard===4?'turn':'river';

  let opp = null;
  if (vpipEl && pfrEl) {
    try { opp = classifyOpp(parseFloat(vpipEl), parseFloat(pfrEl)); } catch(e){}
  }

  const [preStr, preName] = preflopStrength(myHole);
  const potOddsPct = call > 0 ? (call/(pot+call)*100) : 0;

  const btn = document.querySelector('#tab-bot .calc-btn');
  btn.textContent = '⏳ Analyserer...'; btn.disabled = true;

  setTimeout(() => {
    const sims = nBoard >= 4 ? 15000 : 8000;
    const { winPct, tiePct, lossPct } = monteCarlo(
      myHole.map(c => ({rank:c.rank, suit:c.suit})),
      myBoard.map(c => ({rank:c.rank, suit:c.suit})),
      nOpp, sims
    );

    let currentHandName = '';
    if (myBoard.length >= 3) {
      const all = [...myHole, ...myBoard].map(c => ({rank:c.rank, suit:c.suit}));
      const h = bestHand7(all);
      if (h) currentHandName = h.name;
    }

    const dec = botDecision(winPct, potOddsPct, posMult, street, preStr, opp?.emoji+' '+opp?.type);

    const actionColor = dec.action.includes('FOLD') ? '#c0392b'
                      : dec.action.includes('RAISE')||dec.action.includes('BET') ? '#1a6b35'
                      : '#d4800a';
    const boxCls = dec.action.includes('FOLD') ? 'danger'
                 : dec.action.includes('CALL')||dec.action.includes('CHECK') ? 'warning' : '';

    const evHTML = dec.ev !== null
      ? `<div class="stat-item"><div class="stat-label">Forventet EV</div>
         <div class="stat-value" style="color:${dec.ev>=0?'#1a6b35':'#c0392b'}">${dec.ev>=0?'+':''}${dec.ev.toFixed(0)} kr</div></div>`
      : '';

    const oppHTML = opp
      ? `<div class="advice" style="margin-top:.5rem">
           👤 Modstander: <strong>${opp.emoji} ${opp.type}</strong><br>
           💡 ${opp.strategy}
         </div>`
      : '';

    const html = `
      <div style="font-size:.9rem;color:#555;margin-bottom:.5rem">
        🃏 ${myHole.map(c=>`${c.rank==='T'?'10':c.rank}${SUIT_SYMBOLS[c.suit]}`).join(' ')}
        ${myBoard.length ? '&nbsp;&nbsp;|&nbsp;&nbsp; Board: ' + myBoard.map(c=>`${c.rank==='T'?'10':c.rank}${SUIT_SYMBOLS[c.suit]}`).join(' ') : ''}
        &nbsp;&nbsp;|&nbsp;&nbsp; ${pos} · ${nOpp} mod.
        ${currentHandName ? `&nbsp;&nbsp;|&nbsp;&nbsp; <em>${currentHandName}</em>` : ''}
      </div>

      <div class="stat-row">
        <div class="stat-item">
          <div class="stat-label">Vinde</div>
          <div class="stat-value" style="color:${winPct>50?'#1a6b35':'#c0392b'}">${winPct.toFixed(1)}%</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Pot odds</div>
          <div class="stat-value">${potOddsPct.toFixed(1)}%</div>
        </div>
        ${evHTML}
        <div class="stat-item">
          <div class="stat-label">Pre-flop</div>
          <div class="stat-value" style="font-size:.9rem">${preName}</div>
        </div>
      </div>

      <div class="win-bar-wrap">
        <div class="win-bar" style="width:${winPct}%">${winPct.toFixed(0)}%</div>
      </div>

      <div style="margin-top:1rem;padding:1rem;border-radius:10px;background:rgba(255,255,255,.7);text-align:center">
        <div style="font-size:.8rem;color:#666;text-transform:uppercase;letter-spacing:1px">Anbefaling</div>
        <div style="font-size:2rem;font-weight:900;color:${actionColor}">${dec.action}</div>
        ${dec.size ? `<div style="color:#555;font-size:.9rem">Størrelse: <strong>${dec.size}</strong></div>` : ''}
        <div style="font-size:.8rem;color:#777;margin-top:.3rem">Sikkerhed: ${dec.confidence}</div>
      </div>

      <div class="advice" style="margin-top:.7rem">
        ${dec.reasoning.map(r => `• ${r}`).join('<br>')}
      </div>

      ${oppHTML}

      <p style="margin-top:.7rem;font-size:.75rem;color:#aaa">
        ${sims.toLocaleString()} Monte Carlo simuleringer · ${5-myBoard.length} kort tilbage på board
      </p>
    `;

    showBotResult(boxCls, html);
    btn.textContent = '🤖 Få Anbefaling'; btn.disabled = false;
  }, 10);
}

function showBotResult(cls, html) {
  const el = document.getElementById('bot-result');
  el.className = 'result-box' + (cls ? ' '+cls : '');
  el.innerHTML = html;
}

// Fix: re-wire picker preview for bot tab
document.addEventListener('DOMContentLoaded', () => {
  // Patch rank/suit buttons to also call bot preview if in bot context
  document.querySelectorAll('.rank-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (botCurrentPicker) { pickerRank = btn.dataset.rank; updateBotPickerPreview(); }
    });
  });
  document.querySelectorAll('.suit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (botCurrentPicker) { pickerSuit = btn.dataset.suit; updateBotPickerPreview(); }
    });
  });
});
