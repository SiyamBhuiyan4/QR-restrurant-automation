import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../../styles/menu-book-hover-preview.css';

/**
 * DishHoverPreview
 *
 * The menu book's listing is type-only: no photos anywhere in the rows. This is
 * the one place a dish photo appears -- a small floating vintage-paper card that
 * shows up INSTANTLY while the pointer rests on a row, and vanishes the moment
 * it leaves (the parent simply stops passing a `dish`).
 *
 * Props
 *   dish       -- the hovered dish object, or null/undefined for "nothing hovered".
 *   anchorRect -- the hovered row's viewport rect (a DOMRect, or any plain object
 *                 with top/left/right/bottom, as from getBoundingClientRect()).
 *
 * Renders nothing when `dish` is empty, and nothing at all on touch / no-hover
 * devices. It is `pointer-events: none` and portalled to <body>, so it can never
 * swallow a click meant for the row underneath nor be clipped by the book's 3D
 * transforms.
 */

/* Card geometry, kept in step with menu-book-hover-preview.css. Used only for
   the very first positioning pass; the real measured size takes over in a
   layout effect, before the browser paints. */
const CARD_W = 212;
const CARD_H = 182;
const CARD_W_SM = 176;
const CARD_H_SM = 158;
const SMALL_SCREEN = 480;

/* Distance from the anchor row, and the minimum breathing room we keep between
   the card and any viewport edge. */
const GAP = 14;
const MARGIN = 8;

function matches(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(query).matches;
  } catch (_) {
    return false;
  }
}

/* Touch devices have no hover at all, so the preview must never exist there. */
function useHasHover() {
  const [hasHover, setHasHover] = useState(() => !matches('(hover: none)'));

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    let mql;
    try {
      mql = window.matchMedia('(hover: none)');
    } catch (_) {
      return undefined;
    }
    const sync = () => setHasHover(!mql.matches);
    sync();
    // Safari < 14 only has the deprecated addListener/removeListener pair.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', sync);
      return () => mql.removeEventListener('change', sync);
    }
    if (typeof mql.addListener === 'function') {
      mql.addListener(sync);
      return () => mql.removeListener(sync);
    }
    return undefined;
  }, []);

  return hasHover;
}

/* First usable photo URL out of the shapes the API has used over time:
   image | imageUrl | img | photo | images[0] (string, or {url|src|image|...}). */
export function dishPhotoUrl(dish) {
  if (!dish) return null;

  const pick = (value) => {
    if (typeof value !== 'string') return null;
    const url = value.trim();
    return url ? url : null;
  };

  const direct = pick(dish.image) || pick(dish.imageUrl) || pick(dish.img) || pick(dish.photo);
  if (direct) return direct;

  const list = Array.isArray(dish.images) ? dish.images : null;
  const first = list && list.length ? list[0] : null;
  if (!first) return null;
  if (typeof first === 'string') return pick(first);
  if (typeof first === 'object') {
    return (
      pick(first.url) ||
      pick(first.src) ||
      pick(first.image) ||
      pick(first.imageUrl) ||
      pick(first.photo) ||
      null
    );
  }
  return null;
}

function dishName(dish) {
  if (!dish) return '';
  const raw = dish.name ?? dish.title ?? dish.label ?? '';
  return typeof raw === 'string' ? raw.trim() : String(raw);
}

/**
 * Place the card beside the anchor, always fully inside the viewport.
 *
 * Horizontally it prefers the anchor's right side and flips to the left side
 * when it would run past the right edge (and back again if the left side is
 * even tighter). Vertically it prefers to hang down from the anchor's top and
 * flips to sit above the anchor's bottom when it would run off the bottom.
 * Whatever is left over is clamped, so the card never overflows a screen edge.
 */
