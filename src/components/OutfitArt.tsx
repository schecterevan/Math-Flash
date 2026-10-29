// SVG art for every outfit piece. Coordinates are in the mascot's 200×200
// space: body center x=100, top y=30, bottom y=182, eyes at y=100.

import type { ReactNode } from 'react';

export const BODY_PATH = 'M100 30 C150 30 172 70 172 115 C172 160 140 182 100 182 C60 182 28 160 28 115 C28 70 50 30 100 30Z';

/** Draw order: back → (arms, body) → body → (face) → face → head → vehicle → hands. */
export type Layer = 'back' | 'body' | 'face' | 'head' | 'vehicle' | 'hands';

export interface Hands {
  l: [number, number];
  r: [number, number];
  /** False when the mascot has no visible arms (the mascot then draws small hands). */
  drawn: boolean;
}

interface Ctx {
  hands: Hands;
  clipId: string;
}

interface Art {
  layer: Layer;
  /** Order within the layer (higher = on top). */
  z?: number;
  draw: (c: Ctx) => ReactNode;
}

const INK = '#2d3047';
const GOLD = '#fcc419';
const GOLD_DARK = '#e67700';
const GARNET = '#782f40';
const GARNET_GOLD = '#ceb888';

/** A band of clothing over the lower body, clipped to the body outline. */
const band = (clipId: string, y: number, fill: string, extra?: ReactNode) => (
  <g clipPath={`url(#${clipId})`}>
    <rect x="20" y={y} width="160" height={200 - y} fill={fill} />
    {extra}
  </g>
);

const at = (h: [number, number], children: ReactNode, rotate = 0) => (
  <g transform={`translate(${h[0]} ${h[1]}) rotate(${rotate})`}>{children}</g>
);

