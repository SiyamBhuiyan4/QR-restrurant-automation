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
