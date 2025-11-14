// /js/game-core.js
import { Data, monsterImg } from './data.js';

export const G = window.G || (window.G = {
  ready:false, lvl:1, xp:0, xpTo:10, gold:0,
  stats:{totalKills:0}, mats:{}, items:{}, gear:{}, bonus:{}, school:'wolf',
  prestige:{count:0}, bestiary:{}, autoBattle:false
});
export const DATA = window.DATA || (window.DATA = { monsters:[], balance:{}, signs:[
  {id:'quen', name:'Quen', cost:30}, {id:'igni', name:'Igni', cost:25}, {id:'yrden', name:'Yrden', cost:20}
]});
export const VIEWS = window.VIEWS || (window.VIEWS = [
  { id:'board', name:'Board', ico:'🏠' },
  { id:'hunts', name:'Hunts', ico:'🎯' },
  { id:'combat', name:'Combat', ico:'⚔️' },
  { id:'ascend', name:'Ascend', ico:'✨' }
]);
export const SECONDARY_VIEWS = window.SECONDARY_VIEWS || (window.SECONDARY_VIEWS = [
  { id:'runes', name:'Runes', ico:'💎' },
  { id:'alchemy', name:'Alchemy', ico:'🧪' },
  { id:'mastery', name:'Mastery', ico:'🗡️' },
  { id:'presets', name:'Presets', ico:'🗂️' },
  { id:'codex', name:'Codex+', ico:'📚' }
]);

window.SCHOOL = window.SCHOOL || {
  wolf:{name:'Wolf', passive:{}},
  cat:{name:'Cat', passive:{}},
  griffin:{name:'Griffin', passive:{}},
  bear:{name:'Ursine', passive:{}},
  viper:{name:'Viper', passive:{}}
};

window.addEventListener('hexer:dataReady', () => {
  DATA.monsters = Data.monsters;
  DATA.balance = Data.balance;
  G.ready = true;
  initGame();
});

function initGame(){ applySetBonuses(); render(); }

export function $(sel){ return document.querySelector(sel); }
export function saveGame(){ try{ localStorage.setItem('hexer_save', JSON.stringify(G)); }catch{} }
export function loadGame(){ try{ Object.assign(G, JSON.parse(localStorage.getItem('hexer_save')||'{}')); }catch{} }
export function toast(msg, kind=''){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), 2600); }

export function switchView(id){ G.view=id; render(); }
export function render(){
  if(!G.ready) return;
  const nav = $('#nav'); nav.innerHTML = VIEWS.map(v=>`<button class="btn" data-v="${v.id}">${v.ico} ${v.name}</button>`).join('');
  nav.querySelectorAll('button[data-v]').forEach(b=>b.onclick=()=>switchView(b.dataset.v));
  const tabs = $('#tabs'); tabs.innerHTML = SECONDARY_VIEWS.map(v=>`<button class="btn" data-sv="${v.id}">${v.ico} ${v.name}</button>`).join('');
  tabs.querySelectorAll('button[data-sv]').forEach(b=>b.onclick=()=>switchView(b.dataset.sv));
  const v = $('#view'); v.innerHTML='';
  (G.view||'board')==='board' && viewBoard();
  G.view==='hunts' && viewHunts();
  G.view==='combat' && viewCombat();
  G.view==='ascend' && viewAscend();
  ['runes','alchemy','mastery','presets','codex'].includes(G.view) && v.appendChild(document.createElement('div'));
}

export function viewBoard(){
  const v=$('#view');
  v.innerHTML = `
    <div class="card"><div style="font-weight:800">Hexer</div>
      <div class="muted">Gold ${G.gold} • Level ${G.lvl} (${G.xp}/${G.xpTo}) • Prestige ${G.prestige.count}</div>
      <div class="row" style="margin-top:6px"><button class="btn" onclick="switchView('hunts')">Go Hunt</button>
      <button class="btn" onclick="switchView('combat')">Enter Combat</button></div>
    </div>`;
}

export function viewHunts(){
  const v=$('#view');
  const cards = DATA.monsters.map(m=>`<div class="card">
    <div class="row" style="justify-content:space-between; align-items:stretch">
      <div class="row" style="gap:12px">
        <img class="mon-img" src="${monsterImg(m)}" alt="${m.name}" loading="lazy" onerror="this.style.visibility='hidden'">
        <div>
          <div style="font-weight:700">${m.name}</div>
          <div class="muted">HP ${m.hp} • DPS ${m.dps}</div>
        </div>
      </div>
      <button class="btn" data-id="${m.id}">Fight</button>
    </div></div>`).join('');
  v.innerHTML = `<div class="card"><div style="font-weight:800">Contracts</div></div>${cards}`;
  v.querySelectorAll('button[data-id]').forEach(b=>b.onclick=()=>{
    const enemy = DATA.monsters.find(x=>x.id===b.dataset.id); enterCombat(enemy);
  });
}

