import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/menu-book-detail.css';

/**
 * One dish rendered as a page of the open menu book: photo, name, description,
 * ingredients (when the dish has any) and price, with "Order Now" and
 * "Back to menu". Every field access is guarded, so partial dishes still render.
 *
 * Contract: onAddToCart(dish, qty) — the parent repeats its own add for qty.
 */

const CURRENCY = '$';

function pickImage(item) {
  const direct = item.image || item.imageUrl || item.img || item.photo;
  if (typeof direct === 'string' && direct) return direct;
  if (Array.isArray(item.images)) {
    const first = item.images.find((src) => typeof src === 'string' && src);
    if (first) return first;
  }
  return null;
}

function formatPrice(value) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(num)) return '';
  return `${CURRENCY}${num.toFixed(2)}`;
}

/** Accepts an array of strings/objects or a comma-separated string. */
function readIngredients(item) {
  const raw = item.ingredients;
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => (typeof entry === 'string' ? entry : entry?.name || entry?.label || ''))
      .map((text) => String(text).trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,\n•|]/)
      .map((text) => text.trim())
      .filter(Boolean);
  }
  return [];
}

function hasTag(item, pattern) {
  return Array.isArray(item.tags) && item.tags.some((tag) => pattern.test(String(tag)));
}

export default function MenuBookDetail({ dish, cartQuantity = 0, onAddToCart, onBack }) {
  const item = dish || {};
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef(null);

  const image = pickImage(item);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // A different dish on the same page starts fresh.
  useEffect(() => {
    setImageError(false);
    setJustAdded(false);
  }, [item.id, image]);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const handleBack = useCallback(() => {
    if (typeof onBack === 'function') onBack();
  }, [onBack]);

  // Escape closes the dish page the same way "Back to menu" does.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBack]);

  const handleAdd = useCallback(() => {
    if (typeof onAddToCart === 'function') onAddToCart(dish, 1);
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1600);
  }, [dish, onAddToCart]);

  const name = item.name || item.title || 'Untitled dish';
  const category = item.category || item.sectionTitle || 'Menu';
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const price = formatPrice(item.price);
  const ingredients = useMemo(() => readIngredients(item), [item]);
  const isVeg = item.isVeg === true || item.veg === true || hasTag(item, /veg/i);
  const isSpicy = item.isSpicy === true || item.spicy === true || hasTag(item, /spic/i);
  const qty = Number(cartQuantity) || 0;
  const showImage = Boolean(image) && !imageError;

  return (
    <article className={`mbd${mounted ? ' is-mounted' : ''}`} aria-label={name}>
      <button type="button" onClick={handleBack} className="mbd__back-top">
        <span aria-hidden="true">&#8592;</span> Back to menu
      </button>

      <p className="mbd__eyebrow">{category}</p>
      <h2 className="mbd__title font-display">{name}</h2>

      <div className="mbd__divider" aria-hidden="true">
        <span className="mbd__diamond">&#10022;</span>
      </div>

      {showImage && (
        <figure className="mbd__figure">
          <img
            src={image}
            alt={name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="mbd__photo"
          />
        </figure>
      )}

      {(isVeg || isSpicy) && (
        <div className="mbd__badges">
          {isVeg && <span className="mbd__badge">Veg</span>}
          {isSpicy && <span className="mbd__badge">Spicy</span>}
        </div>
      )}

      {description && <p className="mbd__desc">{description}</p>}

      {ingredients.length > 0 && (
        <section className="mbd__section">
          <h3 className="mbd__label font-display">Ingredients</h3>
          <ul className="mbd__ingredients">
            {ingredients.map((ingredient, index) => (
              <li key={`${ingredient}-${index}`} className="mbd__ingredient">
                {ingredient}
              </li>
            ))}
          </ul>
        </section>
      )}

      {price && (
        <p className="mbd__price-row">
          <span className="mbd__price-label">Price</span>
          <span className="mbd__leader" aria-hidden="true" />
          <span className="mbd__price font-display">{price}</span>
        </p>
      )}

      {qty > 0 && (
        <p className="mbd__in-order">
          In your order: {qty}
        </p>
      )}

      <div className="mbd__actions">
        <button
          type="button"
          onClick={handleAdd}
          className={`mbd__order${justAdded ? ' is-added' : ''}`}
        >
          {justAdded ? 'Added to order ✓' : 'Order Now'}
        </button>
        <button type="button" onClick={handleBack} className="mbd__back">
          Back to menu
        </button>
      </div>

      <span className="sr-only" aria-live="polite">
        {qty > 0 ? `${qty} in your order` : ''}
      </span>
    </article>
  );
}
