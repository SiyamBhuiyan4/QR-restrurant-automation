import React from 'react';

/**
 * MenuBookDogEar
 *
 * Interactive page-turn corner dog-ear for the menu book.
 * - Sits on top-right / bottom-right (for next page) and top-left / bottom-left (for prev page)
 * - Hover curls the corner up in 3D with realistic fold, cast shadow, and gold sheen
 * - Click/tap turns the page
 * - Accessible with keyboard focus and screen reader labels
 */
export default function MenuBookDogEar({
  corner = 'top-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  onClick,
  onHover,
  disabled = false,
  ariaLabel,
}) {
  const isRight = corner === 'top-right' || corner === 'bottom-right';
  const isBottom = corner === 'bottom-left' || corner === 'bottom-right';

  const defaultLabel = isRight ? 'Next page' : 'Previous page';
  const label = ariaLabel || defaultLabel;

  // Geometry for each corner (48 x 48 coordinate space)
  const renderGeometry = () => {
    switch (corner) {
      case 'top-right':
        return {
          shadowPath: 'M 14 0 L 48 34 L 48 0 Z',
          flapPath: 'M 14 0 Q 20 18 14 34 L 48 34 Q 30 18 14 0 Z',
          creaseLine: { x1: 14, y1: 0, x2: 48, y2: 34 },
          chevronPath: 'M 25 18 L 29 22 L 25 26',
        };
      case 'bottom-right':
        return {
          shadowPath: 'M 14 48 L 48 14 L 48 48 Z',
          flapPath: 'M 14 48 Q 20 30 14 14 L 48 14 Q 30 30 14 48 Z',
          creaseLine: { x1: 14, y1: 48, x2: 48, y2: 14 },
          chevronPath: 'M 25 30 L 29 26 L 25 22',
        };
      case 'top-left':
        return {
          shadowPath: 'M 34 0 L 0 34 L 0 0 Z',
          flapPath: 'M 34 0 Q 28 18 34 34 L 0 34 Q 18 18 34 0 Z',
          creaseLine: { x1: 0, y1: 34, x2: 34, y2: 0 },
          chevronPath: 'M 23 18 L 19 22 L 23 26',
        };
      case 'bottom-left':
      default:
        return {
          shadowPath: 'M 34 48 L 0 14 L 0 48 Z',
          flapPath: 'M 34 48 Q 28 30 34 14 L 0 14 Q 18 30 34 48 Z',
          creaseLine: { x1: 0, y1: 14, x2: 34, y2: 48 },
          chevronPath: 'M 23 30 L 19 26 L 23 22',
        };
    }
  };

  const geo = renderGeometry();

  const cornerClasses = {
    'top-right': 'top-0 right-0 rounded-tr-lg origin-top-right',
    'bottom-right': 'bottom-0 right-0 rounded-br-lg origin-bottom-right',
    'top-left': 'top-0 left-0 rounded-tl-lg origin-top-left',
    'bottom-left': 'bottom-0 left-0 rounded-bl-lg origin-bottom-left',
  }[corner];

  if (disabled) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onHover}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`mb-dogear mb-dogear--${corner} mb-dogear-pulse absolute z-25 w-12 h-12 p-0 bg-transparent border-0 cursor-pointer select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${cornerClasses}`}
    >
      <svg
        viewBox="0 0 48 48"
        className="w-full h-full overflow-visible transition-transform duration-300 ease-out group-hover:scale-115 group-active:scale-95"
        aria-hidden="true"
      >
        <defs>
          {/* Shadow beneath the curled flap */}
          <linearGradient id={`dogear-shadow-${corner}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          {/* Curled flap face: opulent parchment paper with soft gold sheen */}
          <linearGradient id={`dogear-flap-${corner}`} x1={isRight ? '100%' : '0%'} y1={isBottom ? '100%' : '0%'} x2={isRight ? '0%' : '100%'} y2={isBottom ? '0%' : '100%'}>
            <stop offset="0%" stopColor="#f5efe0" />
            <stop offset="45%" stopColor="#e8dcbe" />
            <stop offset="85%" stopColor="#d4af37" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8a6d1d" />
          </linearGradient>
        </defs>

        {/* Drop shadow on the page under the curl */}
        <path
          d={geo.shadowPath}
          fill={`url(#dogear-shadow-${corner})`}
          className="mb-dogear__shadow opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        />

        {/* The 3D curled paper corner flap */}
        <path
          d={geo.flapPath}
          fill={`url(#dogear-flap-${corner})`}
          className="mb-dogear__flap transition-all duration-300 ease-out drop-shadow-sm group-hover:drop-shadow-md"
        />

        {/* Golden crease fold edge */}
        <line
          x1={geo.creaseLine.x1}
          y1={geo.creaseLine.y1}
          x2={geo.creaseLine.x2}
          y2={geo.creaseLine.y2}
          stroke="#d4af37"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="opacity-90"
        />

        {/* Subtle navigation chevron on hover / high contrast on mobile */}
        <path
          d={geo.chevronPath}
          fill="none"
          stroke="#064e3b"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-dogear__chevron opacity-40 transition-opacity duration-300 group-hover:opacity-90"
        />
      </svg>
    </button>
  );
}