export function viewCombat(){
  const v=$('#view');
  const m = G?.combat?.enemy;
  const img = m ? `<img class="mon-portrait" src="${monsterImg(m)}" alt="${m.name}" onerror="this.style.visibility='hidden'">` : '';
  v.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between">
        <div><div style="font-weight:800">Combat</div><div class="muted">Tap Attack to swing.</div></div>
        <div class="row"><button class="btn" id="atkBtn">Attack</button><button class="btn" id="signBtn">Cast Quen</button></div>
      </div>
      <div class="divider"></div>
      <div class="row" style="gap:12px; align-items:center">
        ${img}
        <div id="combatHud">
          <div>Witcher HP <span id="php"></span></div>
          <div>Enemy HP <span id="ehp"></span></div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="row"><div id="playerFloat"></div><div id="enemyFloat"></div></div>
    </div>`;
  updateHUD();
  $('#atkBtn').onclick=()=>playerAttack();
  $('#signBtn').onclick=()=>castSign('quen');
}

export function viewAscend(){
  const v=$('#view');
  v.innerHTML = `<div class="card"><div style="font-weight:800">Ascension</div><div class="muted">Handled by expansion module.</div></div>`;
}

// Basic sizing for images (kept inline to avoid extra CSS file)
(function ensureStyles(){
  if (document.getElementById('monster-img-style')) return;
  const s = document.createElement('style'); s.id='monster-img-style';
  s.textContent = `
  .mon-img{width:72px;height:72px;border-radius:10px;object-fit:cover;border:1px solid #272b38;background:#10131a}
  .mon-portrait{width:96px;height:96px;border-radius:12px;object-fit:cover;border:1px solid #272b38;background:#10131a}
  `;
  document.head.appendChild(s);
})();

export function hpMax(){ return 100 + G.lvl*10; }
export function getEquippedWeapon(type){ return { type, id:type+'_sword' }; }

export function enterCombat(enemy){
  G.combat = { enemy: { ...enemy, hp: enemy.hp, hpMax: enemy.hp }, playerHp: hpMax() };
  switchView('combat');
  updateHUD();
}
export function updateHUD(){
  if(!G.combat) return;
  $('#php') && ($('#php').textContent = `${G.combat.playerHp}/${hpMax()}`);
  $('#ehp') && ($('#ehp').textContent = `${G.combat.enemy.hp}/${G.combat.enemy.hpMax}`);
}

export function calcPlayerDmg(enemy){ return { dmg: 10 + Math.floor(G.lvl*1.5), critChance:.1, weapon:getEquippedWeapon('steel') }; }
export function floatAt(sel, text){ const el=$(sel); if(!el) return; const d=document.createElement('div'); d.textContent=text; el.appendChild(d); setTimeout(()=>d.remove(), 800); }

export function playerAttack(){
  const m=G?.combat?.enemy; if(!m) return;
  const out = calcPlayerDmg(m);
  let dmg = out.dmg;
  if (Math.random()<out.critChance){ dmg = Math.round(dmg*1.5); }
  m.hp = Math.max(0, m.hp - dmg);
  floatAt('#enemyFloat', `-${dmg}`, 'dmg');
  if (m.hp<=0){ handleEnemyDeath(true); } else enemyAttack();
  updateHUD();
}

export function enemyAttack(){
  const m=G?.combat?.enemy; if(!m) return;
  const dmg = m.dps||5;
  G.combat.playerHp = Math.max(0, G.combat.playerHp - dmg);
  floatAt('#playerFloat', `-${dmg}`, 'dmg');
  if (G.combat.playerHp<=0) handleEnemyDeath(false);
  updateHUD();
}

export function handleEnemyDeath(playerWon){
  const m = G?.combat?.enemy;
  if (playerWon){
    G.gold += 5; G.stats.totalKills++; G.xp = Math.min(G.xpTo, G.xp+1);
    G.bestiary[m.id] = G.bestiary[m.id] || { kills:0 }; G.bestiary[m.id].kills++;
  }
  toast(playerWon?'Victory!':'Defeat.');
  saveGame(); switchView('board');
}

export function castSign(id){
  if(id==='quen'){ toast('Quen!'); }
}

loadGame();
