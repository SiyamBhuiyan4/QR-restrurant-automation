import React, { useState, useCallback } from 'react';
import '../../styles/menu-book-showcase.css';

/**
 * DEFAULT_TOP_DISH
 * Balado Sauce Wings - matching reference photo top bowl.
 */
export const DEFAULT_TOP_DISH = {
  id: 'showcase-balado-sauce',
  name: 'Balado Sauce',
  title: 'Balado Sauce Wings',
  category: 'Chicken',
  price: '78 K',
  numericPrice: 14.50,
  formattedPrice: '78 K',
  description: 'Crispy golden fried chicken wings tossed in rich, fiery Indonesian Balado chili glaze, sprinkled with toasted sesame and scallions, served with creamy house garlic aioli dipping sauce.',
  image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
  isSpicy: true,
  isPopular: true,
  calories: '680 kcal',
  prepTime: '15-20 min',
  tags: ['Balado Chili', 'Crispy Wings', 'Sesame', 'Garlic Aioli']
};

/**
 * DEFAULT_BOTTOM_DISH
 * Lemonade Sauce Wings - matching reference photo bottom bowl.
 */
export const DEFAULT_BOTTOM_DISH = {
  id: 'showcase-lemonade-sauce',
  name: 'Lemonade Sauce',
  title: 'Lemonade Sauce Wings',
  category: 'Chicken',
  price: '78 K',
  numericPrice: 14.50,
  formattedPrice: '78 K',
  description: 'Golden caramelized chicken wings glazed in artisanal sweet-and-tangy Meyer lemon & wildflower honey reduction, garnished with fresh citrus wheels and microgreens, served with cool herb crema dipping sauce.',
  image: 'https://images.unsplash.com/photo-1527477378375-efd9518a4a58?w=900&auto=format&fit=crop&q=80',
  isVeg: false,
  isSpicy: false,
  isPopular: true,
  calories: '620 kcal',
  prepTime: '15-18 min',
  tags: ['Meyer Lemon', 'Sweet & Tangy', 'Citrus Garnish', 'Cool Crema']
};

/**
 * Photorealistic vector illustration of the Balado Sauce Dish in Ceramic Bowl:
 * Rich glazed red-orange chicken wings, sesame seeds, scallion herbs, and a porcelain dipping ramekin.
 */
