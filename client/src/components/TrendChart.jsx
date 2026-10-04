import { useId, useMemo, useState } from "react";
import { rgb } from "../lib/tokens";
import { HexSlab } from "./hx";

// Chart geometry (SVG units). The chart scales with its container.
const W = 520;
const H = 210;
const M = { left: 10, right: 12, top: 18, bottom: 26 };

/**
 * TrendChart
 * ----------
 * Spending pace for the viewed month: the running total of needs + wants (bills counted on their due
 * day, savings excluded) against the living budget. A dashed line shows an even pace across the
 * month. Hover or touch a day to read its total. Drawn with plain SVG, no chart library.
 */
export default function TrendChart({ summary, money, bare = false }) {
  const uid = useId().replace(/:/g, "");
  const { trend, isCurrent } = summary;
  const { days, today, cumulative, budget } = trend;
  const [hover, setHover] = useState(null); // 1-based day under the pointer

  const geometry = useMemo(() => {
    const last = cumulative[cumulative.length - 1] || 0;
    const maxY = Math.max(budget, last, 1) * 1.1;
    const x = (d) => M.left + ((d - 1) / Math.max(1, days - 1)) * (W - M.left - M.right);
    const y = (v) => M.top + (1 - v / maxY) * (H - M.top - M.bottom);
    const points = cumulative.map((v, i) => [x(i + 1), y(v)]);
    const line = points.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
    const area = points.length ? `${line} L${points[points.length - 1][0].toFixed(1)} ${y(0)} L${points[0][0].toFixed(1)} ${y(0)} Z` : "";
    return { x, y, points, line, area, last };
  }, [cumulative, budget, days]);

  const { x, y, points, line, area, last } = geometry;
  const shown = hover ?? today;
  const shownValue = cumulative[Math.min(shown, cumulative.length) - 1] ?? 0;
  const pct = budget > 0 ? Math.round((last / budget) * 100) : 0;
  const over = budget > 0 && last > budget;
  const ticks = [1, ...[8, 15, 22].filter((d) => d < days - 2), days];

  // Inside a popup the chart is drawn bare; on its own it sits on a slab.
  const Wrap = bare ? "div" : HexSlab;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const d = Math.round(((px - M.left) / (W - M.left - M.right)) * (days - 1)) + 1;
    setHover(Math.min(today, Math.max(1, d)));
  };

  return (
    <Wrap data-tour="trend" className="h-full">
      <div className={bare ? "" : "px-12 py-6"}>
        {!bare && <h3 className="text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-soft">Spending pace</h3>}
        {budget <= 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">{isCurrent ? "Add this month's earnings to see your pace." : "No earnings that month, so there is no budget to compare."}</p>
        ) : (
          <>
            <p className="mt-1.5 font-mono text-sm">
              <span className={over ? "text-rose-deep" : ""}>{money(shownValue)}</span>
              <span className="text-ink-soft"> by day {shown}</span>
            </p>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="mt-2 w-full touch-none overflow-visible"
              role="img"
              aria-label={`Spent ${money(last)} of a ${money(budget)} living budget, ${pct} percent, by day ${today} of ${days}.`}
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: rgb(over ? "rose" : "accent"), stopOpacity: 0.35 }} />
                  <stop offset="1" style={{ stopColor: rgb(over ? "rose" : "accent"), stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              {/* Budget cap and even-pace line */}
              <line x1={M.left} x2={W - M.right} y1={y(budget)} y2={y(budget)} style={{ stroke: rgb("ink", 0.35) }} strokeWidth="1" />
              <text x={W - M.right} y={y(budget) - 5} textAnchor="end" className="fill-ink-soft" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
                BUDGET {money(budget)}
              </text>
              <line x1={x(1)} y1={y(0)} x2={x(days)} y2={y(budget)} style={{ stroke: rgb("ink", 0.4) }} strokeWidth="1" strokeDasharray="4 5" />
              <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} style={{ stroke: rgb("ink", 0.2) }} strokeWidth="1" />

              {area && <path d={area} fill={`url(#fill-${uid})`} />}
              {line && <path key={line} d={line} pathLength="1" fill="none" style={{ stroke: rgb(over ? "rose-deep" : "accent"), "--len": 1 }} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="anim-draw" />}

              {/* Selected day marker */}
              {points[shown - 1] && (
                <g>
                  <line x1={points[shown - 1][0]} x2={points[shown - 1][0]} y1={M.top} y2={y(0)} style={{ stroke: rgb("ink", 0.25) }} strokeWidth="1" strokeDasharray="2 4" />
                  <circle cx={points[shown - 1][0]} cy={points[shown - 1][1]} r="4.5" style={{ fill: rgb(over ? "rose-deep" : "accent"), stroke: rgb("surface") }} strokeWidth="2" />
                </g>
              )}

              {ticks.map((d) => (
                <text key={d} x={x(d)} y={H - 6} textAnchor="middle" className="fill-ink-soft" style={{ fontSize: 10 }}>
                  {d}
                </text>
              ))}
            </svg>
            <p className="mt-1 text-[12px] text-ink-soft">
              {money(last)} of {money(budget)} living budget ({pct}%). Bills count on their due day. Dashed line: an even pace.
            </p>
          </>
        )}
      </div>
    </Wrap>
  );
}
