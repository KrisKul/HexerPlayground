// /js/data.js
export async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed ${path}`);
  return res.json();
}

export const Data = { monsters: [], balance: {} };

// Returns the URL to the monster image.
// Convention: /assets/monsters/<monster.image || monster.id>.png
export function monsterImg(monster) {
  const name = (monster && (monster.image || monster.id)) || 'unknown';
  return `assets/monsters/${name}.png`;
}

(async () => {
  const [monsters, balance] = await Promise.all([
    loadJSON(`data/monsters.json`),
    loadJSON(`data/balance.json`)
  ]);
  Data.monsters = monsters;
  Data.balance = balance;
  window.dispatchEvent(new Event('hexer:dataReady'));
})();
