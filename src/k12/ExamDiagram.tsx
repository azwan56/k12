import React, { useId } from 'react';
import type { ExamDiagramSpec } from '../data/igMathG6ExamGenerator';

function StraightLineDiagram({
  leftLabel,
  rightLabel,
  rayAngleDeg,
  markerId,
}: {
  leftLabel: string;
  rightLabel: string;
  rayAngleDeg: number;
  markerId: string;
}) {
  const vx = 160;
  const vy = 108;
  const clamped = Math.max(25, Math.min(155, rayAngleDeg));
  const rad = (clamped * Math.PI) / 180;
  // Angle measured from LEFT horizontal ray upward: clamped=45 means ray goes up-left
  const r = 78;
  const rx = vx - r * Math.cos(rad);
  const ry = vy - r * Math.sin(rad);

  const leftTextX = vx - 38;
  const rightTextX = vx + 42;
  const labelY = vy - 18;

  return (
    <svg viewBox="0 0 320 135" className="w-full max-w-xs mx-auto select-none" role="img" aria-label={`直线上相邻角：左侧 ${leftLabel}，右侧 ${rightLabel}`}>
      <defs>
        <marker id={`${markerId}-end`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b" />
        </marker>
      </defs>
      {/* Straight base line */}
      <line
        x1="28"
        y1={vy}
        x2="292"
        y2={vy}
        stroke="#1e293b"
        strokeWidth="2.5"
        markerStart={`url(#${markerId}-end)`}
        markerEnd={`url(#${markerId}-end)`}
      />
      {/* Ray from vertex */}
      <line
        x1={vx}
        y1={vy}
        x2={rx}
        y2={ry}
        stroke="#1e293b"
        strokeWidth="2.5"
        markerEnd={`url(#${markerId}-end)`}
      />
      <circle cx={vx} cy={vy} r="3.5" fill="#1e293b" />
      <text x={leftTextX} y={labelY} textAnchor="middle" className="fill-slate-900 font-black text-xs">
        {leftLabel}
      </text>
      <text x={rightTextX} y={labelY} textAnchor="middle" className="fill-slate-900 font-black text-xs">
        {rightLabel}
      </text>
    </svg>
  );
}

function RightAngleDiagram({
  topLabel,
  bottomLabel,
  rayAngleDeg,
  markerId,
}: {
  topLabel: string;
  bottomLabel: string;
  rayAngleDeg: number;
  markerId: string;
}) {
  const vx = 84;
  const vy = 112;
  const clamped = Math.max(20, Math.min(70, rayAngleDeg));
  const rad = (clamped * Math.PI) / 180;
  const len = 96;
  const rx = vx + len * Math.cos(rad);
  const ry = vy - len * Math.sin(rad);

  return (
    <svg viewBox="0 0 280 135" className="w-full max-w-xs mx-auto select-none" role="img" aria-label={`直角内部两角：上方 ${topLabel}，下方 ${bottomLabel}`}>
      <defs>
        <marker id={`${markerId}-arrow`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b" />
        </marker>
      </defs>
      {/* Vertical & horizontal perpendicular arms */}
      <line x1={vx} y1={vy} x2={vx} y2="20" stroke="#1e293b" strokeWidth="2.5" markerEnd={`url(#${markerId}-arrow)`} />
      <line x1={vx} y1={vy} x2="230" y2={vy} stroke="#1e293b" strokeWidth="2.5" markerEnd={`url(#${markerId}-arrow)`} />
      {/* Right-angle corner square */}
      <polyline points={`${vx},${vy - 14} ${vx + 14},${vy - 14} ${vx + 14},${vy}`} fill="none" stroke="#1e293b" strokeWidth="2" />
      {/* Interior dividing ray */}
      <line x1={vx} y1={vy} x2={rx} y2={ry} stroke="#2563eb" strokeWidth="2.5" markerEnd={`url(#${markerId}-arrow)`} />
      <circle cx={vx} cy={vy} r="3.5" fill="#1e293b" />
      <text x={vx + 26} y={vy - 54} className="fill-slate-900 font-black text-xs">
        {topLabel}
      </text>
      <text x={vx + 62} y={vy - 16} className="fill-slate-900 font-black text-xs">
        {bottomLabel}
      </text>
    </svg>
  );
}

function VerticalAnglesDiagram({
  leftLabel,
  rightLabel,
  topLabel,
  bottomLabel,
  markerId,
}: {
  leftLabel: string;
  rightLabel: string;
  topLabel?: string;
  bottomLabel?: string;
  markerId: string;
}) {
  const cx = 160;
  const cy = 72;
  return (
    <svg viewBox="0 0 320 144" className="w-full max-w-xs mx-auto select-none" role="img" aria-label="两条直线相交形成的对顶角与邻补角图形">
      <defs>
        <marker id={`${markerId}-v`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b" />
        </marker>
      </defs>
      <line x1="48" y1="30" x2="272" y2="114" stroke="#1e293b" strokeWidth="2.5" markerStart={`url(#${markerId}-v)`} markerEnd={`url(#${markerId}-v)`} />
      <line x1="60" y1="118" x2="260" y2="26" stroke="#1e293b" strokeWidth="2.5" markerStart={`url(#${markerId}-v)`} markerEnd={`url(#${markerId}-v)`} />
      <circle cx={cx} cy={cy} r="3.5" fill="#1e293b" />
      {leftLabel && (
        <text x={cx - 48} y={cy + 4} textAnchor="middle" className="fill-slate-900 font-black text-xs">
          {leftLabel}
        </text>
      )}
      {rightLabel && (
        <text x={cx + 48} y={cy + 4} textAnchor="middle" className="fill-slate-900 font-black text-xs">
          {rightLabel}
        </text>
      )}
      {topLabel && (
        <text x={cx} y={cy - 26} textAnchor="middle" className="fill-slate-900 font-black text-xs">
          {topLabel}
        </text>
      )}
      {bottomLabel && (
        <text x={cx} y={cy + 34} textAnchor="middle" className="fill-slate-900 font-black text-xs">
          {bottomLabel}
        </text>
      )}
    </svg>
  );
}

function NumberLineDiagram({
  min,
  max,
  step,
  variableLabel,
  mode,
  start,
  startInclusive,
  end,
  endInclusive,
  markerId,
}: Extract<ExamDiagramSpec, { kind: 'number_line' }> & { markerId: string }) {
  const padL = 34;
  const padR = 34;
  const width = 400;
  const axisY = 62;
  const lineY = 36;
  const span = Math.max(1, max - min);
  const xFor = (val: number) => padL + ((val - min) / span) * (width - padL - padR);

  const ticks: number[] = [];
  for (let v = min; v <= max; v += Math.max(1, step)) {
    ticks.push(v);
  }

  const xStart = xFor(start);
  const xEnd = end !== undefined ? xFor(end) : xStart;

  return (
    <svg viewBox="0 0 400 94" className="w-full max-w-md mx-auto select-none" role="img" aria-label={`数轴图：范围 ${min} 到 ${max}`}>
      <defs>
        <marker id={`${markerId}-axis`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b" />
        </marker>
        <marker id={`${markerId}-red`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626" />
        </marker>
      </defs>

      {/* Main black number line */}
      <line
        x1="14"
        y1={axisY}
        x2={width - 14}
        y2={axisY}
        stroke="#1e293b"
        strokeWidth="2.2"
        markerStart={`url(#${markerId}-axis)`}
        markerEnd={`url(#${markerId}-axis)`}
      />

      {ticks.map((v) => {
        const x = xFor(v);
        return (
          <g key={v}>
            <line x1={x} y1={axisY - 5} x2={x} y2={axisY + 5} stroke="#1e293b" strokeWidth="1.8" />
            <text x={x} y={axisY + 20} textAnchor="middle" className="fill-slate-800 font-bold text-[11px]">
              {v}
            </text>
          </g>
        );
      })}

      {/* Inequality overlay in red */}
      {mode === 'ray_left' && (
        <>
          <line
            x1={xStart}
            y1={lineY}
            x2="20"
            y2={lineY}
            stroke="#dc2626"
            strokeWidth="3"
            markerEnd={`url(#${markerId}-red)`}
          />
          <line x1={xStart} y1={lineY} x2={xStart} y2={axisY} stroke="#dc2626" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle
            cx={xStart}
            cy={lineY}
            r="5"
            fill={startInclusive ? '#dc2626' : '#ffffff'}
            stroke="#dc2626"
            strokeWidth="2.8"
          />
          <text x={xStart} y={lineY - 11} textAnchor="middle" className="fill-red-700 font-black text-xs italic">
            {variableLabel}
          </text>
        </>
      )}

      {mode === 'ray_right' && (
        <>
          <line
            x1={xStart}
            y1={lineY}
            x2={width - 20}
            y2={lineY}
            stroke="#dc2626"
            strokeWidth="3"
            markerEnd={`url(#${markerId}-red)`}
          />
          <line x1={xStart} y1={lineY} x2={xStart} y2={axisY} stroke="#dc2626" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle
            cx={xStart}
            cy={lineY}
            r="5"
            fill={startInclusive ? '#dc2626' : '#ffffff'}
            stroke="#dc2626"
            strokeWidth="2.8"
          />
          <text x={xStart} y={lineY - 11} textAnchor="middle" className="fill-red-700 font-black text-xs italic">
            {variableLabel}
          </text>
        </>
      )}

      {mode === 'between' && end !== undefined && (
        <>
          <line x1={xStart} y1={lineY} x2={xEnd} y2={lineY} stroke="#dc2626" strokeWidth="3" />
          <line x1={xStart} y1={lineY} x2={xStart} y2={axisY} stroke="#dc2626" strokeWidth="1.2" strokeDasharray="3 3" />
          <line x1={xEnd} y1={lineY} x2={xEnd} y2={axisY} stroke="#dc2626" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle
            cx={xStart}
            cy={lineY}
            r="5"
            fill={startInclusive ? '#dc2626' : '#ffffff'}
            stroke="#dc2626"
            strokeWidth="2.8"
          />
          <circle
            cx={xEnd}
            cy={lineY}
            r="5"
            fill={endInclusive ? '#dc2626' : '#ffffff'}
            stroke="#dc2626"
            strokeWidth="2.8"
          />
          <text
            x={(xStart + xEnd) / 2}
            y={lineY - 11}
            textAnchor="middle"
            className="fill-red-700 font-black text-xs italic"
          >
            {variableLabel}
          </text>
        </>
      )}
    </svg>
  );
}

function ScaleMapDiagram({
  scaleText,
  fromLabel,
  toLabel,
  distanceLabel,
  direction,
  markerId,
}: Extract<ExamDiagramSpec, { kind: 'scale_map' }> & { markerId: string }) {
  const pts: Record<
    Extract<ExamDiagramSpec, { kind: 'scale_map' }>['direction'],
    { x1: number; y1: number; x2: number; y2: number }
  > = {
    east: { x1: 88, y1: 72, x2: 242, y2: 72 },
    west: { x1: 242, y1: 72, x2: 88, y2: 72 },
    south: { x1: 165, y1: 36, x2: 165, y2: 106 },
    north: { x1: 165, y1: 106, x2: 165, y2: 36 },
    southeast: { x1: 96, y1: 42, x2: 234, y2: 100 },
  };
  const { x1, y1, x2, y2 } = pts[direction];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <div className="space-y-2">
      <svg viewBox="0 0 320 128" className="w-full max-w-xs mx-auto select-none" role="img" aria-label={`地图比例尺示意：${scaleText}，${fromLabel} 到 ${toLabel} 图上距离 ${distanceLabel}`}>
        <defs>
          <marker id={`${markerId}-n`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b" />
          </marker>
        </defs>

        {/* North compass */}
        <line x1="28" y1="48" x2="28" y2="18" stroke="#1e293b" strokeWidth="2" markerEnd={`url(#${markerId}-n)`} />
        <text x="28" y="13" textAnchor="middle" className="fill-slate-900 font-black text-[11px]">
          N
        </text>

        {/* Map segment */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2563eb" strokeWidth="2.5" strokeDasharray="5 4" />
        <circle cx={x1} cy={y1} r="4.5" fill="#1e293b" />
        <circle cx={x2} cy={y2} r="4.5" fill="#dc2626" />

        <text
          x={x1}
          y={y1 <= y2 ? y1 - 10 : y1 + 16}
          textAnchor="middle"
          className="fill-slate-900 font-black text-xs"
        >
          {fromLabel}
        </text>
        <text
          x={x2}
          y={y2 < y1 ? y2 - 10 : y2 + 16}
          textAnchor="middle"
          className="fill-rose-700 font-black text-xs"
        >
          {toLabel}
        </text>
        <rect x={mx - 28} y={my - 11} width="56" height="19" rx="6" fill="#fef08a" stroke="#1e293b" strokeWidth="1.5" />
        <text x={mx} y={my + 2} textAnchor="middle" className="fill-slate-900 font-black text-[11px]">
          {distanceLabel}
        </text>
      </svg>
      <div className="text-center">
        <span className="inline-block px-3 py-0.5 rounded-full border-2 border-ink bg-yellow-200 text-xs font-black text-ink">
          {scaleText}
        </span>
      </div>
    </div>
  );
}

export default function ExamDiagram({ spec }: { spec: ExamDiagramSpec }) {
  const uid = useId().replace(/:/g, '');
  return (
    <div className="bg-slate-50 border-2 border-ink rounded-2xl p-3 my-4">
      {spec.kind === 'straight_line' && <StraightLineDiagram {...spec} markerId={uid} />}
      {spec.kind === 'right_angle' && <RightAngleDiagram {...spec} markerId={uid} />}
      {spec.kind === 'vertical_angles' && <VerticalAnglesDiagram {...spec} markerId={uid} />}
      {spec.kind === 'number_line' && <NumberLineDiagram {...spec} markerId={uid} />}
      {spec.kind === 'scale_map' && <ScaleMapDiagram {...spec} markerId={uid} />}
    </div>
  );
}
