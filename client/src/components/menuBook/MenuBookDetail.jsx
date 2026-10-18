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
  Image as ImageIcon,
  Volume2,
  VolumeX
} from 'lucide-react';
import '../../styles/menu-book-detail.css';

/**
 * MenuBookDetail
 * Renders a luxurious, high-end illustrated feature dish page inside the 3D book:
 * - Large appetizing food photography with vintage gold border and glowing vignette
 * - Kitchen video reel player showing authentic culinary preparation
 * - Elegant typography: dish name in Playfair Display serif, vintage price tag badge in gold
 * - Full description, artisanal ingredient pills with gold borders, dietary badges (Veg, Spicy, Chef Special)
 * - Prominent "Order Now / Add to Cart" button with quantity stepper (+ / -), instant feedback animation ("Added to Table Order!"),
 *   and prominent "← Back to Menu" return buttons
 * - Smooth transition animation when opening/closing the dish detail view inside the book leaf
 *
 * Contract: onAddToCart(dish, qty) — parent adds the specified quantity.
 */

const CURRENCY = '$';

const GOURMET_FALLBACKS = {
  mains: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80',
  steak: 'https://images.unsplash.com/photo-1558030006-450675393462?w=900&auto=format&fit=crop&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
  pasta: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281294?w=900&auto=format&fit=crop&q=80',
  wings: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
  fries: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=900&auto=format&fit=crop&q=80',
  dessert: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
  drinks: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&auto=format&fit=crop&q=80'
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
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Video Reel Support
  const rawVideo = item.makingVideoUrl || item.videoUrl || (item.category !== 'Drinks' ? '/videos/reel-chef.mp4' : null);
  const [activeMedia, setActiveMedia] = useState('photo'); // 'photo' | 'video'
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRef = useRef(null);
  
  const addedTimer = useRef(null);
  const exitTimer = useRef(null);

  const image = pickImage(item);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // When a different dish opens, reset state
  useEffect(() => {
    setImageError(false);
    setJustAdded(false);
    setQuantity(1);
    setIsExiting(false);
    setActiveMedia('photo');
    setIsVideoPlaying(true);
    setIsVideoMuted(true);
  }, [item.id, image]);

  useEffect(() => {
    return () => {
      clearTimeout(addedTimer.current);
      clearTimeout(exitTimer.current);
    };
  }, []);

  const handleBack = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      if (typeof onBack === 'function') onBack();
    }, 240);
  }, [isExiting, onBack]);

  // Escape key closes the dish page smoothly
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBack]);

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

  const name = item.name || item.title || 'Artisanal Selection';
  const category = item.category || item.sectionTitle || 'Chef Specialty';
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const price = formatPrice(item.price);
  
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

  return (
    <article
      className={`mbd${mounted ? ' is-mounted' : ''}${isExiting ? ' is-exiting' : ''}`}
      aria-label={name}
    >
      {/* Top Navigation Bar with Quick Back and Leaf Label */}
      <div className="mbd__nav-bar">
        <button
          type="button"
          onClick={handleBack}
          className="mbd__back-top"
          aria-label="Back to menu spread"
        >
          <ArrowLeft className="mbd__back-icon" aria-hidden="true" />
          <span>Back to menu</span>
        </button>
        <span className="mbd__nav-kicker">Illustrated Feature</span>
      </div>

      {/* Main Title & Ornamental Heading */}
      <header className="mbd__header">
        <p className="mbd__eyebrow">
          <span className="mbd__flourish" aria-hidden="true">❧</span>
          <span>{category}</span>
          <span className="mbd__flourish" aria-hidden="true">❧</span>
        </p>
        <h2 className="mbd__title font-display">{name}</h2>

        <div className="mbd__divider" aria-hidden="true">
          <span className="mbd__diamond">✦ ✧ ✦</span>
        </div>
      </header>

      {/* Media Type Switcher: Photo vs Kitchen Video Reel */}
      {rawVideo && (
        <div className="flex items-center justify-center gap-2 mb-2.5 z-10 relative">
          <button
            type="button"
            onClick={() => setActiveMedia('photo')}
            className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMedia === 'photo'
                ? 'bg-[#d4af37] text-[#06140e] shadow-md shadow-[#d4af37]/30 scale-105'
                : 'bg-[#0f2f22]/80 hover:bg-[#0f2f22] text-[#f0d27a] border border-[#d4af37]/35'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Food Photo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMedia('video')}
            className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMedia === 'video'
                ? 'bg-[#d4af37] text-[#06140e] shadow-md shadow-[#d4af37]/30 scale-105'
                : 'bg-[#0f2f22]/80 hover:bg-[#0f2f22] text-[#f0d27a] border border-[#d4af37]/35'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-current animate-pulse" />
            <span>Kitchen Video Reel</span>
          </button>
        </div>
      )}

      {/* Large Appetizing Food Photography or Kitchen Video Reel */}
      <div className="mbd__figure-wrap">
        <figure className="mbd__figure">
          {/* Vintage Ornamental Corner Accents */}
          <span className="mbd__corner mbd__corner--tl" aria-hidden="true" />
          <span className="mbd__corner mbd__corner--tr" aria-hidden="true" />
          <span className="mbd__corner mbd__corner--bl" aria-hidden="true" />
          <span className="mbd__corner mbd__corner--br" aria-hidden="true" />

          {activeMedia === 'video' && rawVideo ? (
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-2xl">
              <video
                ref={videoRef}
                src={rawVideo}
                autoPlay
                loop
                muted={isVideoMuted}
                playsInline
                className="w-full h-full object-cover rounded-xl"
              />
              {/* Reel Badge */}
              <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-[#f0d27a] border border-[#d4af37]/40 flex items-center gap-1.5 shadow-md">
                <Video className="w-3 h-3 text-[#d4af37]" />
                <span>Kitchen Making Reel</span>
              </div>

              {/* Video Controls Overlay */}
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      if (isVideoPlaying) {
                        videoRef.current.pause();
                        setIsVideoPlaying(false);
                      } else {
                        videoRef.current.play();
                        setIsVideoPlaying(true);
                      }
                    }
                  }}
                  className="p-1.5 rounded-full bg-black/75 hover:bg-black text-[#f0d27a] border border-[#d4af37]/40 shadow-md transition cursor-pointer"
                  title={isVideoPlaying ? "Pause video" : "Play video"}
                  aria-label={isVideoPlaying ? "Pause video" : "Play video"}
                >
                  {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !isVideoMuted;
                      setIsVideoMuted(!isVideoMuted);
                    }
                  }}
                  className="p-1.5 rounded-full bg-black/75 hover:bg-black text-[#f0d27a] border border-[#d4af37]/40 shadow-md transition cursor-pointer"
                  title={isVideoMuted ? "Unmute reel" : "Mute reel"}
                  aria-label={isVideoMuted ? "Unmute reel" : "Mute reel"}
                >
                  {isVideoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : showImage ? (
            <div className="mbd__photo-container relative">
              <img
                src={image}
                alt={name}
                loading="eager"
                onError={() => setImageError(true)}
                className="mbd__photo"
              />
              {/* Glowing Vignette Overlay */}
              <div className="mbd__vignette" aria-hidden="true" />

              {/* Quick Watch Reel Button */}
              {rawVideo && (
                <button
                  type="button"
                  onClick={() => setActiveMedia('video')}
                  className="absolute bottom-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full bg-black/80 hover:bg-black text-[#f0d27a] border border-[#d4af37]/60 text-[10px] font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition hover:scale-105"
                  title="Watch kitchen video reel"
                >
                  <Play className="w-3 h-3 fill-[#d4af37] text-[#d4af37]" />
                  <span>Watch Reel</span>
                </button>
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

          {/* Vintage Gold Price Tag Badge */}
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

      {/* Dietary & Chef Badges */}
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

      {/* Full Description in Elegant Serif */}
      {description ? (
        <div className="mbd__desc-box">
          <p className="mbd__desc font-display">{description}</p>
        </div>
      ) : (
        <div className="mbd__desc-box">
          <p className="mbd__desc font-display mbd__desc--fallback">
            Artisanally prepared using authentic seasonal ingredients, crafted daily in our kitchen for an exquisite dining experience.
          </p>
        </div>
      )}

      {/* Artisanal Ingredient Pills with Gold Borders */}
      {ingredients.length > 0 && (
        <section className="mbd__section" aria-label="Artisanal Ingredients">
          <h3 className="mbd__label font-display">
            <span>Artisanal Ingredients</span>
          </h3>
          <ul className="mbd__ingredients">
            {ingredients.map((ingredient, index) => (
              <li key={`${ingredient}-${index}`} className="mbd__ingredient">
                <span className="mbd__ingredient-dot" aria-hidden="true">◆</span>
                <span>{ingredient}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Classic Dotted Leader Price Row */}
      {price && (
        <div className="mbd__price-row" aria-label={`Standard serving: ${price}`}>
          <span className="mbd__price-label font-display">Table Portion</span>
          <span className="mbd__leader" aria-hidden="true" />
          <span className="mbd__price font-display">{price}</span>
        </div>
      )}

      {/* In-Table Order Badge */}
      {qtyInCart > 0 && (
        <div className="mbd__in-order-badge" aria-live="polite">
          <Check className="mbd__in-order-check" aria-hidden="true" />
          <span>{qtyInCart} already added to your table order</span>
        </div>
      )}

      {/* Prominent Order Now / Add to Cart Section with Quantity Stepper */}
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
              <Minus className="w-3.5 h-3.5" />
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
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {rawPrice > 0 && (
            <span className="mbd__stepper-subtotal font-display">
              Subtotal: {formatPrice(rawPrice * quantity)}
            </span>
          )}
        </div>

        {/* Primary Action Button: Order Now / Add to Cart with Instant Feedback */}
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

        {/* Prominent Return Button at the bottom */}
        <button
          type="button"
          onClick={handleBack}
          className="mbd__back-bottom"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>← Back to Menu</span>
        </button>
      </div>

      <span className="sr-only" aria-live="polite">
        {qtyInCart > 0 ? `${qtyInCart} in your order` : ''}
      </span>
    </article>
  );
}
