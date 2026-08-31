import React from 'react';

/**
 * BurnoutRiskGauge — an SVG semi-circular gauge that visually represents
 * the user's burnout risk score (0–100) with colour-coded segments.
 *
 * Props:
 *   score  – number (0–100)
 *   size   – optional pixel size (default 200)
 */
const RISK_COLORS = [
  { threshold: 15, fill: '#22c55e', label: 'Low' },          // green
  { threshold: 35, fill: '#84cc16', label: 'Moderate' },       // lime
  { threshold: 55, fill: '#eab308', label: 'Elevated' },       // yellow
  { threshold: 75, fill: '#f97316', label: 'High' },           // orange
  { threshold: 100, fill: '#ef4444', label: 'Critical' },      // red
];

const getRiskColor = (score) => {
  for (const tier of RISK_COLORS) {
    if (score <= tier.threshold) return tier.fill;
  }
  return RISK_COLORS[RISK_COLORS.length - 1].fill;
};

const getRiskLabel = (score) => {
  for (const tier of RISK_COLORS) {
    if (score <= tier.threshold) return tier.label;
  }
  return 'Critical';
};

export default function BurnoutRiskGauge({ score = 0, size = 200 }) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const radius = size * 0.38;
  const stroke = size * 0.08;
  const centre = size / 2;
  const circumference = Math.PI * radius; // semi-circle arc
  const fillLength = (clampedScore / 100) * circumference;
  const color = getRiskColor(clampedScore);
  const label = getRiskLabel(clampedScore);

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`Burnout risk: ${label}, score ${clampedScore} out of 100`}>
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
        {/* Background arc */}
        <path
          d={describeArc(centre, size * 0.54, radius, 180, 360)}
          fill="none"
          stroke="#374151"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={describeArc(centre, size * 0.54, radius, 180, 180 + (clampedScore / 100) * 180)}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
        />
        {/* Score text */}
        <text
          x={centre}
          y={size * 0.46}
          textAnchor="middle"
          className="font-bold"
          style={{ fontSize: size * 0.2, fill: color }}
        >
          {Math.round(clampedScore)}
        </text>
        <text
          x={centre}
          y={size * 0.56}
          textAnchor="middle"
          style={{ fontSize: size * 0.09, fill: '#9ca3af' }}
        >
          / 100
        </text>
      </svg>
      <span
        className="text-sm font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {label} Risk
      </span>
    </div>
  );
}

/**
 * Utility: generate SVG arc path data for a semicircular gauge.
 */
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}