export function computePosition(rect, size, viewport) {
  const vw = viewport.width;
  const vh = viewport.height;
  const w = size.width;
  const h = size.height;

  const clamp = (value, min, max) => (max < min ? min : Math.min(Math.max(value, min), max));

  // ---- horizontal: right of the anchor, flipped to the left near the edge ----
  const rightSide = rect.right + GAP;
  const leftSide = rect.left - GAP - w;
  const fitsRight = rightSide + w <= vw - MARGIN;
  const fitsLeft = leftSide >= MARGIN;

  let left;
  let placement;
  if (fitsRight) {
    left = rightSide;
    placement = 'right';
  } else if (fitsLeft) {
    left = leftSide;
    placement = 'left';
  } else {
    // Neither side fits: keep the roomier one and clamp into view.
    const roomRight = vw - MARGIN - rightSide;
    const roomLeft = rect.left - GAP - MARGIN;
    placement = roomLeft > roomRight ? 'left' : 'right';
    left = placement === 'left' ? leftSide : rightSide;
  }
  left = clamp(left, MARGIN, vw - MARGIN - w);

  // ---- vertical: top-aligned, flipped above the anchor near the bottom ----
  const below = rect.top;
  const above = rect.bottom - h;
  let top;
  let vPlacement;
  if (below + h <= vh - MARGIN) {
    top = below;
    vPlacement = 'below';
  } else if (above >= MARGIN) {
    top = above;
    vPlacement = 'above';
  } else {
    // Taller than the space either way: centre on the anchor, then clamp.
    top = rect.top + (rect.bottom - rect.top) / 2 - h / 2;
    vPlacement = 'center';
  }
  top = clamp(top, MARGIN, vh - MARGIN - h);

  return { left: Math.round(left), top: Math.round(top), placement, vPlacement };
}

function normalizeRect(anchorRect, viewport) {
  if (anchorRect && typeof anchorRect === 'object') {
    const top = Number(anchorRect.top);
    const left = Number(anchorRect.left);
    if (Number.isFinite(top) && Number.isFinite(left)) {
      const width = Number.isFinite(Number(anchorRect.width))
        ? Number(anchorRect.width)
        : Number(anchorRect.right) - left;
      const height = Number.isFinite(Number(anchorRect.height))
        ? Number(anchorRect.height)
        : Number(anchorRect.bottom) - top;
      const right = Number.isFinite(Number(anchorRect.right))
        ? Number(anchorRect.right)
        : left + (Number.isFinite(width) ? width : 0);
      const bottom = Number.isFinite(Number(anchorRect.bottom))
        ? Number(anchorRect.bottom)
        : top + (Number.isFinite(height) ? height : 0);
      return { top, left, right, bottom };
    }
  }
  // No usable anchor: park the card in the middle of the viewport rather than
  // flashing it at 0,0 in the corner.
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  return { top: cy, left: cx, right: cx, bottom: cy };
}

export default function DishHoverPreview({ dish, anchorRect }) {
  const hasHover = useHasHover();
  const cardRef = useRef(null);

  const photo = useMemo(() => dishPhotoUrl(dish), [dish]);
  const name = useMemo(() => dishName(dish), [dish]);

  // A broken URL falls back to a name-only card. Reset whenever the photo changes.
  const [failedSrc, setFailedSrc] = useState(null);
  const showPhoto = Boolean(photo) && failedSrc !== photo;

  const [size, setSize] = useState(null);

  // Measure the real card before the browser paints, so the first frame the user
  // sees is already in its final, clamped position (no visible jump).
  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setSize((prev) => {
      if (prev && Math.abs(prev.width - rect.width) < 1 && Math.abs(prev.height - rect.height) < 1) {
        return prev;
      }
      return { width: rect.width, height: rect.height };
    });
  }, [dish, photo, showPhoto, name, anchorRect]);

  if (!hasHover) return null;
  if (!dish) return null;
  if (!name && !showPhoto) return null;
  if (typeof document === 'undefined') return null;

  const viewport = {
    width: window.innerWidth || document.documentElement.clientWidth || 0,
    height: window.innerHeight || document.documentElement.clientHeight || 0,
  };
  const small = viewport.width > 0 && viewport.width <= SMALL_SCREEN;
  const estimate = showPhoto
    ? { width: small ? CARD_W_SM : CARD_W, height: small ? CARD_H_SM : CARD_H }
    : { width: 150, height: 34 };
  const measured = size || estimate;

  const rect = normalizeRect(anchorRect, viewport);
  const pos = computePosition(rect, measured, viewport);

  const card = (
    <div
      ref={cardRef}
      className={`mb-dhp${showPhoto ? '' : ' mb-dhp--text-only'}`}
      style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
      data-placement={pos.placement}
      data-v-placement={pos.vPlacement}
      aria-hidden="true"
      role="presentation"
    >
      {showPhoto ? (
        <span className="mb-dhp__frame">
          <img
            className="mb-dhp__img"
            src={photo}
            alt=""
            draggable="false"
            decoding="async"
            onError={() => setFailedSrc(photo)}
          />
        </span>
      ) : null}
      {name ? <span className="mb-dhp__name">{name}</span> : null}
    </div>
  );

  // Portalled to <body>: the book's pages sit inside 3D-transformed ancestors,
  // which would otherwise become the containing block for position: fixed.
  return createPortal(card, document.body);
}