export function BaladoSauceBowlSvg({ className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 320 300"
      className={className}
      style={style}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Ceramic bowl well gradient */}
        <radialGradient id="baladoWell" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#2c140a" />
          <stop offset="65%" stopColor="#1a0b05" />
          <stop offset="100%" stopColor="#0d0502" />
        </radialGradient>

        {/* Glazed spicy chicken wings gradients */}
        <linearGradient id="baladoWing1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d13813" />
          <stop offset="45%" stopColor="#9e2007" />
          <stop offset="85%" stopColor="#631003" />
          <stop offset="100%" stopColor="#3d0801" />
        </linearGradient>

        <linearGradient id="baladoWing2" x1="20%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#ea4c1d" />
          <stop offset="50%" stopColor="#b3290b" />
          <stop offset="90%" stopColor="#6e1304" />
        </linearGradient>

        <linearGradient id="baladoWing3" x1="10%" y1="10%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#c52e0f" />
          <stop offset="60%" stopColor="#891a05" />
          <stop offset="100%" stopColor="#4f0d02" />
        </linearGradient>

        {/* Glossy glaze specular highlight */}
        <linearGradient id="glazeSheen" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#ffb076" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#ff7b36" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ff521a" stopOpacity="0" />
        </linearGradient>

        {/* Dipping ramekin gradients */}
        <linearGradient id="ramekinRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#eee7db" />
          <stop offset="100%" stopColor="#cfc4b0" />
        </linearGradient>

        <radialGradient id="aioliDip" cx="38%" cy="34%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f5eedf" />
          <stop offset="85%" stopColor="#e3d6be" />
          <stop offset="100%" stopColor="#c7b79a" />
        </radialGradient>

        <filter id="sauceGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Ceramic Bowl Base */}
      <ellipse cx="160" cy="150" rx="156" ry="146" fill="url(#baladoWell)" />

      {/* Wing Cluster 1 (Left & Central Base) */}
      <path
        d="M65 175 C60 135, 95 105, 145 115 C175 120, 195 155, 185 190 C175 220, 115 235, 80 215 C68 205, 66 190, 65 175 Z"
        fill="url(#baladoWing1)"
      />
      {/* Wing Cluster 2 (Center & Right Wingette) */}
      <path
        d="M125 155 C125 125, 160 95, 210 110 C245 125, 260 170, 240 205 C220 240, 165 245, 135 220 C120 205, 125 180, 125 155 Z"
        fill="url(#baladoWing2)"
      />
      {/* Wing Cluster 3 (Front Crisp Drumette) */}
      <path
        d="M95 195 C100 165, 140 145, 175 160 C205 170, 215 210, 195 235 C175 255, 120 250, 100 230 C90 220, 92 205, 95 195 Z"
        fill="url(#baladoWing3)"
      />

      {/* Glaze Highlights & Specular Sheen */}
      <path
        d="M110 135 C125 120, 155 125, 165 140 C145 142, 125 150, 110 135 Z"
        fill="url(#glazeSheen)"
        opacity="0.9"
      />
      <path
        d="M165 130 C190 120, 215 130, 220 150 C200 150, 180 145, 165 130 Z"
        fill="url(#glazeSheen)"
        opacity="0.85"
      />
      <path
        d="M120 180 C145 168, 170 175, 175 195 C155 195, 135 192, 120 180 Z"
        fill="url(#glazeSheen)"
        opacity="0.95"
      />

      {/* Fiery Chili Glaze Droplets & Texture */}
      <circle cx="105" cy="155" r="3.5" fill="#ff7a38" opacity="0.85" />
      <circle cx="145" cy="148" r="4" fill="#ffa15c" opacity="0.8" />
      <circle cx="190" cy="165" r="4.5" fill="#ff702e" opacity="0.85" />
      <circle cx="155" cy="215" r="3.5" fill="#ff8a47" opacity="0.9" />

      {/* White Toasted Sesame Seed Sprinkles */}
      <ellipse cx="112" cy="148" rx="3.2" ry="1.6" transform="rotate(-25 112 148)" fill="#fff7e6" />
      <ellipse cx="138" cy="138" rx="3" ry="1.5" transform="rotate(35 138 138)" fill="#fff9ec" />
      <ellipse cx="152" cy="165" rx="3.2" ry="1.6" transform="rotate(-15 152 165)" fill="#fff7e6" />
      <ellipse cx="178" cy="150" rx="3.2" ry="1.5" transform="rotate(45 178 150)" fill="#fff9ec" />
      <ellipse cx="135" cy="195" rx="3.5" ry="1.7" transform="rotate(10 135 195)" fill="#fff7e6" />
      <ellipse cx="168" cy="205" rx="3.2" ry="1.6" transform="rotate(-30 168 205)" fill="#fff9ec" />
      <ellipse cx="195" cy="185" rx="3" ry="1.5" transform="rotate(20 195 185)" fill="#fff7e6" />

      {/* Chopped Scallion & Herb Garnishes */}
      <rect x="122" y="160" width="6" height="4" rx="1.5" transform="rotate(25 122 160)" fill="#3e8248" />
      <rect x="160" y="142" width="7" height="4" rx="1.5" transform="rotate(-40 160 142)" fill="#4e9958" />
      <rect x="142" y="182" width="6" height="3.5" rx="1.5" transform="rotate(15 142 182)" fill="#5cb068" />
      <rect x="175" y="172" width="6" height="4" rx="1.5" transform="rotate(70 175 172)" fill="#3e8248" />

      {/* Dipping Sauce Porcelain Ramekin (Top Right) */}
      <g transform="translate(195, 42)">
        {/* Ramekin Cast Shadow */}
        <ellipse cx="44" cy="46" rx="42" ry="38" fill="#000000" opacity="0.65" />
        {/* Porcelain Outer Rim */}
        <ellipse cx="42" cy="42" rx="40" ry="36" fill="url(#ramekinRim)" stroke="#b8ab96" strokeWidth="1.5" />
        {/* Inner Aioli Dipping Sauce */}
        <ellipse cx="42" cy="42" rx="32" ry="28" fill="url(#aioliDip)" />
        {/* Aioli Sauce Highlight */}
        <path d="M22 36 C28 26, 44 24, 56 30 C46 28, 30 30, 22 36 Z" fill="#ffffff" opacity="0.75" />
        {/* Tiny Herb Pinch inside Aioli */}
        <circle cx="44" cy="42" r="1.8" fill="#2c6637" />
        <circle cx="41" cy="44" r="1.2" fill="#43844f" />
        <circle cx="46" cy="45" r="1.4" fill="#367341" />
      </g>
    </svg>
  );
}