const both = (hands: Hands, f: (side: 'l' | 'r') => ReactNode) => (
  <>
    {at(hands.l, f('l'))}
    {at(hands.r, f('r'))}
  </>
);

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`);
  }
  return pts.join(' ');
}

const wheel = (x: number, y: number, r: number, hub = '#adb5bd') => (
  <g key={x}>
    <circle cx={x} cy={y} r={r} fill={INK} />
    <circle cx={x} cy={y} r={r * 0.42} fill={hub} />
  </g>
);

const checkers = (x: number, y: number, cols: number, rows: number, s: number) =>
  Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (
      <rect key={`${r}-${c}`} x={x + c * s} y={y + r * s} width={s} height={s} fill={(r + c) % 2 ? '#fff' : INK} />
    )),
  );

export const PIECE_ART: Record<string, Art> = {
  // ---- Race car driver ------------------------------------------------------
  'r-gloves': {
    layer: 'hands',
    draw: ({ hands }) =>
      both(hands, () => (
        <>
          <circle r="11" fill="#e03131" stroke="#a61e1e" strokeWidth="2.5" />
          <rect x="-9" y="6" width="18" height="5" rx="2" fill="#fff" />
        </>
      )),
  },
  'r-helmet': {
    layer: 'head',
    draw: () => (
      <>
        <path d="M26 86 C26 36 62 14 100 14 C138 14 174 36 174 86 Q100 70 26 86Z" fill="#e03131" stroke="#a61e1e" strokeWidth="3" />
        <path d="M92 15 L108 15 L106 75 L94 75Z" fill="#fff" />
      </>
    ),
  },
  'r-visor': {
    layer: 'head',
    z: 1,
    draw: () => <path d="M42 66 Q100 46 158 66 L154 78 Q100 60 46 78Z" fill={INK} opacity="0.85" />,
  },
  'r-number': {
    layer: 'head',
    z: 2,
    draw: () => (
      <>
        <circle cx="150" cy="44" r="13" fill="#fff" stroke="#a61e1e" strokeWidth="2" />
        <text x="150" y="50" textAnchor="middle" fontSize="17" fontWeight="800" fill={INK}>
          1
        </text>
      </>
    ),
  },
  'r-suit': {
    layer: 'body',
    draw: ({ clipId }) => band(clipId, 152, '#e03131', <rect x="20" y="152" width="160" height="6" fill="#fff" />),
  },
  'r-patches': {
    layer: 'body',
    z: 2,
    draw: () => (
      <>
        <rect x="52" y="162" width="20" height="12" rx="2" fill={GOLD} stroke="#fff" strokeWidth="1.5" />
        <rect x="128" y="162" width="20" height="12" rx="2" fill="#1c7ed6" stroke="#fff" strokeWidth="1.5" />
        <text x="138" y="172" textAnchor="middle" fontSize="10" fill="#fff">
          ★
        </text>
      </>
    ),
  },
  'r-scarf': {
    layer: 'body',
    z: 3,
    draw: ({ clipId }) => <g clipPath={`url(#${clipId})`}>{checkers(36, 144, 16, 1, 8)}</g>,
  },
  'r-trophy': {
    layer: 'hands',
    z: 1,
    draw: ({ hands }) =>
      at(
        hands.l,
        <>
          <path d="M-16 -34 Q-26 -30 -14 -20 M16 -34 Q26 -30 14 -20" stroke={GOLD_DARK} strokeWidth="3" fill="none" />
          <path d="M-14 -38 L14 -38 L11 -20 Q0 -10 -11 -20Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2.5" />
          <rect x="-3" y="-14" width="6" height="8" fill={GOLD_DARK} />
          <rect x="-10" y="-8" width="20" height="6" rx="2" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" />
        </>,
      ),
  },
  'r-flag': {
    layer: 'hands',
    z: 1,
    draw: ({ hands }) =>
      at(
        hands.r,
        <>
          <line x1="0" y1="4" x2="0" y2="-58" stroke="#868e96" strokeWidth="4" strokeLinecap="round" />
          <g>{checkers(0, -58, 4, 3, 8)}</g>
          <rect x="0" y="-58" width="32" height="24" fill="none" stroke={INK} strokeWidth="1.5" />
        </>,
        -8,
      ),
  },
  'r-car': {
    layer: 'vehicle',
    draw: () => (
      <>
        <rect x="-28" y="136" width="28" height="8" rx="2" fill="#a61e1e" />
        <rect x="-18" y="142" width="6" height="14" fill="#a61e1e" />
        <path d="M-22 194 L-22 172 Q-14 152 24 150 L176 150 Q212 152 222 174 L222 194 Z" fill="#e03131" stroke="#a61e1e" strokeWidth="3" />
        <rect x="-22" y="178" width="244" height="6" fill="#fff" />
        <circle cx="150" cy="166" r="11" fill="#fff" />
        <text x="150" y="171" textAnchor="middle" fontSize="14" fontWeight="800" fill={INK}>
          1
        </text>
        {wheel(14, 196, 17)}
        {wheel(186, 196, 17)}
      </>
    ),
  },

  // ---- Rapper ---------------------------------------------------------------
  'p-cap': {
    layer: 'head',
    draw: () => (
      <>
        <path d="M44 60 Q100 4 156 60 Q100 50 44 60Z" fill="#7048e8" stroke="#5f3dc4" strokeWidth="3" />
        <path d="M150 58 Q178 50 192 62 Q172 70 146 64Z" fill="#5f3dc4" />
        <circle cx="100" cy="30" r="4" fill="#5f3dc4" />
      </>
    ),
  },
  'p-shades': {
    layer: 'face',
    draw: () => (
      <>
        <g fill={INK}>
          <rect x="52" y="88" width="44" height="24" rx="9" />
          <rect x="104" y="88" width="44" height="24" rx="9" />
          <rect x="94" y="94" width="12" height="5" />
        </g>
        <path d="M58 94 L70 94 M110 94 L122 94" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },
  'p-chain': {
    layer: 'body',
    z: 2,
    draw: () => <path d="M50 138 Q100 192 150 138" stroke={GOLD} strokeWidth="6" strokeDasharray="7 3" fill="none" />,
  },
  'p-medallion': {
    layer: 'body',
    z: 3,
    draw: () => (
      <>
        <circle cx="100" cy="168" r="14" fill={GOLD} stroke={GOLD_DARK} strokeWidth="3" />
        <text x="100" y="174" textAnchor="middle" fontSize="16" fontWeight="800" fill={GOLD_DARK}>
          ★
        </text>
      </>
    ),
  },
  'p-hoodie': {
    layer: 'body',
    draw: ({ clipId }) =>
      band(
        clipId,
        150,
        '#7048e8',
        <path d="M86 150 L84 176 M114 150 L116 176" stroke="#fff" strokeWidth="3" strokeLinecap="round" />,
      ),
  },
  'p-mic': {
    layer: 'hands',
    z: 1,
    draw: ({ hands }) =>
      at(
        hands.r,
        <>
          <rect x="-4" y="-10" width="8" height="26" rx="3" fill={INK} />
          <circle cy="-18" r="10" fill="#adb5bd" stroke="#868e96" strokeWidth="2" />
          <path d="M-7 -22 L7 -22 M-8 -16 L8 -16" stroke="#868e96" strokeWidth="1.5" />
        </>,
        -20,
      ),
  },
  'p-headphones': {
    layer: 'head',
    z: 1,
    draw: () => (
      <>
        <path d="M32 100 Q32 18 100 18 Q168 18 168 100" stroke={INK} strokeWidth="8" fill="none" />
        <rect x="18" y="84" width="24" height="40" rx="10" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2.5" />
        <rect x="158" y="84" width="24" height="40" rx="10" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2.5" />
      </>
    ),
  },
  'p-ring': {
    layer: 'hands',
    z: 1,
    draw: ({ hands }) =>
      at(
        hands.l,
        <>
          <circle cx="0" cy="-2" r="7" fill="none" stroke={GOLD} strokeWidth="4" />
          <circle cx="0" cy="-10" r="4" fill="#74c0fc" stroke="#fff" strokeWidth="1.5" />
          <text x="10" y="-16" fontSize="12" fill={GOLD}>
            ✦
          </text>
        </>,
      ),
  },
  'p-boombox': {
    layer: 'vehicle',
    z: 2,
    draw: () => (
      <g transform="translate(-30 146)">
        <path d="M10 6 Q28 -10 46 6" stroke="#868e96" strokeWidth="4" fill="none" />
        <rect x="0" y="4" width="56" height="34" rx="6" fill="#495057" stroke={INK} strokeWidth="2" />
        <circle cx="14" cy="22" r="10" fill={INK} />
        <circle cx="14" cy="22" r="4" fill="#adb5bd" />
        <circle cx="42" cy="22" r="10" fill={INK} />
        <circle cx="42" cy="22" r="4" fill="#adb5bd" />
        <rect x="23" y="10" width="10" height="5" rx="1" fill="#74c0fc" />
      </g>
    ),
  },
  'p-limo': {
    layer: 'vehicle',
    z: 1,
    draw: () => (
      <>
        <path d="M-28 194 L-28 170 Q-22 152 10 150 L190 150 Q224 152 228 170 L228 194Z" fill="#7048e8" stroke="#5f3dc4" strokeWidth="3" />
        <rect x="-28" y="174" width="256" height="5" fill={GOLD} />
        {wheel(4, 196, 16, GOLD)}
        {wheel(196, 196, 16, GOLD)}
        <circle cx="222" cy="164" r="5" fill="#ffe066" />
      </>
    ),
  },

  // ---- Rock star ------------------------------------------------------------
  'k-mohawk': {
    layer: 'head',
    draw: () => (
      <path
        d="M64 46 L72 4 L84 36 L94 -8 L104 34 L116 -2 L124 36 L138 8 L138 48 Q100 30 64 46Z"
        fill="#e64980"
        stroke="#a61e4d"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    ),
  },
  'k-paint': {
    layer: 'face',
    draw: () => <path d="M142 108 L132 122 L141 122 L134 138" stroke="#1c7ed6" strokeWidth="4" fill="none" strokeLinejoin="round" />,
  },
  'k-wristbands': {
    layer: 'hands',
    draw: ({ hands }) =>
      both(hands, () => (
        <>
          <rect x="-12" y="4" width="24" height="9" rx="3" fill={INK} />
          <path d="M-8 4 L-6 -2 L-4 4 M-1 4 L1 -2 L3 4 M6 4 L8 -2 L10 4" fill="#dee2e6" />
        </>
      )),
  },
  'k-jacket': {
    layer: 'body',
    draw: ({ clipId }) =>
      band(
        clipId,
        148,
        INK,
        <>
          <path d="M100 148 L100 200" stroke="#adb5bd" strokeWidth="3" strokeDasharray="4 3" />
          <path d="M82 148 L94 168 L100 148 M118 148 L106 168 L100 148" fill="#495057" />
        </>,
      ),
  },
  'k-pins': {
    layer: 'body',
    z: 1,
    draw: () => (
      <>
        <polygon points={star(66, 168, 8)} fill="#e64980" />
        <polygon points={star(136, 172, 7)} fill={GOLD} />
      </>
    ),
  },
  'k-starshades': {
    layer: 'face',
    z: 1,
    draw: () => (
      <>
        <polygon points={star(74, 100, 22)} fill="#e64980" stroke="#a61e4d" strokeWidth="2.5" opacity="0.92" />
        <polygon points={star(126, 100, 22)} fill="#e64980" stroke="#a61e4d" strokeWidth="2.5" opacity="0.92" />
        <path d="M92 98 L108 98" stroke="#a61e4d" strokeWidth="4" />
      </>
    ),
  },
  'k-guitar': {
    layer: 'hands',
    z: 2,
    draw: () => (
      <g transform="translate(140 170) rotate(32)">
        <rect x="-4" y="-86" width="8" height="70" fill="#8d5524" />
        <rect x="-7" y="-100" width="14" height="16" rx="3" fill={INK} />
        <circle cx="0" cy="-12" r="15" fill="#e03131" stroke={INK} strokeWidth="2.5" />
        <circle cx="0" cy="6" r="20" fill="#e03131" stroke={INK} strokeWidth="2.5" />
        <rect x="-9" y="0" width="18" height="5" fill={INK} />
        <line x1="0" y1="-86" x2="0" y2="2" stroke="#f1f3f5" strokeWidth="1.5" />
      </g>
    ),
  },
  'k-amp': {
    layer: 'back',
    z: 1,
    draw: () => (
      <g transform="translate(-28 104)">
        <rect width="56" height="80" rx="5" fill={INK} stroke="#000" strokeWidth="2" />
        <rect x="6" y="18" width="44" height="56" rx="4" fill="#495057" />
        <circle cx="28" cy="46" r="16" fill={INK} />
        <circle cx="12" cy="9" r="3" fill={GOLD} />
        <circle cx="22" cy="9" r="3" fill={GOLD} />
        <circle cx="32" cy="9" r="3" fill={GOLD} />
      </g>
    ),
  },
  'k-lights': {
    layer: 'back',
    z: 0,
    draw: () => (
      <>
        <polygon points="-30,-14 -6,-14 90,200 40,200" fill="rgb(255 224 102 / 0.35)" />
        <polygon points="206,-14 230,-14 160,200 110,200" fill="rgb(255 168 220 / 0.35)" />
        <text x="-20" y="40" fontSize="18" fill={GOLD}>
          ✦
        </text>
        <text x="206" y="70" fontSize="14" fill="#e64980">
          ✦
        </text>
        <text x="180" y="12" fontSize="12" fill={GOLD}>
          ✦
        </text>
      </>
    ),
  },
  'k-bike': {
    layer: 'vehicle',
    draw: () => (
      <>
        <rect x="-26" y="176" width="34" height="7" rx="3" fill="#adb5bd" />
        <path d="M-4 192 L36 162 L164 162 L204 192" stroke="#495057" strokeWidth="9" fill="none" strokeLinejoin="round" />
        <ellipse cx="150" cy="158" rx="28" ry="12" fill="#e64980" stroke="#a61e4d" strokeWidth="2.5" />
        <path d="M178 150 L198 126" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <circle cx="198" cy="126" r="5" fill={INK} />
        {[-4, 204].map((x) => (
          <g key={x}>
            <circle cx={x} cy="192" r="19" fill="none" stroke={INK} strokeWidth="8" />
            <circle cx={x} cy="192" r="5" fill="#adb5bd" />
          </g>
        ))}
      </>
    ),
  },

  // ---- Astronaut ------------------------------------------------------------
  'a-antenna': {
    layer: 'head',
    z: 5,
    draw: () => (
      <>
        <line x1="100" y1="12" x2="100" y2="-6" stroke="#adb5bd" strokeWidth="4" />
        <circle cx="100" cy="-7" r="6" fill="#e03131" />
      </>
    ),
  },
  'a-collar': {
    layer: 'body',
    z: 4,
    draw: () => <path d="M28 166 Q100 200 172 166 L168 190 Q100 214 32 190Z" fill="#f1f3f5" stroke="#adb5bd" strokeWidth="3" />,
  },
  'a-suit': {
    layer: 'body',
    draw: ({ clipId }) => band(clipId, 150, '#f1f3f5', <rect x="20" y="150" width="160" height="6" fill="#1c7ed6" />),
  },
  'a-patch': {
    layer: 'body',
    z: 2,
    draw: () => (
      <>
        <rect x="52" y="158" width="22" height="14" rx="2" fill="#1c7ed6" />
        <text x="63" y="169" textAnchor="middle" fontSize="11" fill="#fff">
          ★
        </text>
      </>
    ),
  },
  'a-gloves': {
    layer: 'hands',
    draw: ({ hands }) =>
      both(hands, () => (
        <>
          <circle r="12" fill="#f8f9fa" stroke="#adb5bd" strokeWidth="2.5" />
          <rect x="-11" y="7" width="22" height="6" rx="2" fill="#1c7ed6" />
        </>
      )),
  },
  'a-panel': {
    layer: 'body',
    z: 3,
    draw: () => (
      <>
        <rect x="84" y="154" width="32" height="20" rx="4" fill="#dee2e6" stroke="#868e96" strokeWidth="2" />
        <circle cx="92" cy="164" r="3.5" fill="#e03131" />
        <circle cx="100" cy="164" r="3.5" fill="#40c057" />
        <circle cx="108" cy="164" r="3.5" fill="#1c7ed6" />
      </>
    ),
  },
  'a-tank': {
    layer: 'back',
    draw: () => (
      <>
        <rect x="150" y="54" width="26" height="96" rx="12" fill="#ced4da" stroke="#868e96" strokeWidth="2.5" />
        <rect x="24" y="54" width="26" height="96" rx="12" fill="#ced4da" stroke="#868e96" strokeWidth="2.5" />
      </>
    ),
  },
  'a-helmet': {
    layer: 'head',
    z: 3,
    draw: () => (
      <>
        <circle cx="100" cy="102" r="92" fill="rgb(173 216 230 / 0.22)" stroke="#dee2e6" strokeWidth="7" />
        <path d="M40 60 Q60 26 100 18" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.8" />
      </>
    ),
  },
  'a-planet': {
    layer: 'hands',
    z: 3,
    draw: () => (
      <g transform="translate(-10 14)">
        <circle r="14" fill="#ffa94d" stroke="#e8590c" strokeWidth="2" />
        <ellipse rx="24" ry="6" fill="none" stroke="#e8590c" strokeWidth="3" transform="rotate(-18)" />
        <text x="16" y="-12" fontSize="10" fill={GOLD}>
          ✦
        </text>
      </g>
    ),
  },
  'a-rocket': {
    layer: 'back',
    z: -2,
    draw: () => (
      <g transform="translate(184 0)">
        <path d="M20 -12 Q40 10 40 40 L40 160 L0 160 L0 40 Q0 10 20 -12Z" fill="#f8f9fa" stroke="#868e96" strokeWidth="3" />
        <circle cx="20" cy="56" r="10" fill="#74c0fc" stroke="#1c7ed6" strokeWidth="3" />
        <path d="M0 120 L-14 168 L0 160Z M40 120 L54 168 L40 160Z" fill="#e03131" />
        <path d="M6 162 L20 200 L34 162Z" fill="#ff922b" />
        <path d="M12 162 L20 186 L28 162Z" fill="#ffe066" />
        <text x="20" y="104" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1c7ed6">
          ★
        </text>
      </g>
    ),
  },

  // ---- Wrestler -------------------------------------------------------------
  'w-mask': {
    layer: 'face',
    draw: () => (
      <>
        <path
          fillRule="evenodd"
          d="M29 118 C25 58 56 30 100 30 C144 30 175 58 171 118 Q100 128 29 118Z M52 100 a22 18 0 1 0 44 0 a22 18 0 1 0 -44 0Z M104 100 a22 18 0 1 0 44 0 a22 18 0 1 0 -44 0Z"
          fill="#1c7ed6"
          stroke="#1864ab"
          strokeWidth="3"
        />
        <ellipse cx="74" cy="100" rx="22" ry="18" fill="none" stroke="#fff" strokeWidth="4" />
        <ellipse cx="126" cy="100" rx="22" ry="18" fill="none" stroke="#fff" strokeWidth="4" />
      </>
    ),
  },
  'w-zigzag': {
    layer: 'face',
    z: 1,
    draw: () => (
      <path d="M66 66 L82 50 L100 68 L118 50 L134 66" stroke={GOLD} strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    ),
  },
  'w-wristbands': {
    layer: 'hands',
    draw: ({ hands }) => both(hands, () => <rect x="-12" y="3" width="24" height="10" rx="3" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" />),
  },
  'w-trunks': {
    layer: 'body',
    draw: ({ clipId }) => band(clipId, 162, '#1c7ed6'),
  },
  'w-belt': {
    layer: 'body',
    z: 1,
    draw: () => <rect x="30" y="156" width="140" height="16" rx="6" fill={INK} />,
  },
  'w-plate': {
    layer: 'body',
    z: 2,
    draw: () => (
      <>
        <ellipse cx="100" cy="164" rx="24" ry="16" fill={GOLD} stroke={GOLD_DARK} strokeWidth="3" />
        <text x="100" y="170" textAnchor="middle" fontSize="16" fontWeight="800" fill={GOLD_DARK}>
          ★
        </text>
      </>
    ),
  },
  'w-cape': {
    layer: 'back',
    z: 1,
    draw: () => (
      <>
        <path d="M58 60 Q100 80 142 60 L196 184 Q100 204 4 184 Z" fill="#1c7ed6" stroke="#1864ab" strokeWidth="3" strokeLinejoin="round" />
        <polygon points={star(20, 170, 8)} fill={GOLD} />
        <polygon points={star(180, 170, 8)} fill={GOLD} />
      </>
    ),
  },
  'w-finger': {
    layer: 'hands',
    z: 1,
    draw: ({ hands }) =>
      at(
        hands.r,
        <>
          <rect x="-6" y="-58" width="13" height="42" rx="6" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" />
          <rect x="-15" y="-20" width="30" height="30" rx="9" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" />
          <text x="0" y="0" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1864ab">
            #1
          </text>
        </>,
        10,
      ),
  },
  'w-ropes': {
    layer: 'back',
    z: -2,
    draw: () => (
      <>
        <rect x="-28" y="60" width="9" height="140" rx="3" fill="#868e96" />
        <rect x="219" y="60" width="9" height="140" rx="3" fill="#868e96" />
        <line x1="-24" y1="80" x2="224" y2="80" stroke="#e03131" strokeWidth="5" />
        <line x1="-24" y1="112" x2="224" y2="112" stroke="#f8f9fa" strokeWidth="5" />
        <line x1="-24" y1="144" x2="224" y2="144" stroke="#1c7ed6" strokeWidth="5" />
      </>
    ),
  },
  'w-truck': {
    layer: 'vehicle',
    draw: () => (
      <>
        <path d="M-16 178 L-10 150 L210 150 L216 178 Z" fill="#1c7ed6" stroke="#1864ab" strokeWidth="3" />
        <path d="M-6 172 Q14 156 30 166 Q46 152 62 168" stroke={GOLD} strokeWidth="5" fill="none" strokeLinecap="round" />
        {[16, 184].map((x) => (
          <g key={x}>
            <circle cx={x} cy="192" r="24" fill={INK} stroke="#000" strokeWidth="5" strokeDasharray="6 4" />
            <circle cx={x} cy="192" r="10" fill="#adb5bd" />
          </g>
        ))}
      </>
    ),
  },

  // ---- Soldier --------------------------------------------------------------
  's-helmet': {
    layer: 'head',
    draw: () => (
      <>
        <path d="M30 84 C30 34 62 16 100 16 C138 16 170 34 170 84 Q100 72 30 84Z" fill="#5c7a3a" stroke="#3b5323" strokeWidth="3" />
        <path d="M50 40 L80 76 M80 22 L120 74 M120 20 L150 60 M60 70 L130 26" stroke="#3b5323" strokeWidth="2" opacity="0.6" />
        <path d="M36 84 Q38 120 54 138 M164 84 Q162 120 146 138" stroke="#3b5323" strokeWidth="4" fill="none" />
      </>
    ),
  },
  's-paint': {
    layer: 'face',
    draw: () => <path d="M46 120 L70 120 M48 128 L68 128 M130 120 L154 120 M132 128 L152 128" stroke="#3b5323" strokeWidth="4" strokeLinecap="round" />,
  },
  's-tags': {
    layer: 'body',
    z: 2,
    draw: () => (
      <>
        <path d="M64 146 Q100 178 136 146" stroke="#ced4da" strokeWidth="3" strokeDasharray="3 2" fill="none" />
        <rect x="92" y="162" width="11" height="16" rx="3" fill="#dee2e6" stroke="#868e96" strokeWidth="1.5" transform="rotate(-10 97 170)" />
        <rect x="100" y="164" width="11" height="16" rx="3" fill="#ced4da" stroke="#868e96" strokeWidth="1.5" transform="rotate(12 105 172)" />
      </>
    ),
  },
  's-uniform': {
    layer: 'body',
    draw: ({ clipId }) =>
      band(
        clipId,
        150,
        '#5c7a3a',
        <>
          <ellipse cx="50" cy="164" rx="14" ry="7" fill="#3b5323" />
          <ellipse cx="88" cy="180" rx="16" ry="6" fill="#8a9a5b" />
          <ellipse cx="128" cy="160" rx="12" ry="6" fill="#8a9a5b" />
          <ellipse cx="150" cy="176" rx="14" ry="7" fill="#3b5323" />
          <ellipse cx="70" cy="190" rx="10" ry="5" fill="#3b5323" />
        </>,
      ),
  },
  's-chevrons': {
    layer: 'body',
    z: 1,
    draw: () => <path d="M48 160 L58 168 L68 160 M48 167 L58 175 L68 167 M48 174 L58 182 L68 174" stroke={GOLD} strokeWidth="3.5" fill="none" />,
  },
  's-backpack': {
    layer: 'back',
    draw: () => <rect x="12" y="94" width="176" height="86" rx="24" fill="#4a6330" stroke="#3b5323" strokeWidth="3" />,
  },
  's-binoculars': {
    layer: 'hands',
    z: 1,
    draw: ({ hands }) =>
      at(
        hands.l,
        <>
          <rect x="-15" y="-28" width="13" height="24" rx="4" fill={INK} />
          <rect x="2" y="-28" width="13" height="24" rx="4" fill={INK} />
          <rect x="-4" y="-22" width="8" height="8" fill="#495057" />
          <circle cx="-8.5" cy="-28" r="5" fill="#74c0fc" />
          <circle cx="8.5" cy="-28" r="5" fill="#74c0fc" />
        </>,
      ),
  },
  's-medal': {
    layer: 'body',
    z: 3,
    draw: () => (
      <>
        <rect x="132" y="150" width="14" height="12" fill="#e03131" />
        <rect x="137" y="150" width="4" height="12" fill="#fff" />
        <circle cx="139" cy="170" r="8" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" />
        <text x="139" y="174" textAnchor="middle" fontSize="9" fill={GOLD_DARK}>
          ★
        </text>
      </>
    ),
  },
  's-radio': {
    layer: 'hands',
    z: 1,
    draw: ({ hands }) =>
      at(
        hands.r,
        <>
          <line x1="5" y1="-28" x2="5" y2="-48" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <rect x="-9" y="-30" width="18" height="32" rx="4" fill="#3b5323" stroke={INK} strokeWidth="2" />
          <path d="M-5 -20 L5 -20 M-5 -15 L5 -15 M-5 -10 L5 -10" stroke="#8a9a5b" strokeWidth="2" />
          <circle cx="-4" cy="-25" r="2" fill="#e03131" />
        </>,
        -10,
      ),
  },
  's-tank': {
    layer: 'vehicle',
    draw: () => (
      <>
        <rect x="186" y="138" width="44" height="9" rx="3" fill="#3b5323" />
        <rect x="-14" y="148" width="228" height="28" rx="6" fill="#5c7a3a" stroke="#3b5323" strokeWidth="3" />
        <text x="30" y="170" textAnchor="middle" fontSize="18" fill="#fff">
          ★
        </text>
        <rect x="-24" y="172" width="248" height="34" rx="17" fill="#3b5323" />
        {[-4, 30, 64, 98, 132, 166, 200].map((x) => (
          <g key={x}>
            <circle cx={x} cy="189" r="10" fill={INK} />
            <circle cx={x} cy="189" r="4" fill="#868e96" />
          </g>
        ))}
      </>
    ),
  },

  // ---- Garnet & Gold --------------------------------------------------------
  'g-paint': {
    layer: 'face',
    draw: () => (
      <path d="M46 118 L70 118 M130 118 L154 118" stroke={GARNET} strokeWidth="5" strokeLinecap="round" />
    ),
  },
  'g-helmet': {
    layer: 'head',
    draw: () => (
      <>
        <path d="M28 88 C28 36 62 14 100 14 C138 14 172 36 172 88 Q100 74 28 88Z" fill={GARNET} stroke="#4f1f2a" strokeWidth="3" />
        <path d="M94 15 L106 15 L105 76 L95 76Z" fill={GARNET_GOLD} />
        <path d="M150 84 L176 112 M158 82 L182 104" stroke="#adb5bd" strokeWidth="4" strokeLinecap="round" />
      </>
    ),
  },
  'g-jersey': {
    layer: 'body',
    draw: ({ clipId }) => band(clipId, 148, GARNET, <rect x="20" y="148" width="160" height="7" fill={GARNET_GOLD} />),
  },
  'g-number': {
    layer: 'body',
    z: 1,
    draw: () => (
      <text x="100" y="186" textAnchor="middle" fontSize="28" fontWeight="900" fill={GARNET_GOLD} stroke="#fff" strokeWidth="1.5">
        1
      </text>
    ),
  },
  'g-wristbands': {
    layer: 'hands',
    draw: ({ hands }) => both(hands, () => <rect x="-12" y="3" width="24" height="10" rx="3" fill={GARNET_GOLD} stroke={GARNET} strokeWidth="2" />),
  },
  'g-pompom': {
    layer: 'hands',
    z: 1,
    draw: ({ hands }) =>
      at(
        hands.l,
        <g>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 14;
            return (
              <line key={i} x1="0" y1="-14" x2={Math.cos(a) * 18} y2={-14 + Math.sin(a) * 18} stroke={i % 2 ? GARNET_GOLD : GARNET} strokeWidth="5" strokeLinecap="round" />
            );
          })}
        </g>,
      ),
  },
  'g-cape': {
    layer: 'back',
    z: 1,
    draw: () => <path d="M58 60 Q100 80 142 60 L196 184 Q100 204 4 184 Z" fill={GARNET} stroke={GARNET_GOLD} strokeWidth="4" strokeLinejoin="round" />,
  },
  'g-pennant': {
    layer: 'back',
    z: -1,
    draw: () => (
      <g transform="translate(-22 -6)">
        <line x1="0" y1="0" x2="0" y2="120" stroke="#868e96" strokeWidth="4" />
        <path d="M2 2 L52 16 L2 30Z" fill={GARNET} />
        <path d="M2 30 L44 40 L2 52Z" fill={GARNET_GOLD} />
      </g>
    ),
  },
  'g-spear': {
    layer: 'hands',
    z: 2,
    draw: ({ hands }) =>
      at(
        hands.r,
        <>
          <line x1="0" y1="46" x2="0" y2="-8" stroke="#8d5524" strokeWidth="5" strokeLinecap="round" />
          <path d="M0 -8 L-7 6 L0 -26 L7 6Z" fill="#adb5bd" stroke="#868e96" strokeWidth="1.5" />
          <path d="M-2 -20 Q-18 -40 -6 -54 Q-4 -38 4 -44 Q2 -58 12 -64 Q8 -44 16 -34 Q10 -22 -2 -20Z" fill="#ff922b" />
          <path d="M0 -24 Q-8 -36 -2 -44 Q0 -34 6 -36 Q6 -28 0 -24Z" fill="#ffe066" />
          <rect x="-4" y="14" width="8" height="10" fill={GARNET_GOLD} />
        </>,
        -6,
      ),
  },
  'g-horse': {
    layer: 'vehicle',
    draw: () => (
      <>
        {/* tail */}
        <path d="M-6 168 Q-34 176 -26 210 Q-14 190 0 182" fill="#3b2f2f" />
        {/* legs */}
        {[12, 40, 158, 186].map((x) => (
          <g key={x}>
            <rect x={x - 6} y="176" width="13" height="36" rx="5" fill="#f1e3d3" stroke="#6b4f3a" strokeWidth="2" />
            <rect x={x - 6} y="206" width="13" height="7" rx="2" fill="#3b2f2f" />
          </g>
        ))}
        {/* body with appaloosa spots */}
        <ellipse cx="100" cy="174" rx="112" ry="26" fill="#f1e3d3" stroke="#6b4f3a" strokeWidth="3" />
        <path d="M-10 168 Q10 150 30 160 Q40 186 0 188 Z" fill="#6b4f3a" />
        {[
          [24, 170],
          [44, 182],
          [62, 166],
          [150, 186],
          [170, 168],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="4" fill="#6b4f3a" />
        ))}
        {/* saddle blanket */}
        <path d="M58 150 L142 150 L136 190 L64 190 Z" fill={GARNET} stroke={GARNET_GOLD} strokeWidth="3" />
        {/* neck and head */}
        <path d="M188 168 Q206 130 214 108 L232 118 Q226 150 210 176 Z" fill="#f1e3d3" stroke="#6b4f3a" strokeWidth="3" />
        <path d="M206 104 Q226 92 240 112 Q238 126 226 124 Q216 120 208 118 Z" fill="#f1e3d3" stroke="#6b4f3a" strokeWidth="3" />
        <circle cx="222" cy="106" r="2.5" fill={INK} />
        <path d="M210 104 L214 92 L218 103" fill="#f1e3d3" stroke="#6b4f3a" strokeWidth="2" />
        {/* mane */}
        <path d="M206 108 Q196 120 200 132 Q190 140 194 152 Q184 158 190 168" stroke="#3b2f2f" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* reins */}
        <path d="M228 120 Q200 140 160 150" stroke={GARNET_GOLD} strokeWidth="2.5" fill="none" />
      </>
    ),
  },
};
