import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Minus,
  Check,
  Sparkles,
  ShoppingBag,
  Leaf,
  Flame,
  Star,
  Utensils,
  Play,
  Pause,
  Video,
  Volume2,
  VolumeX
} from 'lucide-react';
import { MenuBookDishLeaf } from './MenuBookTurningLeaf.jsx';
import { useDishPageFlip, DISH_FLIP_IN_MS, DISH_FLIP_OUT_MS } from './useBookFlip3D.js';
import '../../styles/menu-book-detail.css';

/**
 * MenuBookDetail
 *
 * The dish page the diner lands on after tapping an entry in the menu. The dish
 * listing carries no photography, so this page is the first time the food is
 * seen: the plate is the hero of the layout.
 *
 * Shows:
 *  - a large, high-resolution photograph in a vintage gold bezel (with an
 *    optional kitchen reel behind an unobtrusive overlay toggle),
 *  - the dish name in Playfair Display with its category eyebrow,
 *  - the full description and the ingredient list,
 *  - a prominent "Order Now" button with a quantity stepper and live subtotal,
 *  - a "Back to menu" control at the top and the bottom of the page.
 *
 * Motion: arriving here plays a fast single-leaf paper turn (see
 * `useDishPageFlip` + `MenuBookDishLeaf`); going back plays the same turn in
 * reverse and only then hands control back to the book, so the menu list is
 * uncovered by a landing page rather than popping in. Under
 * `prefers-reduced-motion: reduce` both turns are skipped entirely.
 *
 * Contract: onAddToCart(dish, qty) - parent adds the specified quantity.
 */

const CURRENCY = '$';

/**
 * High-resolution keyword fallbacks. Requested at 1400px wide because this is
 * the only photograph of the dish in the whole book and it is displayed large
 * on desktop and on 3x phone screens.
 */
const GOURMET_FALLBACKS = {
  mains: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1400&auto=format&fit=crop&q=85',
  steak: 'https://images.unsplash.com/photo-1558030006-450675393462?w=1400&auto=format&fit=crop&q=85',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1400&auto=format&fit=crop&q=85',
  pasta: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281294?w=1400&auto=format&fit=crop&q=85',
  wings: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=1400&auto=format&fit=crop&q=85',
  fries: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=1400&auto=format&fit=crop&q=85',
  dessert: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1400&auto=format&fit=crop&q=85',
  drinks: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=1400&auto=format&fit=crop&q=85',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&auto=format&fit=crop&q=85'
};