/**
 * Photorealistic vector illustration of the Lemonade Sauce Dish in Ceramic Bowl:
 * Golden honey-lemon glazed wings, fresh citrus lemon wheels, microgreens, and porcelain dipping ramekin.
 */
export function LemonadeSauceBowlSvg({ className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 320 300"
      className={className}
      style={style}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Ceramic bowl well gradient */}
        <radialGradient id="lemonWell" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#2b1a0a" />
          <stop offset="65%" stopColor="#180e05" />
          <stop offset="100%" stopColor="#0b0602" />
        </radialGradient>

        {/* Honey-lemon caramelized chicken wings */}
        <linearGradient id="lemonWing1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e38c1c" />
          <stop offset="45%" stopColor="#b35f09" />
          <stop offset="85%" stopColor="#753803" />
          <stop offset="100%" stopColor="#451e01" />
        </linearGradient>

        <linearGradient id="lemonWing2" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#f5a32b" />
          <stop offset="50%" stopColor="#c76d0e" />
          <stop offset="90%" stopColor="#7a3a03" />
        </linearGradient>

        <linearGradient id="lemonWing3" x1="10%" y1="10%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#d97d11" />
          <stop offset="60%" stopColor="#9e4e06" />
          <stop offset="100%" stopColor="#542401" />
        </linearGradient>

        {/* Golden honey citrus sheen */}
        <linearGradient id="honeySheen" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#ffe699" stopOpacity="0.88" />
          <stop offset="50%" stopColor="#ffb833" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#d97d11" stopOpacity="0" />
        </linearGradient>

        {/* Lemon Wheel Gradients */}
        <radialGradient id="lemonPulp" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff385" />
          <stop offset="60%" stopColor="#fcd338" />
          <stop offset="90%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>

        <linearGradient id="lemonRind" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>

        {/* Dipping ramekin gradients */}
        <linearGradient id="ramekinRimLemon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#eee8dc" />
          <stop offset="100%" stopColor="#cec3b0" />
        </linearGradient>

        <radialGradient id="cremaDip" cx="38%" cy="34%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f7f3e8" />
          <stop offset="85%" stopColor="#e5dcc9" />
          <stop offset="100%" stopColor="#c9bea6" />
        </radialGradient>
      </defs>

      {/* Ceramic Bowl Base */}
      <ellipse cx="160" cy="150" rx="156" ry="146" fill="url(#lemonWell)" />

      {/* Wing Cluster 1 (Left & Central) */}
      <path
        d="M75 165 C70 125, 110 100, 155 110 C185 118, 205 150, 195 185 C185 220, 125 235, 90 215 C78 205, 76 185, 75 165 Z"
        fill="url(#lemonWing1)"
      />
      {/* Wing Cluster 2 (Right & Center) */}
      <path
        d="M130 145 C130 115, 175 90, 225 105 C260 120, 270 165, 250 200 C230 235, 175 240, 145 215 C130 200, 130 170, 130 145 Z"
        fill="url(#lemonWing2)"
      />
      {/* Wing Cluster 3 (Front Wing) */}
      <path
        d="M105 185 C110 155, 150 140, 185 155 C215 165, 225 205, 205 230 C185 250, 130 250, 110 225 C100 215, 102 195, 105 185 Z"
        fill="url(#lemonWing3)"
      />

      {/* Golden Caramelized Glaze Sheen */}
      <path
        d="M120 130 C135 115, 165 120, 175 135 C155 138, 135 145, 120 130 Z"
        fill="url(#honeySheen)"
        opacity="0.95"
      />
      <path
        d="M175 125 C200 115, 225 125, 230 145 C210 145, 190 140, 175 125 Z"
        fill="url(#honeySheen)"
        opacity="0.9"
      />
      <path
        d="M130 175 C155 160, 180 168, 185 188 C165 188, 145 185, 130 175 Z"
        fill="url(#honeySheen)"
        opacity="0.95"
      />

      {/* Fresh Lemon Citrus Wheel 1 (Front Left) */}
      <g transform="translate(70, 145) rotate(-15)">
        {/* Rind Outer Ring */}
        <circle cx="36" cy="36" r="34" fill="url(#lemonRind)" stroke="#eab308" strokeWidth="1.5" />
        {/* White Pith */}
        <circle cx="36" cy="36" r="30" fill="#fef9c3" />
        {/* Pulp Wedges */}
        <circle cx="36" cy="36" r="27" fill="url(#lemonPulp)" />
        {/* Citrus Segment Dividers & Center Core */}
        <path d="M36 9 L36 63 M9 36 L63 36 M17 17 L55 55 M17 55 L55 17" stroke="#fef9c3" strokeWidth="1.8" />
        <circle cx="36" cy="36" r="4.5" fill="#fef9c3" />
        {/* Translucent Juicy Sheen */}
        <circle cx="30" cy="28" r="8" fill="#ffffff" opacity="0.45" />
      </g>

      {/* Fresh Lemon Citrus Wheel 2 (Center Overlay) */}
      <g transform="translate(125, 175) rotate(22)">
        <circle cx="28" cy="28" r="26" fill="url(#lemonRind)" stroke="#eab308" strokeWidth="1.2" />
        <circle cx="28" cy="28" r="23" fill="#fef9c3" />
        <circle cx="28" cy="28" r="20" fill="url(#lemonPulp)" />
        <path d="M28 8 L28 48 M8 28 L48 28 M14 14 L42 42 M14 42 L42 14" stroke="#fef9c3" strokeWidth="1.5" />
        <circle cx="28" cy="28" r="3.5" fill="#fef9c3" />
        <circle cx="24" cy="22" r="6" fill="#ffffff" opacity="0.4" />
      </g>

      {/* Fresh Herb Microgreens & Garnishes */}
      <rect x="180" y="155" width="7" height="4" rx="1.5" transform="rotate(35 180 155)" fill="#448e4d" />
      <rect x="155" y="140" width="8" height="4.5" rx="1.5" transform="rotate(-30 155 140)" fill="#56a860" />
      <rect x="210" y="178" width="6" height="3.5" rx="1.5" transform="rotate(15 210 178)" fill="#3a7b42" />

      {/* Dipping Sauce Porcelain Ramekin (Top Left) */}
      <g transform="translate(38, 42)">
        {/* Ramekin Cast Shadow */}
        <ellipse cx="44" cy="46" rx="42" ry="38" fill="#000000" opacity="0.65" />
        {/* Porcelain Outer Rim */}
        <ellipse cx="42" cy="42" rx="40" ry="36" fill="url(#ramekinRimLemon)" stroke="#b8ab96" strokeWidth="1.5" />
        {/* Inner Crema Dipping Sauce */}
        <ellipse cx="42" cy="42" rx="32" ry="28" fill="url(#cremaDip)" />
        {/* Crema Sauce Highlight */}
        <path d="M22 36 C28 26, 44 24, 56 30 C46 28, 30 30, 22 36 Z" fill="#ffffff" opacity="0.75" />
        {/* Fresh Micro Dill / Herb Fleck inside Crema */}
        <circle cx="44" cy="42" r="1.6" fill="#3a7d45" />
        <circle cx="42" cy="45" r="1.2" fill="#4d9b5a" />
        <circle cx="47" cy="44" r="1.3" fill="#2d6437" />
      </g>
    </svg>
  );
}

