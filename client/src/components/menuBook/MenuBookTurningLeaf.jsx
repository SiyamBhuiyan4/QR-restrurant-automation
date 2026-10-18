import React from 'react';

/**
 * MenuBookTurningLeaf
 *
 * Renders the 3D dual-sided turning leaf during page turns.
 * Front face displays the leaving page.
 * Back face displays the arriving opposite page with rotateY(180deg).
 *
 * @param {object} props
 * @param {'next'|'prev'} props.direction
 * @param {object} props.frontPage - Page descriptor for the front face
 * @param {object} props.backPage  - Page descriptor for the back face
 * @param {function} props.renderPage - (page, side) => ReactNode
 * @param {function} [props.onAnimationEnd] - Callback when flip animation ends
 */
export default function MenuBookTurningLeaf({
  direction,
  frontPage,
  backPage,
  renderPage,
  onAnimationEnd,
}) {
  if (!direction) return null;

  const isNext = direction === 'next';
  const leafClass = isNext ? 'mb-leaf-next' : 'mb-leaf-prev';
  const frontSide = isNext ? 'right' : 'left';
  const backSide = isNext ? 'left' : 'right';

  return (
    <div
      className={`mb-flipping-leaf ${leafClass}`}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) {
          onAnimationEnd?.(e);
        }
      }}
    >
      <div className="mb-leaf-face mb-leaf-front">
        {renderPage(frontPage, frontSide)}
        <div className="mb-leaf-overlay" aria-hidden="true" />
      </div>
      <div className="mb-leaf-face mb-leaf-back">
        {renderPage(backPage, backSide)}
        <div className="mb-leaf-overlay" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * MenuBookDishLeaf
 *
 * The single sheet that turns when a diner taps a dish, and turns back when
 * they leave. It covers the whole page it sits in (its containing block is
 * `.mb-page`, which is transformed, so it escapes the page's scroll box) and
 * swings on the spine-side edge through just past 90deg - the only part of a
 * page turn you can actually see on a single leaf.
 *
 * Three stacked layers sell the paper:
 *   1. `__sweep`  - a soft shadow band travelling across the revealed page.
 *   2. `__under`  - the contact shadow that recedes with the turning edge.
 *   3. `__leaf`   - the sheet itself: lifts off the page, flexes, curls at its
 *                   free edge and catches a specular highlight.
 *
 * Purely decorative: `aria-hidden` and `pointer-events: none`, so the dish page
 * underneath stays reachable by pointer, keyboard and screen readers.
 *
 * @param {object} props
 * @param {'in'|'out'} props.direction 'in' reveals the dish page, 'out' covers it.
 * @param {number|string} props.turnId Changing this restarts the animation.
 * @param {string} [props.kicker] Small caps line on the sheet.
 * @param {string} [props.title]  Serif line on the sheet.
 * @param {number} [props.duration] Turn length in ms.
 */
export function MenuBookDishLeaf({
  direction = 'in',
  turnId = 0,
  kicker,
  title,
  duration,
}) {
  if (direction !== 'in' && direction !== 'out') return null;

  const style = Number.isFinite(duration) && duration > 0
    ? { '--mbd-flip-dur': `${duration}ms` }
    : undefined;

  return (
    <div
      className="mbd-flip"
      data-dir={direction}
      aria-hidden="true"
      style={style}
      key={`turn-${turnId}`}
    >
      <span className="mbd-flip__sweep" />
      <span className="mbd-flip__under" />

      <div className="mbd-flip__leaf">
        <div className="mbd-flip__face">
          <span className="mbd-flip__keyline" />
          <span className="mbd-flip__grain" />

          <div className="mbd-flip__plate">
            <span className="mbd-flip__orn">&#10087;</span>
            {kicker ? <span className="mbd-flip__kicker">{kicker}</span> : null}
            {title ? <span className="mbd-flip__title font-display">{title}</span> : null}
            <span className="mbd-flip__rule" />
          </div>

          <span className="mbd-flip__sheen" />
          <span className="mbd-flip__curl" />
          <span className="mbd-flip__spine-shade" />
        </div>
      </div>
    </div>
  );
}