function pickImage(item) {
  const direct = item.image || item.imageUrl || item.img || item.photo;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (Array.isArray(item.images)) {
    const first = item.images.find((src) => typeof src === 'string' && src.trim());
    if (first) return first.trim();
  }

  // Keyword-aware high-resolution fallback
  const text = `${item.name || ''} ${item.title || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase();
  if (text.includes('steak') || text.includes('ribeye') || text.includes('beef')) return GOURMET_FALLBACKS.steak;
  if (text.includes('burger')) return GOURMET_FALLBACKS.burger;
  if (text.includes('pasta') || text.includes('risotto') || text.includes('spaghetti')) return GOURMET_FALLBACKS.pasta;
  if (text.includes('wing') || text.includes('chicken')) return GOURMET_FALLBACKS.wings;
  if (text.includes('fries') || text.includes('starter') || text.includes('appetizer')) return GOURMET_FALLBACKS.fries;
  if (text.includes('dessert') || text.includes('cake') || text.includes('lava') || text.includes('chocolate')) return GOURMET_FALLBACKS.dessert;
  if (text.includes('drink') || text.includes('beverage') || text.includes('mojito') || text.includes('lemonade')) return GOURMET_FALLBACKS.drinks;
  if (text.includes('main')) return GOURMET_FALLBACKS.mains;
  return GOURMET_FALLBACKS.default;
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
  const [imageError, setImageError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Optional kitchen reel, kept behind a small overlay toggle so the still
  // photograph stays the hero of the page.
  const rawVideo = item.makingVideoUrl || item.videoUrl || (item.category !== 'Drinks' ? '/videos/reel-chef.mp4' : null);
  const [activeMedia, setActiveMedia] = useState('photo'); // 'photo' | 'video'
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRef = useRef(null);

  const addedTimer = useRef(null);

  const image = pickImage(item);

  const name = item.name || item.title || 'Artisanal Selection';
  const category = item.category || item.sectionTitle || 'Chef Specialty';
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const price = formatPrice(item.price);

  // The fast paper turn that lands on this page, and plays in reverse on back.
  const {
    turnId,
    turnDirection,
    requestBack,
    isTurning,
    isClosing,
    reduced,
  } = useDishPageFlip({ dishKey: item.id ?? name, onBack });

  // When a different dish opens, reset the per-dish UI state.
  useEffect(() => {
    setImageError(false);
    setJustAdded(false);
    setQuantity(1);
    setActiveMedia('photo');
    setIsVideoPlaying(true);
    setIsVideoMuted(true);
  }, [item.id, image]);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  // Escape turns back to the menu, same as the back controls.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') requestBack();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestBack]);

  const increment = useCallback(() => {
    setQuantity((q) => Math.min(q + 1, 99));
  }, []);

  const decrement = useCallback(() => {
    setQuantity((q) => Math.max(q - 1, 1));
  }, []);

  const handleAdd = useCallback(() => {
    if (typeof onAddToCart === 'function') {
      onAddToCart(item, quantity);
    }
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => {
      setJustAdded(false);
      setQuantity(1);
    }, 1800);
  }, [item, quantity, onAddToCart]);

  const rawPrice = useMemo(() => {
    const p = item.price;
    if (typeof p === 'number') return p;
    const parsed = parseFloat(String(p).replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [item.price]);

  const ingredients = useMemo(() => readIngredients(item), [item]);

  const isVeg = Boolean(item.isVeg === true || item.veg === true || hasTag(item, /veg/i));
  const isSpicy = Boolean(item.isSpicy === true || item.spicy === true || hasTag(item, /spic/i));
  const isChefSpecial = Boolean(
    item.isChefSpecial === true ||
    item.isSpecial === true ||
    item.chefSpecial === true ||
    item.featured === true ||
    item.isFeatured === true ||
    item.isPopular === true ||
    hasTag(item, /chef|special|featured|popular|signature/i) ||
    (typeof item.description === 'string' && /chef|signature|specialty/i.test(item.description))
  );

  const qtyInCart = Number(cartQuantity) || 0;
  const showImage = Boolean(image) && !imageError;
  const showVideo = activeMedia === 'video' && Boolean(rawVideo);

  return (
    <>
      <article
        className={`mbd${isTurning ? ' is-turning' : ' is-settled'}${isClosing ? ' is-closing' : ''}`}
        data-reduced-motion={reduced ? 'true' : undefined}
        aria-label={name}
      >
        {/* Quick return control, always the first thing in the tab order */}
        <div className="mbd__nav-bar">
          <button
            type="button"
            onClick={requestBack}
            className="mbd__back-top"
            aria-label="Back to menu"
          >
            <ArrowLeft className="mbd__back-icon" aria-hidden="true" />
            <span>Back to menu</span>
          </button>
          <span className="mbd__nav-kicker">Illustrated Feature</span>
        </div>

        {/* Dish name & ornamental heading */}
        <header className="mbd__header">
          <p className="mbd__eyebrow">
            <span className="mbd__flourish" aria-hidden="true">&#10087;</span>
            <span>{category}</span>
            <span className="mbd__flourish" aria-hidden="true">&#10087;</span>
          </p>
          <h2 className="mbd__title font-display">{name}</h2>

          <div className="mbd__divider" aria-hidden="true">
            <span className="mbd__diamond">&#10022; &#10023; &#10022;</span>
          </div>
        </header>

        {/* The plate: large high-resolution photography in a gold bezel */}
        <div className="mbd__figure-wrap">
          <figure className="mbd__figure">
            {/* Vintage ornamental corner accents */}
            <span className="mbd__corner mbd__corner--tl" aria-hidden="true" />
            <span className="mbd__corner mbd__corner--tr" aria-hidden="true" />
            <span className="mbd__corner mbd__corner--bl" aria-hidden="true" />
            <span className="mbd__corner mbd__corner--br" aria-hidden="true" />

            {showVideo ? (
              <div className="mbd__photo-container">
                <video
                  ref={videoRef}
                  src={rawVideo}
                  autoPlay
                  loop
                  muted={isVideoMuted}
                  playsInline
                  className="mbd__photo"
                />

                <span className="mbd__reel-badge">
                  <Video className="w-3 h-3" aria-hidden="true" />
                  <span>Kitchen Reel</span>
                </span>

                <div className="mbd__media-controls">
                  <button
                    type="button"
                    onClick={() => {
                      const el = videoRef.current;
                      if (!el) return;
                      if (isVideoPlaying) {
                        el.pause();
                        setIsVideoPlaying(false);
                      } else {
                        el.play()?.catch?.(() => {});
                        setIsVideoPlaying(true);
                      }
                    }}
                    className="mbd__media-btn"
                    aria-label={isVideoPlaying ? 'Pause kitchen reel' : 'Play kitchen reel'}
                  >
                    {isVideoPlaying
                      ? <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                      : <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) videoRef.current.muted = !isVideoMuted;
                      setIsVideoMuted((muted) => !muted);
                    }}
                    className="mbd__media-btn"
                    aria-label={isVideoMuted ? 'Unmute kitchen reel' : 'Mute kitchen reel'}
                  >
                    {isVideoMuted
                      ? <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                      : <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMedia('photo')}
                    className="mbd__media-btn mbd__media-btn--wide"
                  >
                    Photo
                  </button>
                </div>
              </div>
            ) : showImage ? (
              <div className="mbd__photo-container">
                <img
                  src={image}
                  alt={name}
                  loading="eager"
                  decoding="async"
                  onError={() => setImageError(true)}
                  className="mbd__photo"
                />
                <div className="mbd__vignette" aria-hidden="true" />

                {rawVideo && (
                  <div className="mbd__media-controls">
                    <button
                      type="button"
                      onClick={() => setActiveMedia('video')}
                      className="mbd__media-btn mbd__media-btn--wide"
                      aria-label="Watch the kitchen reel for this dish"
                    >
                      <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                      <span>Watch Reel</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mbd__placeholder">
                <div className="mbd__placeholder-crest">
                  <Utensils className="mbd__placeholder-icon" aria-hidden="true" />
                  <span className="mbd__placeholder-name">{name.charAt(0).toUpperCase()}</span>
                </div>
                <p className="mbd__placeholder-caption">Chef&apos;s Signature Preparation</p>
              </div>
            )}

            {/* Vintage gold price tag */}
            {price && (
              <div className="mbd__price-tag-badge" aria-label={`Price: ${price}`}>
                <div className="mbd__price-tag-notch" aria-hidden="true" />
                <div className="mbd__price-tag-inner">
                  <span className="mbd__price-tag-label">Chef Selection</span>
                  <span className="mbd__price-tag-amount font-display">{price}</span>
                </div>
              </div>
            )}
          </figure>
        </div>

        {/* Dietary & chef badges */}
        {(isChefSpecial || isVeg || isSpicy) && (
          <div className="mbd__badges" aria-label="Dish specialties and dietary traits">
            {isChefSpecial && (
              <span className="mbd__badge mbd__badge--special">
                <Star className="mbd__badge-icon" aria-hidden="true" />
                <span>Chef&apos;s Special</span>
              </span>
            )}
            {isVeg && (
              <span className="mbd__badge mbd__badge--veg">
                <Leaf className="mbd__badge-icon" aria-hidden="true" />
                <span>Vegetarian</span>
              </span>
            )}
            {isSpicy && (
              <span className="mbd__badge mbd__badge--spicy">
                <Flame className="mbd__badge-icon" aria-hidden="true" />
                <span>Spicy</span>
              </span>
            )}
          </div>
        )}

        {/* Full description */}
        <div className="mbd__desc-box">
          <p className={`mbd__desc font-display${description ? '' : ' mbd__desc--fallback'}`}>
            {description || 'Artisanally prepared using authentic seasonal ingredients, crafted daily in our kitchen for an exquisite dining experience.'}
          </p>
        </div>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <section className="mbd__section" aria-label="Artisanal Ingredients">
            <h3 className="mbd__label font-display">
              <span>Artisanal Ingredients</span>
            </h3>
            <ul className="mbd__ingredients">
              {ingredients.map((ingredient, index) => (
                <li key={`${ingredient}-${index}`} className="mbd__ingredient">
                  <span className="mbd__ingredient-dot" aria-hidden="true">&#9670;</span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Classic dotted leader price row */}
        {price && (
          <div className="mbd__price-row" aria-label={`Standard serving: ${price}`}>
            <span className="mbd__price-label font-display">Table Portion</span>
            <span className="mbd__leader" aria-hidden="true" />
            <span className="mbd__price font-display">{price}</span>
          </div>
        )}

        {/* Already in the table order */}
        {qtyInCart > 0 && (
          <div className="mbd__in-order-badge" aria-live="polite">
            <Check className="mbd__in-order-check" aria-hidden="true" />
            <span>{qtyInCart} already added to your table order</span>
          </div>
        )}

        {/* Order Now */}
        <div className="mbd__order-box">
          <div className="mbd__stepper-row">
            <span className="mbd__stepper-label font-display">Quantity:</span>
            <div className="mbd__stepper">
              <button
                type="button"
                onClick={decrement}
                disabled={quantity <= 1 || justAdded}
                className="mbd__stepper-btn"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="mbd__stepper-val font-display" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={increment}
                disabled={quantity >= 99 || justAdded}
                className="mbd__stepper-btn"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {rawPrice > 0 && (
              <span className="mbd__stepper-subtotal font-display">
                Subtotal: {formatPrice(rawPrice * quantity)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={justAdded}
            className={`mbd__order-btn${justAdded ? ' is-added' : ''}`}
            aria-live="polite"
          >
            {justAdded ? (
              <span className="mbd__order-btn-inner">
                <Check className="w-5 h-5 text-emerald-300" aria-hidden="true" />
                <span>Added to Table Order!</span>
                <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" aria-hidden="true" />
              </span>
            ) : (
              <span className="mbd__order-btn-inner">
                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                <span>
                  {quantity > 1 ? `Add ${quantity} to Order` : 'Order Now'}
                  {rawPrice > 0 ? ` • ${formatPrice(rawPrice * quantity)}` : ''}
                </span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={requestBack}
            className="mbd__back-bottom"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Menu</span>
          </button>
        </div>

        <span className="sr-only" aria-live="polite">
          {qtyInCart > 0 ? `${qtyInCart} in your order` : ''}
        </span>
      </article>

      {/*
        The turning sheet. Rendered as a sibling of `.mbd` on purpose: `.mbd` is
        positioned and only 32rem wide, so a child would be boxed inside the
        column. Out here its containing block is `.mb-page` (transformed by the
        book), which both sizes it to the whole leaf and lets it escape the
        page's scroll box.
      */}
      {turnDirection && (
        <MenuBookDishLeaf
          direction={turnDirection}
          turnId={turnId}
          duration={turnDirection === 'in' ? DISH_FLIP_IN_MS : DISH_FLIP_OUT_MS}
          kicker={turnDirection === 'in' ? category : 'Back to'}
          title={turnDirection === 'in' ? name : category}
        />
      )}
    </>
  );
}