/**
 * Format price cleanly whether passed as number, formatted string, or missing.
 */
function displayPrice(dish, defaultCurrency = '$') {
  if (!dish) return '78 K';
  if (dish.formattedPrice) return String(dish.formattedPrice);
  if (typeof dish.price === 'string' && dish.price.trim()) return dish.price.trim();
  if (typeof dish.price === 'number') {
    return `${defaultCurrency}${dish.price.toFixed(2)}`;
  }
  if (typeof dish.numericPrice === 'number') {
    return `${defaultCurrency}${dish.numericPrice.toFixed(2)}`;
  }
  return '78 K';
}

/**
 * DishBowlItem
 * Single interactive circular ceramic bowl with glazed dish, rim highlights, dipping ramekin, and price label.
 */
function DishBowlItem({
  dish,
  variant = 'top', // 'top' | 'bottom'
  onSelect,
  showRamekin = true,
  currency = '$'
}) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = !imgError && (dish?.image || dish?.imageUrl || dish?.img || null);

  const handleClick = useCallback(() => {
    onSelect?.(dish);
  }, [onSelect, dish]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(dish);
      }
    },
    [onSelect, dish]
  );

  const isTop = variant === 'top';
  const ramekinClass = isTop
    ? 'mb-showcase-dish__ramekin mb-showcase-dish__ramekin--top'
    : 'mb-showcase-dish__ramekin mb-showcase-dish__ramekin--bottom';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`mb-showcase-dish mb-showcase-dish--${variant}`}
      aria-label={`View details for ${dish?.name || dish?.title || 'Dish'}`}
    >
      {/* Ceramic Bowl Vessel */}
      <div className="mb-showcase-dish__bowl-wrap">
        <div className="mb-showcase-dish__bowl">
          <div className="mb-showcase-dish__well">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={dish?.name || 'Dish'}
                className="mb-showcase-dish__img"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : isTop ? (
              <BaladoSauceBowlSvg className="mb-showcase-dish__art" />
            ) : (
              <LemonadeSauceBowlSvg className="mb-showcase-dish__art" />
            )}

            {/* Specular Glaze Light Arc Reflection */}
            <span className="mb-showcase-dish__glaze-sheen" aria-hidden="true" />
          </div>
        </div>

        {/* Small White Dipping Sauce Porcelain Ramekin */}
        {showRamekin && (
          <div className={ramekinClass} aria-label="Dipping sauce">
            <span className="mb-showcase-dish__sauce-fill" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Dish Label and Price */}
      <div className="mb-showcase-dish__info">
        <h3 className="mb-showcase-dish__title">{dish?.name || dish?.title || 'Special Dish'}</h3>
        <span className="mb-showcase-dish__price">{displayPrice(dish, currency)}</span>
      </div>
    </div>
  );
}

