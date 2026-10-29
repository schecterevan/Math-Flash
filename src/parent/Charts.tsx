// Small hand-rolled SVG charts (single series each, native tooltips on hover).

const INK2 = '#52514e';
const GRID = '#e6e6e3';
const SERIES = '#2a78d6';

export function BarChart({
  data,
  format,
  height = 160,
}: {
  data: { label: string; value: number; tip: string }[];
  format: (v: number) => string;
  height?: number;
}) {
  const W = 640;
  const H = height;
  const padL = 36;
  const padB = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const bw = (W - padL) / data.length;
  const y = (v: number) => H - padB - (v / nice) * (H - padB - 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W} y1={y(nice * t)} y2={y(nice * t)} stroke={GRID} />
          <text x={padL - 6} y={y(nice * t) + 4} textAnchor="end" fontSize={11} fill={INK2}>
            {format(nice * t)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const h = Math.max(0, y(0) - y(d.value));
        const x = padL + i * bw + 3;
        const w = Math.max(2, bw - 6);
        return (
          <g key={i}>
            <rect x={padL + i * bw} y={0} width={bw} height={H - padB} fill="transparent">
              <title>{d.tip}</title>
            </rect>
            {d.value > 0 && (
              <path
                d={`M${x} ${y(0)} V${y(0) - h + Math.min(4, h)} q0 -${Math.min(4, h)} ${Math.min(4, w / 2)} -${Math.min(4, h)} H${x + w - Math.min(4, w / 2)} q${Math.min(4, w / 2)} 0 ${Math.min(4, w / 2)} ${Math.min(4, h)} V${y(0)} Z`}
                fill={SERIES}
                pointerEvents="none"
              />
            )}
            {(i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) && (
              <text x={padL + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={INK2}>
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({
  data,
  height = 160,
}: {
  data: { label: string; value: number; tip: string }[];
  height?: number;
}) {
  const W = 640;
  const H = height;
  const padL = 40;
  const padB = 24;
  const n = data.length;
  const x = (i: number) => padL + 8 + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - 20));
  const y = (v: number) => H - padB - v * (H - padB - 12);
  if (!n) return <p className="py-8 text-center text-sm opacity-60">No sessions yet.</p>;
  const d = data.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.value)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke={GRID} />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={INK2}>
            {Math.round(t * 100)}%
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" />
      {data.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={4.5} fill={SERIES} stroke="#fff" strokeWidth={2} />
          <circle cx={x(i)} cy={y(p.value)} r={14} fill="transparent">
            <title>{p.tip}</title>
          </circle>
          {(i === 0 || i === n - 1 || (i % Math.ceil(n / 6) === 0 && n - 1 - i >= Math.ceil(n / 6) / 2)) && (
            <text x={x(i)} y={H - 6} textAnchor={i === n - 1 && n > 1 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize={11} fill={INK2}>
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function niceMax(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
