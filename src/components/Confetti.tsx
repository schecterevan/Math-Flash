import { useMemo } from 'react';

const COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#118ab2', '#9b5de5', '#f15bb5'];

/** A short burst of confetti from the center. Re-mount (via key) to replay. */
export function Confetti({ count = 40 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const dist = 160 + Math.random() * 220;
        return {
          dx: `${Math.cos(angle) * dist}px`,
          dy: `${Math.sin(angle) * dist + 120}px`,
          rot: `${Math.random() * 720 - 360}deg`,
          color: COLORS[i % COLORS.length],
          delay: Math.random() * 0.1,
          w: 8 + Math.random() * 8,
          round: Math.random() > 0.5,
        };
      }),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-[40%]">
        {bits.map((b, i) => (
          <span
            key={i}
            className="absolute block"
            style={
              {
                width: b.w,
                height: b.round ? b.w : b.w * 0.5,
                background: b.color,
                borderRadius: b.round ? '50%' : 2,
                '--dx': b.dx,
                '--dy': b.dy,
                '--rot': b.rot,
                animation: `confetti-fall 1.1s ${b.delay}s cubic-bezier(.2,.6,.4,1) both`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