/**
 * MenuBookShowcasePage
 * High-end Showcase Left Page Engine for the 3D Restaurant Menu Book.
 *
 * Props:
 * - titleUpper (string, default: 'CHICKEN'): Uppercase tracked serif category header.
 * - titleLower (string, default: 'Wings'): Flowing cursive script subtitle.
 * - titleScript (string, optional alias for titleLower).
 * - dishes (Array, optional [topDish, bottomDish]): Dish objects to display.
 * - dishTop (object, optional): Top bowl dish object override.
 * - dishBottom (object, optional): Bottom bowl dish object override.
 * - onSelectDish (func): Triggered when either dish is clicked, passing the selected dish.
 * - onSelectItem (func): Alias for onSelectDish.
 * - pageNumber (number | string, optional): Page number displayed in the footer.
 * - showRamekin (bool, default: true): Show dipping sauce ramekins inside bowls.
 * - currency (string, default: '$'): Currency symbol for numeric prices.
 * - className (string, optional): Additional CSS classes.
 * - style (object, optional): Inline styles.
 */
export default function MenuBookShowcasePage({
  titleUpper = 'CHICKEN',
  titleLower = 'Wings',
  titleScript,
  dishes,
  dishTop,
  dishBottom,
  onSelectDish,
  onSelectItem,
  pageNumber,
  showRamekin = true,
  currency = '$',
  className = '',
  style = {}
}) {
  const handleSelect = useCallback(
    (dish) => {
      onSelectDish?.(dish);
      onSelectItem?.(dish);
    },
    [onSelectDish, onSelectItem]
  );

  // Resolve top and bottom dish with fallbacks
  const resolvedTopDish = dishTop || dishes?.[0] || DEFAULT_TOP_DISH;
  const resolvedBottomDish = dishBottom || dishes?.[1] || DEFAULT_BOTTOM_DISH;
  const scriptText = titleScript || titleLower || 'Wings';

  return (
    <article
      className={`mb-showcase-page ${className}`.trim()}
      style={style}
      aria-label={`${titleUpper} ${scriptText} Menu Showcase`}
    >
      {/* Double Gold Keyline Border Frame with Corner Florets */}
      <div className="mb-showcase-page__frame" aria-hidden="true" />
      <div className="mb-showcase-page__corner-tr" aria-hidden="true" />
      <div className="mb-showcase-page__corner-bl" aria-hidden="true" />

      {/* Category Title at Top */}
      <header className="mb-showcase-page__header">
        <h2 className="mb-showcase-page__title-upper">{titleUpper}</h2>
        <span className="mb-showcase-page__title-script" aria-hidden="true">
          {scriptText}
        </span>
      </header>

      {/* Two Large Circular Ceramic Bowls Placed Vertically */}
      <main className="mb-showcase-page__content">
        <DishBowlItem
          dish={resolvedTopDish}
          variant="top"
          onSelect={handleSelect}
          showRamekin={showRamekin}
          currency={currency}
        />

        <DishBowlItem
          dish={resolvedBottomDish}
          variant="bottom"
          onSelect={handleSelect}
          showRamekin={showRamekin}
          currency={currency}
        />
      </main>

      {/* Optional Page Number Footer */}
      {pageNumber !== undefined && pageNumber !== null && (
        <footer className="mb-showcase-page__footer">
          <span>{pageNumber}</span>
        </footer>
      )}
    </article>
  );
}
