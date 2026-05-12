export const pad = n => String(n).padStart(3, '0');
export const idFromUrl = url => parseInt(url.split('/').filter(Boolean).pop(), 10);

export function statLabel(key) {
  const map = {
    hp: 'HP', attack: 'ATK', defense: 'DEF',
    'special-attack': 'Sp.ATK', 'special-defense': 'Sp.DEF', speed: 'SPD',
  };
  return map[key] || key;
}

export function statColor(val) {
  if (val >= 100) return '#4caf50';
  if (val >= 70)  return '#8bc34a';
  if (val >= 50)  return '#ffc107';
  return '#e3350d';
}
