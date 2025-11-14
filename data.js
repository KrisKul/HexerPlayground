// /js/data.js
export async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed ${path}`);
  return res.json();
}

export const Data = { monsters: [], balance: {} };

/**
 * Resolve monster image URL.
 * Priority:
 * 1) monster.image (exact basename, case-sensitive) -> /assets/monsters/<image>.png
 * 2) try id variants: id, ID, Capitalized, id with underscores removed
 */
export function monsterImg(monster) {
  const base = 'assets/monsters/';
  if (monster?.image) return `${base}${monster.image}.png`;

  const id = String(monster?.id || 'unknown');
  const variants = [
    id,
    id.toLowerCase(),
    id.toUpperCase(),
    id[0]?.toUpperCase() + id.slice(1),
    id.replace(/\s+/g, '_'),
    id.replace(/[_\s]+/g, ''),
  ];
  const unique = [...new Set(variants)];
  // we can't statically check existence; return the first variant path
  return `${base}${unique[0]}.png`;
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
