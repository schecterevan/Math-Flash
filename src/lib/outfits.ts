// Outfits: every win adds the next piece of the outfit being built.
// Each outfit has 10 pieces; the 10th is always its vehicle.

export type OutfitId = 'racer' | 'rapper' | 'rocker' | 'astronaut' | 'wrestler' | 'soldier' | 'garnet';

export interface PieceMeta {
  id: string;
  name: string;
  icon: string;
}

export interface OutfitMeta {
  id: OutfitId;
  name: string;
  icon: string;
  color: string;
  pieces: PieceMeta[];
}

export const PIECES_PER_OUTFIT = 10;

export const OUTFITS: OutfitMeta[] = [
  {
    id: 'racer',
    name: 'Race car driver',
    icon: '🏎️',
    color: '#e03131',
    pieces: [
      { id: 'r-gloves', name: 'Racing gloves', icon: '🧤' },
      { id: 'r-helmet', name: 'Racing helmet', icon: '⛑️' },
      { id: 'r-visor', name: 'Visor', icon: '🥽' },
      { id: 'r-number', name: 'Number 1', icon: '1️⃣' },
      { id: 'r-suit', name: 'Racing suit', icon: '🦺' },
      { id: 'r-patches', name: 'Sponsor patches', icon: '🏷️' },
      { id: 'r-scarf', name: 'Checkered scarf', icon: '🏁' },
      { id: 'r-trophy', name: 'Trophy', icon: '🏆' },
      { id: 'r-flag', name: 'Checkered flag', icon: '🚩' },
      { id: 'r-car', name: 'Race car', icon: '🏎️' },
    ],
  },
  {
    id: 'rapper',
    name: 'Rapper',
    icon: '🎤',
    color: '#7048e8',
    pieces: [
      { id: 'p-cap', name: 'Backwards cap', icon: '🧢' },
      { id: 'p-shades', name: 'Shades', icon: '🕶️' },
      { id: 'p-chain', name: 'Gold chain', icon: '⛓️' },
      { id: 'p-medallion', name: 'Star medallion', icon: '⭐' },
      { id: 'p-hoodie', name: 'Hoodie', icon: '🧥' },
      { id: 'p-mic', name: 'Microphone', icon: '🎤' },
      { id: 'p-headphones', name: 'Headphones', icon: '🎧' },
      { id: 'p-ring', name: 'Bling ring', icon: '💍' },
      { id: 'p-boombox', name: 'Boombox', icon: '📻' },
      { id: 'p-limo', name: 'Limo', icon: '🚘' },
    ],
  },
  {
    id: 'rocker',
    name: 'Rock star',
    icon: '🎸',
    color: '#e64980',
    pieces: [
      { id: 'k-mohawk', name: 'Mohawk', icon: '🦔' },
      { id: 'k-paint', name: 'Lightning face paint', icon: '⚡' },
      { id: 'k-wristbands', name: 'Spiky wristbands', icon: '⛓️' },
      { id: 'k-jacket', name: 'Leather jacket', icon: '🧥' },
      { id: 'k-pins', name: 'Star pins', icon: '📌' },
      { id: 'k-starshades', name: 'Star glasses', icon: '🤩' },
      { id: 'k-guitar', name: 'Electric guitar', icon: '🎸' },
      { id: 'k-amp', name: 'Amplifier', icon: '🔊' },
      { id: 'k-lights', name: 'Stage lights', icon: '✨' },
      { id: 'k-bike', name: 'Motorcycle', icon: '🏍️' },
    ],
  },
  {
    id: 'astronaut',
    name: 'Astronaut',
    icon: '🚀',
    color: '#1c7ed6',
    pieces: [
      { id: 'a-antenna', name: 'Antenna', icon: '📡' },
      { id: 'a-collar', name: 'Suit collar', icon: '⭕' },
      { id: 'a-suit', name: 'Space suit', icon: '🧑‍🚀' },
      { id: 'a-patch', name: 'Mission patch', icon: '🏳️' },
      { id: 'a-gloves', name: 'Space gloves', icon: '🧤' },
      { id: 'a-panel', name: 'Control panel', icon: '🎛️' },
      { id: 'a-tank', name: 'Oxygen tanks', icon: '🫧' },
      { id: 'a-helmet', name: 'Space helmet', icon: '🪖' },
      { id: 'a-planet', name: 'Pet planet', icon: '🪐' },
      { id: 'a-rocket', name: 'Rocket', icon: '🚀' },
    ],
  },
  {
    id: 'wrestler',
    name: 'Wrestler',
    icon: '🤼',
    color: '#1c7ed6',
    pieces: [
      { id: 'w-mask', name: 'Wrestling mask', icon: '🎭' },
      { id: 'w-zigzag', name: 'Gold mask stripe', icon: '〰️' },
      { id: 'w-wristbands', name: 'Gold wristbands', icon: '🟡' },
      { id: 'w-trunks', name: 'Wrestling trunks', icon: '🩳' },
      { id: 'w-belt', name: 'Belt', icon: '➖' },
      { id: 'w-plate', name: 'Champion plate', icon: '🥇' },
      { id: 'w-cape', name: 'Star cape', icon: '🦸' },
      { id: 'w-finger', name: 'Foam finger', icon: '☝️' },
      { id: 'w-ropes', name: 'Wrestling ring', icon: '🟥' },
      { id: 'w-truck', name: 'Monster truck', icon: '🛻' },
    ],
  },
  {
    id: 'soldier',
    name: 'Soldier',
    icon: '🪖',
    color: '#5c7a3a',
    pieces: [
      { id: 's-helmet', name: 'Army helmet', icon: '🪖' },
      { id: 's-paint', name: 'Face paint', icon: '🟩' },
      { id: 's-tags', name: 'Dog tags', icon: '🏷️' },
      { id: 's-uniform', name: 'Camo uniform', icon: '🥋' },
      { id: 's-chevrons', name: 'Rank stripes', icon: '🎖️' },
      { id: 's-backpack', name: 'Backpack', icon: '🎒' },
      { id: 's-binoculars', name: 'Binoculars', icon: '🔭' },
      { id: 's-medal', name: 'Star medal', icon: '🏅' },
      { id: 's-radio', name: 'Radio', icon: '📻' },
      { id: 's-tank', name: 'Tank', icon: '🛡️' },
    ],
  },
  {
    id: 'garnet',
    name: 'Garnet & Gold',
    icon: '🔥',
    color: '#782f40',
    pieces: [
      { id: 'g-paint', name: 'Garnet & gold face paint', icon: '🎨' },
      { id: 'g-helmet', name: 'Football helmet', icon: '🏈' },
      { id: 'g-jersey', name: 'Garnet jersey', icon: '👕' },
      { id: 'g-number', name: 'Number 1', icon: '1️⃣' },
      { id: 'g-wristbands', name: 'Gold wristbands', icon: '🟡' },
      { id: 'g-pompom', name: 'Gold pom-pom', icon: '🎉' },
      { id: 'g-cape', name: 'Garnet cape', icon: '🦸' },
      { id: 'g-pennant', name: 'Garnet & gold flag', icon: '🚩' },
      { id: 'g-spear', name: 'Flaming spear', icon: '🔥' },
      { id: 'g-horse', name: 'Appaloosa horse', icon: '🐎' },
    ],
  },
];

export type OutfitProgress = Partial<Record<OutfitId, number>>;

export function outfitById(id: OutfitId): OutfitMeta {
  return OUTFITS.find((o) => o.id === id)!;
}

/** First outfit (in display order) that isn't finished, or null when all are. */
export function nextIncomplete(progress: OutfitProgress, after?: OutfitId): OutfitId | null {
  const start = after ? OUTFITS.findIndex((o) => o.id === after) + 1 : 0;
  for (let i = 0; i < OUTFITS.length; i++) {
    const o = OUTFITS[(start + i) % OUTFITS.length];
    if ((progress[o.id] ?? 0) < PIECES_PER_OUTFIT) return o.id;
  }
  return null;
}

/** Spread an existing win count over outfits in order (for profiles from before outfits). */
export function progressFromWins(wins: number): OutfitProgress {
  const p: OutfitProgress = {};
  let left = wins;
  for (const o of OUTFITS) {
    if (left <= 0) break;
    p[o.id] = Math.min(PIECES_PER_OUTFIT, left);
    left -= p[o.id]!;
  }
  return p;
}
