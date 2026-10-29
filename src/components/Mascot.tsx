import { useId } from 'react';
import { outfitById, type OutfitId } from '../lib/outfits';
import { BODY_PATH, PIECE_ART, type Hands, type Layer } from './OutfitArt';

export type Mood = 'idle' | 'listening' | 'happy' | 'oops' | 'thinking' | 'cheer';

/** "Numo" – the friendly blob that reacts to every answer. */
export function Mascot({
  mood = 'idle',
  outfit = null,
  pieces = 0,
  muscle = 0,
  size = 160,
  className = '',
}: {
  mood?: Mood;
  /** Outfit being worn; only its first `pieces` pieces are drawn. */
  outfit?: OutfitId | null;
  pieces?: number;
  /** 0–5: arms get stronger as the child wins sessions. */
  muscle?: number;
  size?: number;
  className?: string;
}) {
  const happy = mood === 'happy' || mood === 'cheer';
  const clipId = useId().replace(/:/g, '');
  const worn = outfit ? outfitById(outfit).pieces.slice(0, pieces).map((p) => p.id) : [];

  // Where the hands are, so held items (flag, mic, guitar…) land in them.
  const hands: Hands =
    muscle > 0
      ? happy
        ? { l: [6, 52], r: [194, 52], drawn: true }
        : { l: [26, 164], r: [174, 164], drawn: true }
      : happy
        ? { l: [22, 55], r: [178, 55], drawn: true }
        : { l: [20, 150], r: [180, 150], drawn: false };

  const layer = (name: Layer) =>
    worn
      .map((id) => PIECE_ART[id])
      .filter((a) => a && a.layer === name)
      .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
      .map((a, i) => <g key={`${name}${i}`}>{a.draw({ hands, clipId })}</g>);

  const holding = worn.some((id) => PIECE_ART[id]?.layer === 'hands');

  return (
    <svg
      viewBox="-30 -14 260 230"
      width={size}
      height={size}
      className={`${className} ${happy ? 'anim-bounce' : mood === 'oops' ? 'anim-wiggle' : 'anim-float'}`}
      aria-hidden
      data-outfit={outfit ?? 'none'}
      data-pieces={worn.length}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={BODY_PATH} />
        </clipPath>
      </defs>
      {/* shadow */}
      <ellipse cx="100" cy="188" rx="58" ry="8" fill="rgb(0 0 0 / 0.12)" />
      {layer('back')}
      {/* arms */}
      {muscle > 0 ? (
        <Arms level={muscle} flex={happy} thinking={mood === 'thinking'} />
      ) : happy ? (
        <>
          <path d="M40 110 Q15 80 22 55" stroke="var(--blob)" strokeWidth="16" strokeLinecap="round" fill="none" />
          <path d="M160 110 Q185 80 178 55" stroke="var(--blob)" strokeWidth="16" strokeLinecap="round" fill="none" />
        </>
      ) : mood === 'thinking' ? (
        <path d="M150 130 Q175 120 150 100" stroke="var(--blob)" strokeWidth="16" strokeLinecap="round" fill="none" />
      ) : null}
      {/* body */}
      <path d={BODY_PATH} fill="var(--blob)" stroke="rgb(0 0 0 / 0.12)" strokeWidth="3" />
      {layer('body')}
      {/* cheeks */}
      <circle cx="58" cy="128" r="11" fill="#ff8fab" opacity="0.55" />
      <circle cx="142" cy="128" r="11" fill="#ff8fab" opacity="0.55" />
      {/* eyes */}
      {happy ? (
        <>
          <path d="M60 100 Q74 84 88 100" stroke="#2d3047" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M112 100 Q126 84 140 100" stroke="#2d3047" strokeWidth="7" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <g>
          <g className="eye">
            <circle cx="74" cy="100" r="13" fill="#2d3047" />
            <circle cx="79" cy={mood === 'thinking' ? 92 : 95} r="4.5" fill="#fff" />
          </g>
          <g className="eye">
            <circle cx="126" cy="100" r="13" fill="#2d3047" />
            <circle cx="131" cy={mood === 'thinking' ? 92 : 95} r="4.5" fill="#fff" />
          </g>
        </g>
      )}
      {/* mouth */}
      {happy ? (
        <path d="M76 128 Q100 160 124 128 Z" fill="#2d3047" />
      ) : mood === 'oops' ? (
        <path d="M84 140 Q100 130 116 140" stroke="#2d3047" strokeWidth="6" fill="none" strokeLinecap="round" />
      ) : mood === 'listening' ? (
        <ellipse cx="100" cy="138" rx="9" ry="11" fill="#2d3047" />
      ) : mood === 'thinking' ? (
        <path d="M86 138 L114 134" stroke="#2d3047" strokeWidth="6" strokeLinecap="round" />
      ) : (
        <path d="M82 132 Q100 150 118 132" stroke="#2d3047" strokeWidth="6" fill="none" strokeLinecap="round" />
      )}
      {mood === 'listening' && (
        <g opacity="0.6">
          <path d="M172 92 q10 12 0 24" stroke="#2d3047" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M182 84 q16 20 0 40" stroke="#2d3047" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      )}
      {layer('face')}
      {layer('head')}
      {layer('vehicle')}
      {/* little hands to hold things when there are no arms */}
      {holding && !hands.drawn && (
        <>
          <circle cx={hands.l[0]} cy={hands.l[1]} r="10" fill="var(--blob)" stroke={OUTLINE} strokeWidth="2" />
          <circle cx={hands.r[0]} cy={hands.r[1]} r="10" fill="var(--blob)" stroke={OUTLINE} strokeWidth="2" />
        </>
      )}
      {layer('hands')}
    </svg>
  );
}

const OUTLINE = 'rgb(0 0 0 / 0.14)';

/** Muscly arms. `flex` = double-biceps pose; otherwise arms rest at the sides. */
function Arms({ level, flex, thinking }: { level: number; flex: boolean; thinking: boolean }) {
  const w = 14 + level * 3.5; // arm thickness
  const bx = 8 + level * 4.6; // biceps size
  const by = 6 + level * 3.6;
  const fist = 9 + level * 1.8;
  const arm = (side: 1 | -1) => {
    const t = side === 1 ? undefined : 'translate(200 0) scale(-1 1)';
    if (flex)
      return (
        <g transform={t}>
          {/* upper arm out to the elbow, forearm up to the fist */}
          <path d="M36 112 L-2 100 L6 56" stroke={OUTLINE} strokeWidth={w + 3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M36 112 L-2 100 L6 56" stroke="var(--blob)" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <ellipse cx={14} cy={100 - by * 0.5} rx={bx} ry={by} fill="var(--blob)" stroke={OUTLINE} strokeWidth="2.5" transform={`rotate(-14 14 ${100 - by * 0.5})`} />
          <path d={`M${14 - bx * 0.5} ${100 - by * 0.85} q${bx * 0.5} ${-by * 0.5} ${bx} 0`} stroke="rgb(255 255 255 / 0.55)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx={6} cy={52} r={fist} fill="var(--blob)" stroke={OUTLINE} strokeWidth="2.5" />
        </g>
      );
    if (thinking && side === -1) return null;
    return (
      <g transform={t}>
        <path d="M38 122 Q22 140 26 162" stroke={OUTLINE} strokeWidth={w + 3} strokeLinecap="round" fill="none" />
        <path d="M38 122 Q22 140 26 162" stroke="var(--blob)" strokeWidth={w} strokeLinecap="round" fill="none" />
        <ellipse cx={28} cy={136} rx={by * 0.9} ry={bx * 0.9} fill="var(--blob)" stroke={OUTLINE} strokeWidth="2" />
        <circle cx={26} cy={164} r={fist * 0.9} fill="var(--blob)" stroke={OUTLINE} strokeWidth="2" />
      </g>
    );
  };
  return (
    <g data-muscle={level}>
      {arm(1)}
      {arm(-1)}
      {thinking && <path d="M150 130 Q175 120 150 100" stroke="var(--blob)" strokeWidth={w} strokeLinecap="round" fill="none" />}
    </g>
  );
}
