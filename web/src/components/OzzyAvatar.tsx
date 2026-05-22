// Jungle-monkey-with-a-mullet avatar for Ozzy. Pure SVG + CSS keyframes
// (see globals.css `.ozzy-*`). Idle bob, eye blinks, mullet sway, flower spin.
// Bumps to a faster bob when `speaking` is true.

export function OzzyAvatar({
  size = 28,
  speaking = false,
}: {
  size?: number;
  speaking?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`ozzy-root ${speaking ? "speaking" : ""}`}
      aria-label="Ozzy"
      role="img"
    >
      {/* Mullet back (long flowing hair behind the head) */}
      <g className="ozzy-mullet">
        <path
          d="M14 26 C 6 36, 8 52, 14 60 L 22 56 C 18 48, 20 38, 24 32 Z"
          fill="#7c3aed"
        />
        <path
          d="M50 26 C 58 36, 56 52, 50 60 L 42 56 C 46 48, 44 38, 40 32 Z"
          fill="#7c3aed"
        />
        {/* Teal streaks for hippie flair */}
        <path
          d="M16 38 C 14 46, 16 54, 18 58 L 22 56 C 20 50, 20 44, 22 40 Z"
          fill="#14b8a6"
        />
        <path
          d="M48 38 C 50 46, 48 54, 46 58 L 42 56 C 44 50, 44 44, 42 40 Z"
          fill="#14b8a6"
        />
      </g>

      {/* Ears */}
      <circle cx="13" cy="30" r="7" fill="#92400e" />
      <circle cx="13" cy="30" r="4" fill="#fbbf24" />
      <circle cx="51" cy="30" r="7" fill="#92400e" />
      <circle cx="51" cy="30" r="4" fill="#fbbf24" />

      {/* Head — outer face */}
      <ellipse cx="32" cy="34" rx="18" ry="19" fill="#92400e" />

      {/* Muzzle / inner face */}
      <ellipse cx="32" cy="38" rx="13" ry="13" fill="#fde68a" />

      {/* Mullet front — short spiky bangs on top */}
      <g className="ozzy-mullet">
        <path
          d="M16 22 L 20 14 L 22 22 L 26 12 L 28 22 L 32 10 L 36 22 L 38 12 L 42 22 L 44 14 L 48 22 C 44 24, 36 24, 32 24 C 28 24, 20 24, 16 22 Z"
          fill="#7c3aed"
        />
        <path
          d="M22 16 L 24 14 L 24 20 Z M 40 16 L 42 14 L 40 20 Z"
          fill="#14b8a6"
        />
      </g>

      {/* Eye whites */}
      <ellipse className="ozzy-eye" cx="25" cy="34" rx="3.4" ry="4" fill="#ffffff" />
      <ellipse className="ozzy-eye" cx="39" cy="34" rx="3.4" ry="4" fill="#ffffff" />
      {/* Pupils */}
      <circle cx="25.5" cy="34.5" r="1.6" fill="#1f2937" />
      <circle cx="39.5" cy="34.5" r="1.6" fill="#1f2937" />
      {/* Eye shine */}
      <circle cx="26.2" cy="33.5" r="0.6" fill="#ffffff" />
      <circle cx="40.2" cy="33.5" r="0.6" fill="#ffffff" />

      {/* Brows */}
      <path
        d="M21 29 Q 25 27, 29 29"
        stroke="#1f2937"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M35 29 Q 39 27, 43 29"
        stroke="#1f2937"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Nose */}
      <ellipse cx="32" cy="40" rx="1.6" ry="1.2" fill="#78350f" />

      {/* Mouth — open wider when speaking */}
      {speaking ? (
        <ellipse cx="32" cy="44.5" rx="3.2" ry="2.2" fill="#7c2d12" />
      ) : (
        <path
          d="M28 44 Q 32 47, 36 44"
          stroke="#7c2d12"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Hippie flower behind right ear */}
      <g className="ozzy-flower" transform="translate(54 22)">
        <circle cx="0" cy="-3" r="1.8" fill="#fbbf24" />
        <circle cx="2.6" cy="-1" r="1.8" fill="#fbbf24" />
        <circle cx="2" cy="2.4" r="1.8" fill="#fbbf24" />
        <circle cx="-2" cy="2.4" r="1.8" fill="#fbbf24" />
        <circle cx="-2.6" cy="-1" r="1.8" fill="#fbbf24" />
        <circle cx="0" cy="0" r="1.2" fill="#ffffff" />
      </g>
    </svg>
  );
}
