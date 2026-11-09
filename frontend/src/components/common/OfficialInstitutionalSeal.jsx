import React from 'react';

/**
 * OfficialInstitutionalSeal Component
 * Renders an enterprise embossed Gold & Royal Blue Institutional Seal
 * for official academic transcripts, graduation clearance certificates,
 * and certified report cards.
 */
export default function OfficialInstitutionalSeal({
  schoolName = "GBS INTERNATIONAL ACADEMY",
  academicYear = "2026-2027",
  certifiedBy = "Executive Headmaster",
  size = 140
}) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #0f172a 0%, #020617 80%)',
        border: '3px solid #d4af37',
        boxShadow: '0 8px 24px rgba(212, 175, 55, 0.35), inset 0 0 16px rgba(212, 175, 55, 0.3)',
        padding: '8px',
        userSelect: 'none',
        flexShrink: 0
      }}
      title={`Official Conferred Seal • ${schoolName}`}
    >
      {/* Outer Golden Starburst Ring */}
      <div
        style={{
          position: 'absolute',
          inset: '4px',
          borderRadius: '50%',
          border: '1.5px dashed rgba(212, 175, 55, 0.75)',
          pointerEvents: 'none'
        }}
      />

      {/* SVG Circular Seal Artwork */}
      <svg
        viewBox="0 0 200 200"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <path
            id="sealTopPath"
            d="M 25,100 A 75,75 0 0,1 175,100"
            fill="none"
          />
          <path
            id="sealBottomPath"
            d="M 175,100 A 75,75 0 0,1 25,100"
            fill="none"
          />
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#996515" />
          </linearGradient>
        </defs>

        {/* Top Text Arc */}
        <text
          fill="url(#goldGrad)"
          fontSize="11"
          fontWeight="900"
          letterSpacing="2"
          textAnchor="middle"
        >
          <textPath href="#sealTopPath" startOffset="50%">
            {String(schoolName).slice(0, 32).toUpperCase()}
          </textPath>
        </text>

        {/* Bottom Text Arc */}
        <text
          fill="url(#goldGrad)"
          fontSize="9.5"
          fontWeight="800"
          letterSpacing="1.5"
          textAnchor="middle"
        >
          <textPath href="#sealBottomPath" startOffset="50%">
            ★ SIGILLUM ACADEMICUM • {academicYear} ★
          </textPath>
        </text>

        {/* Center Crest Emblem & Shield */}
        <g transform="translate(100, 100)">
          {/* Inner Golden Ring */}
          <circle r="46" fill="rgba(2, 6, 23, 0.95)" stroke="url(#goldGrad)" strokeWidth="2" />
          <circle r="42" fill="none" stroke="rgba(212, 175, 55, 0.4)" strokeWidth="1" strokeDasharray="3,3" />

          {/* Academic Crest Crown & Shield */}
          <path
            d="M -18,-18 L 0,-26 L 18,-18 L 14,8 Q 0,22 -14,8 Z"
            fill="url(#goldGrad)"
            opacity="0.95"
          />
          <path
            d="M -15,-15 L 0,-22 L 15,-15 L 12,6 Q 0,18 -12,6 Z"
            fill="#091e42"
          />

          {/* Stars Inside Shield */}
          <polygon points="0,-14 3,-7 10,-7 5,-3 7,4 0,0 -7,4 -5,-3 -10,-7 -3,-7" fill="#fef08a" transform="scale(0.7)" />

          {/* Ribbon Stamped Label */}
          <rect x="-36" y="16" width="72" height="13" rx="3" fill="#d4af37" />
          <text x="0" y="25.5" fill="#020617" fontSize="7.5" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
            VERIFIED SEAL
          </text>
        </g>
      </svg>
    </div>
  );
}

