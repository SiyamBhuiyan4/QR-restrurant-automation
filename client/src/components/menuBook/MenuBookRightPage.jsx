import React, { useMemo } from 'react';
import '../../styles/menu-book-drinks.css';

/**
 * Default menu data matching the reference photo at /Users/mdyeakubsarker/Downloads/images.jpeg:
 * - Top: [ DRINKS & DESSERT ] bracketed title
 * - Section 1: CLASSIC COCKTAIL (Mojito 105 K / $14, Old Fashioned 115 K / $15, etc.)
 * - Section 2: MOCKTAIL (Virgin Mojito 55 K, Citrus Cooler 52 K, Berry Fizz 58 K) with chalk line art SVG
 * - Section 3: DESSERTS (2-column layout: Souffle, Lava Cake, Tiramisu, Churros, Panna Cotta, Pisang Goreng, etc.)
 */
export const DEFAULT_COCKTAILS = [
  {
    id: 'cocktail-mojito',
    name: 'Mojito',
    title: 'Mojito',
    price: 14.00,
    priceK: '105 K',
    priceDisplay: '105 K / $14',
    description: 'White rum, fresh garden mint, Persian lime juice, raw cane sugar, and sparkling soda.',
    ingredients: ['White Rum', 'Fresh Garden Mint', 'Lime Juice', 'Cane Sugar', 'Club Soda'],
    category: 'Classic Cocktail',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'cocktail-old-fashioned',
    name: 'Old Fashioned',
    title: 'Old Fashioned',
    price: 15.00,
    priceK: '115 K',
    priceDisplay: '115 K / $15',
    description: 'Small-batch Kentucky bourbon, Angostura aromatic bitters, raw demerara sugar cube, flamed orange peel.',
    ingredients: ['Bourbon Whiskey', 'Angostura Bitters', 'Demerara Sugar', 'Orange Twist'],
    category: 'Classic Cocktail',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'cocktail-espresso-martini',
    name: 'Espresso Martini',
    title: 'Espresso Martini',
    price: 14.50,
    priceK: '110 K',
    priceDisplay: '110 K / $14.50',
    description: 'Distilled craft vodka, rich Kahlúa coffee liqueur, freshly pulled espresso, velvety coffee crema.',
    ingredients: ['Craft Vodka', 'Kahlúa Coffee Liqueur', 'Fresh Espresso', 'Vanilla Bean'],
    category: 'Classic Cocktail',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1545438102-799c3991ffb2?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'cocktail-gin-tonic',
    name: 'Gin Tonic',
    title: 'Gin Tonic',
    price: 12.00,
    priceK: '95 K',
    priceDisplay: '95 K / $12',
    description: 'London dry gin, botanical Indian tonic water, bruised juniper berries, dehydrated Key lime wheel.',
    ingredients: ['London Dry Gin', 'Artisanal Indian Tonic', 'Juniper Berries', 'Lime Wheel'],
    category: 'Classic Cocktail',
    isPopular: false,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'cocktail-negroni',
    name: 'Negroni',
    title: 'Negroni',
    price: 14.00,
    priceK: '110 K',
    priceDisplay: '110 K / $14',
    description: 'Botanical gin, Campari bitter aperitivo, Carpano Antica sweet vermouth, flamed orange peel.',
    ingredients: ['Botanical Gin', 'Campari Aperitivo', 'Sweet Vermouth', 'Flamed Orange'],
    category: 'Classic Cocktail',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1551751299-1b51cbd999b6?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'cocktail-whiskey-sour',
    name: 'Whiskey Sour',
    title: 'Whiskey Sour',
    price: 14.00,
    priceK: '110 K',
    priceDisplay: '110 K / $14',
    description: 'Bourbon whiskey, fresh lemon juice, organic agave, silken egg white foam, aromatic bitters drop.',
    ingredients: ['Bourbon Whiskey', 'Fresh Lemon Juice', 'Simple Agave', 'Egg White Foam'],
    category: 'Classic Cocktail',
    isPopular: false,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80',
  },
];

export const DEFAULT_MOCKTAILS = [
  {
    id: 'mocktail-virgin-mojito',
    name: 'Virgin Mojito',
    title: 'Virgin Mojito',
    price: 7.00,
    priceK: '55 K',
    priceDisplay: '55 K',
    description: 'Freshly crushed garden mint leaves, Persian lime juice, raw cane syrup, sparkling mineral water.',
    ingredients: ['Garden Mint', 'Persian Lime', 'Raw Cane Syrup', 'Sparkling Mineral Water'],
    category: 'Mocktail',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'mocktail-citrus-cooler',
    name: 'Citrus Cooler',
    title: 'Citrus Cooler',
    price: 6.50,
    priceK: '52 K',
    priceDisplay: '52 K',
    description: 'Freshly squeezed pink grapefruit, Sicilian lemon, wild rosemary infusion, sparkling tonic.',
    ingredients: ['Pink Grapefruit', 'Sicilian Lemon', 'Rosemary Sprig', 'Botanical Tonic'],
    category: 'Mocktail',
    isPopular: false,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'mocktail-berry-fizz',
    name: 'Berry Fizz',
    title: 'Berry Fizz',
    price: 7.50,
    priceK: '58 K',
    priceDisplay: '58 K',
    description: 'Crushed wild blackberries, raspberries, elderflower cordial, splash of effervescent club soda.',
    ingredients: ['Wild Blackberries', 'Raspberries', 'Elderflower Cordial', 'Club Soda'],
    category: 'Mocktail',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=900&q=80',
  },
];

export const DEFAULT_DESSERTS = [
  // Column 1
  {
    id: 'dessert-souffle',
    name: 'Chocolate Soufflé',
    title: 'Chocolate Soufflé',
    price: 8.00,
    priceK: '35 K',
    priceDisplay: '35 K',
    description: 'Warm Belgian chocolate soufflé with a molten core and Madagascar vanilla bean crème anglaise.',
    ingredients: ['Belgian Dark Chocolate', 'Farm Fresh Eggs', 'Vanilla Bean Crème', 'Cocoa Powder'],
    category: 'Desserts',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'dessert-lava-cake',
    name: 'Molten Lava Cake',
    title: 'Molten Lava Cake',
    price: 7.50,
    priceK: '32 K',
    priceDisplay: '32 K',
    description: '70% Valrhona dark chocolate cake with a rich molten center, bourbon vanilla gelato, tart raspberry drizzle.',
    ingredients: ['70% Valrhona Chocolate', 'Bourbon Vanilla Gelato', 'Raspberry Coulis', 'Maldon Salt'],
    category: 'Desserts',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'dessert-tiramisu',
    name: 'House Tiramisu',
    title: 'House Tiramisu',
    price: 7.00,
    priceK: '30 K',
    priceDisplay: '30 K',
    description: 'Espresso-soaked Savoiardi ladyfingers, velvety Italian mascarpone cream, dark Dutch cocoa powder.',
    ingredients: ['Savoiardi Ladyfingers', 'Italian Mascarpone', 'Fresh Espresso', 'Dutch Cocoa'],
    category: 'Desserts',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'dessert-churros',
    name: 'Churros',
    title: 'Churros',
    price: 6.00,
    priceK: '28 K',
    priceDisplay: '28 K',
    description: 'Golden fried Spanish pastry dough crusted in cinnamon sugar, served with warm house dulce de leche.',
    ingredients: ['Artisan Pastry Dough', 'Cinnamon Sugar', 'Warm Dulce de Leche', 'Dark Chocolate Dip'],
    category: 'Desserts',
    isPopular: false,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'dessert-panna-cotta',
    name: 'Panna Cotta',
    title: 'Panna Cotta',
    price: 6.00,
    priceK: '28 K',
    priceDisplay: '28 K',
    description: 'Silky smooth vanilla bean custard cream crowned with macerated wild berries and fresh mint sprig.',
    ingredients: ['Vanilla Bean Custard', 'Wild Summer Berries', 'Berry Reduction', 'Garden Mint'],
    category: 'Desserts',
    isPopular: false,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
  },

  // Column 2 (Authentic from reference photo)
  {
    id: 'dessert-pisang-goreng',
    name: 'Pisang Goreng (2 Pcs)',
    title: 'Pisang Goreng (2 Pcs)',
    price: 5.50,
    priceK: '25 K',
    priceDisplay: '25 K',
    description: 'Crispy caramelized golden banana fritters drizzled with organic wildflower honey and toasted sesame.',
    ingredients: ['Ripe Honey Bananas', 'Crispy Golden Batter', 'Wildflower Honey', 'Toasted Sesame'],
    category: 'Desserts',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'dessert-pisang-keju',
    name: 'Pisang Keju',
    title: 'Pisang Keju',
    price: 6.00,
    priceK: '28 K',
    priceDisplay: '28 K',
    description: 'Golden crispy banana fritters smothered in aged grated cheddar cheese and sweet condensed milk drizzle.',
    ingredients: ['Golden Banana Fritters', 'Grated Aged Cheddar', 'Sweet Condensed Milk'],
    category: 'Desserts',
    isPopular: false,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'dessert-pisang-caramel',
    name: 'Pisang Caramel',
    title: 'Pisang Caramel',
    price: 7.00,
    priceK: '30 K',
    priceDisplay: '30 K',
    description: 'Pan-glazed ripe bananas coated in artisanal palm sugar caramel sauce, roasted peanuts, and coconut.',
    ingredients: ['Pan-Glazed Bananas', 'Palm Sugar Caramel', 'Roasted Peanuts', 'Coconut Flakes'],
    category: 'Desserts',
    isPopular: false,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'dessert-pisang-coklat',
    name: 'Pisang Coklat',
    title: 'Pisang Coklat',
    price: 6.00,
    priceK: '28 K',
    priceDisplay: '28 K',
    description: 'Crispy golden pastry roll stuffed with sweet ripe banana and molten Belgian dark chocolate fudge.',
    ingredients: ['Crispy Spring Pastry', 'Ripe Sweet Banana', 'Molten Belgian Chocolate'],
    category: 'Desserts',
    isPopular: false,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'dessert-pisang-coklat-keju',
    name: 'Pisang Coklat Keju',
    title: 'Pisang Coklat Keju',
    price: 7.50,
    priceK: '32 K',
    priceDisplay: '32 K',
    description: 'Supreme banana fritters layered with premium dark chocolate shavings and savory Dutch gouda.',
    ingredients: ['Supreme Banana Fritters', 'Belgian Dark Chocolate', 'Grated Dutch Gouda', 'Caramel Drizzle'],
    category: 'Desserts',
    isPopular: true,
    isVeg: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
  },
];

/**
 * Delicate chalk-style line art SVG illustration of a cocktail glass with lime/citrus wheel and straw.
 * Placed in the right margin of the MOCKTAIL section, matching the reference photo.
 */
function CocktailChalkIllustration({ className = '' }) {
  return (
    <div className={`mb-drinks-chalk-illustration ${className}`.trim()} aria-hidden="true">
      <svg
        viewBox="0 0 160 210"
        className="mb-drinks-chalk-svg"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <filter id="mbChalkGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.65" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#mbChalkGlow)">
          {/* Top Glass Rim Oval */}
          <ellipse cx="80" cy="62" rx="38" ry="7" stroke="rgba(245, 239, 224, 0.85)" strokeWidth="1.5" />

          {/* Left & Right Glass Walls */}
          <path d="M 42 62 L 50 172" stroke="rgba(245, 239, 224, 0.85)" strokeWidth="1.5" />
          <path d="M 118 62 L 110 172" stroke="rgba(245, 239, 224, 0.85)" strokeWidth="1.5" />

          {/* Curved Bottom Rim */}
          <path d="M 50 172 C 50 180, 110 180, 110 172" stroke="rgba(245, 239, 224, 0.85)" strokeWidth="1.5" />

          {/* Heavy Base Sham Line */}
          <path d="M 52 162 C 52 168, 108 168, 108 162" stroke="rgba(245, 239, 224, 0.6)" strokeWidth="1.2" strokeDasharray="4 2.5" />

          {/* Liquid Meniscus Curve */}
          <path d="M 46 100 C 46 106, 114 106, 114 100" stroke="rgba(245, 239, 224, 0.7)" strokeWidth="1.2" />

          {/* Floating Ice Cube 1 (Upper Right) */}
          <path d="M 74 108 L 92 102 L 105 109 L 87 115 Z" stroke="rgba(250, 225, 140, 0.85)" strokeWidth="1.2" />
          <path d="M 74 108 L 74 124 L 87 130 L 87 115" stroke="rgba(250, 225, 140, 0.85)" strokeWidth="1.2" />
          <path d="M 87 130 L 105 124 L 105 109" stroke="rgba(250, 225, 140, 0.85)" strokeWidth="1.2" />

          {/* Floating Ice Cube 2 (Lower Left) */}
          <path d="M 56 126 L 72 120 L 82 127 L 66 133 Z" stroke="rgba(250, 225, 140, 0.85)" strokeWidth="1.2" />
          <path d="M 56 126 L 56 140 L 66 147 L 66 133" stroke="rgba(250, 225, 140, 0.85)" strokeWidth="1.2" />
          <path d="M 66 147 L 82 141 L 82 127" stroke="rgba(250, 225, 140, 0.85)" strokeWidth="1.2" />

          {/* Straw Angled from Drink up through Rim to Right */}
          <path d="M 70 152 L 96 62 L 126 16" stroke="rgba(250, 225, 140, 0.95)" strokeWidth="2.2" />
          <path d="M 74 153 L 99 63 L 129 17" stroke="rgba(250, 225, 140, 0.65)" strokeWidth="0.8" />
          {/* Straw Decorative Spiral Stripes */}
          <line x1="102" y1="52" x2="107" y2="54" stroke="rgba(250, 225, 140, 0.8)" strokeWidth="1" />
          <line x1="112" y1="36" x2="117" y2="38" stroke="rgba(250, 225, 140, 0.8)" strokeWidth="1" />
          <line x1="121" y1="22" x2="126" y2="24" stroke="rgba(250, 225, 140, 0.8)" strokeWidth="1" />

          {/* Effervescent Rising Bubbles */}
          <circle cx="60" cy="150" r="1.5" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1" />
          <circle cx="64" cy="136" r="2.0" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1" />
          <circle cx="76" cy="122" r="1.5" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1" />
          <circle cx="92" cy="118" r="2.2" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1" />
          <circle cx="80" cy="88" r="1.8" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1" />
          <circle cx="64" cy="78" r="2.2" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1" />
          <circle cx="100" cy="92" r="1.5" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1" />

          {/* Lime / Citrus Wheel on the Rim (Left Rim at x=42, y=48) */}
          {/* Outer Peel Rind */}
          <circle cx="42" cy="48" r="24" stroke="rgba(240, 210, 122, 0.95)" strokeWidth="1.6" />
          {/* Inner Pith Ring */}
          <circle cx="42" cy="48" r="20" stroke="rgba(240, 210, 122, 0.7)" strokeWidth="1.0" strokeDasharray="1.5 1" />
          {/* Center Core */}
          <circle cx="42" cy="48" r="3.5" stroke="rgba(240, 210, 122, 0.9)" strokeWidth="1.2" fill="rgba(240, 210, 122, 0.2)" />

          {/* Pulp Wedges / Radial Spokes (8 segments) */}
          <line x1="42" y1="44.5" x2="42" y2="28" stroke="rgba(240, 210, 122, 0.85)" strokeWidth="1.0" />
          <line x1="42" y1="51.5" x2="42" y2="68" stroke="rgba(240, 210, 122, 0.85)" strokeWidth="1.0" />
          <line x1="38.5" y1="48" x2="22" y2="48" stroke="rgba(240, 210, 122, 0.85)" strokeWidth="1.0" />
          <line x1="45.5" y1="48" x2="62" y2="48" stroke="rgba(240, 210, 122, 0.85)" strokeWidth="1.0" />
          <line x1="39.5" y1="45.5" x2="28" y2="34" stroke="rgba(240, 210, 122, 0.85)" strokeWidth="1.0" />
          <line x1="44.5" y1="50.5" x2="56" y2="62" stroke="rgba(240, 210, 122, 0.85)" strokeWidth="1.0" />
          <line x1="44.5" y1="45.5" x2="56" y2="34" stroke="rgba(240, 210, 122, 0.85)" strokeWidth="1.0" />
          <line x1="39.5" y1="50.5" x2="28" y2="62" stroke="rgba(240, 210, 122, 0.85)" strokeWidth="1.0" />

          {/* Curved pulp pockets inside wedges */}
          <path d="M 39 30 C 42 32, 45 32, 45 30" stroke="rgba(240, 210, 122, 0.6)" strokeWidth="0.8" />
          <path d="M 54 39 C 56 42, 56 45, 54 45" stroke="rgba(240, 210, 122, 0.6)" strokeWidth="0.8" />
          <path d="M 30 39 C 28 42, 28 45, 30 45" stroke="rgba(240, 210, 122, 0.6)" strokeWidth="0.8" />

          {/* Notch gripping the glass rim */}
          <path d="M 41 58 L 47 64 L 43 70" stroke="rgba(240, 210, 122, 0.9)" strokeWidth="1.2" />

          {/* Botanical Mint Leaf Accent behind the citrus wheel */}
          <path d="M 28 32 C 22 24, 18 25, 20 20 C 26 21, 29 26, 30 30" stroke="rgba(134, 239, 172, 0.75)" strokeWidth="1.1" />
          <path d="M 34 26 C 36 18, 42 16, 42 22 C 38 25, 36 28, 34 29" stroke="rgba(134, 239, 172, 0.75)" strokeWidth="1.1" />
        </g>
      </svg>
    </div>
  );
}

/**
 * MenuBookRightPage
 * Pixel-perfect Right Page Engine for 3D Restaurant Menu Book
 * 
 * Props:
 * - onSelectDish: (item) => void (Opens in-book detail view or full screen modal)
 * - onAddToCart: (item, qty) => void (Optional quick add callback)
 * - cart: Object mapping item id to { quantity }
 * - cocktails: Array of cocktail items (defaults to authentic photo list)
 * - mocktails: Array of mocktail items (defaults to authentic photo list)
 * - desserts: Array of dessert items (defaults to authentic 2-col list)
 * - currencyMode: 'both' | 'K' | 'USD' (controls price formatting)
 * - pageNumber: Folio page number to display (e.g. 4 or 'IV')
 * - className: Optional outer class
 */
export default function MenuBookRightPage({
  onSelectDish,
  onAddToCart,
  cart = {},
  cocktails: propCocktails,
  mocktails: propMocktails,
  desserts: propDesserts,
  currencyMode = 'both',
  pageNumber = null,
  className = '',
}) {
  const cocktails = useMemo(
    () => (Array.isArray(propCocktails) && propCocktails.length > 0 ? propCocktails : DEFAULT_COCKTAILS),
    [propCocktails]
  );

  const mocktails = useMemo(
    () => (Array.isArray(propMocktails) && propMocktails.length > 0 ? propMocktails : DEFAULT_MOCKTAILS),
    [propMocktails]
  );

  const desserts = useMemo(
    () => (Array.isArray(propDesserts) && propDesserts.length > 0 ? propDesserts : DEFAULT_DESSERTS),
    [propDesserts]
  );

  // Split desserts cleanly into 2 columns
  const [dessertCol1, dessertCol2] = useMemo(() => {
    const half = Math.ceil(desserts.length / 2);
    return [desserts.slice(0, half), desserts.slice(half)];
  }, [desserts]);

  const handleItemClick = (item) => {
    if (typeof onSelectDish === 'function') {
      onSelectDish(item);
    } else if (typeof onAddToCart === 'function') {
      onAddToCart(item, 1);
    }
  };

  const formatItemPrice = (item) => {
    if (!item) return '';
    if (currencyMode === 'both' && item.priceDisplay) return item.priceDisplay;
    if (currencyMode === 'K' && item.priceK) return item.priceK;
    if (currencyMode === 'USD' && typeof item.price === 'number') return `$${item.price.toFixed(2)}`;
    return item.priceDisplay || item.priceK || (typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : String(item.price || ''));
  };

  const renderItemRow = (item) => {
    const inCart = cart?.[item.id]?.quantity ?? 0;
    const priceText = formatItemPrice(item);

    return (
      <li key={item.id} className="mb-drinks-item-wrap">
        <button
          type="button"
          className="mb-drinks-item"
          onClick={() => handleItemClick(item)}
          aria-label={`${item.name || item.title}, ${priceText}`}
          title={`Click to view details of ${item.name || item.title}`}
        >
          <span className="mb-drinks-item-left">
            <span className="mb-drinks-item-name">{item.name || item.title}</span>
            {inCart > 0 && (
              <span className="mb-drinks-cart-badge" title={`${inCart} in order`}>
                {inCart}
              </span>
            )}
            {item.isPopular && (
              <span className="mb-drinks-badge-star" title="Popular Favorite">
                ★
              </span>
            )}
          </span>
          <span className="mb-drinks-item-leader" aria-hidden="true" />
          <span className="mb-drinks-item-price">{priceText}</span>
        </button>
      </li>
    );
  };

  return (
    <div className={`mb-drinks-page ${className}`.trim()}>
      {/* Double Gold Keyline Filigree Frame */}
      <div className="mb-drinks-frame">
        {/* Ornate Gold Corner Flourishes */}
        <span className="mb-drinks-corner mb-drinks-corner--tl" aria-hidden="true" />
        <span className="mb-drinks-corner mb-drinks-corner--tr" aria-hidden="true" />
        <span className="mb-drinks-corner mb-drinks-corner--bl" aria-hidden="true" />
        <span className="mb-drinks-corner mb-drinks-corner--br" aria-hidden="true" />

        {/* 1. Top Bracketed Header: [ DRINKS & DESSERT ] */}
        <header className="mb-drinks-bracket-header">
          <div className="mb-drinks-bracket-frame">
            <span className="mb-drinks-bracket mb-drinks-bracket--left" aria-hidden="true" />
            <div className="mb-drinks-title-wrap">
              <span className="mb-drinks-title-line">DRINKS &</span>
              <span className="mb-drinks-title-line">DESSERT</span>
            </div>
            <span className="mb-drinks-bracket mb-drinks-bracket--right" aria-hidden="true" />
          </div>
          <div className="mb-drinks-header-rule" aria-hidden="true">
            <span className="mb-drinks-rule-line" />
            <span className="mb-drinks-rule-diamond">✦</span>
            <span className="mb-drinks-rule-line" />
          </div>
        </header>

        {/* 2. Section 1: CLASSIC COCKTAIL */}
        <section className="mb-drinks-section mb-drinks-section--cocktails" aria-label="Classic Cocktails">
          <div className="mb-drinks-section-heading">
            <h2 className="mb-drinks-section-title">CLASSIC COCKTAIL</h2>
            <span className="mb-drinks-section-rule" aria-hidden="true" />
          </div>
          <ul className="mb-drinks-list mb-drinks-list--cocktails">
            {cocktails.map(renderItemRow)}
          </ul>
        </section>

        {/* 3. Section 2: MOCKTAIL with Chalk SVG Art */}
        <section className="mb-drinks-section mb-drinks-section--mocktails" aria-label="Mocktails">
          <div className="mb-drinks-section-heading">
            <h2 className="mb-drinks-section-title">MOCKTAIL</h2>
            <span className="mb-drinks-section-rule" aria-hidden="true" />
          </div>
          <div className="mb-drinks-mocktail-layout">
            <div className="mb-drinks-mocktail-items">
              <ul className="mb-drinks-list mb-drinks-list--mocktails">
                {mocktails.map(renderItemRow)}
              </ul>
            </div>
            {/* Delicate chalk-style line art SVG illustration of cocktail glass with lime wheel & straw */}
            <CocktailChalkIllustration />
          </div>
        </section>

        {/* 4. Section 3: DESSERTS (2-Column Grid) */}
        <section className="mb-drinks-section mb-drinks-section--desserts" aria-label="Desserts">
          <div className="mb-drinks-section-heading">
            <h2 className="mb-drinks-section-title">DESSERTS</h2>
            <span className="mb-drinks-section-rule" aria-hidden="true" />
          </div>
          <div className="mb-drinks-desserts-grid">
            <ul className="mb-drinks-list mb-drinks-desserts-col">
              {dessertCol1.map(renderItemRow)}
            </ul>
            <ul className="mb-drinks-list mb-drinks-desserts-col">
              {dessertCol2.map(renderItemRow)}
            </ul>
          </div>
        </section>

        {/* Optional Folio / Page Number Footer */}
        {pageNumber !== null && (
          <footer className="mb-drinks-footer" aria-hidden="true">
            <div className="mb-drinks-footer-rule" />
            <span className="mb-drinks-page-number">{pageNumber}</span>
          </footer>
        )}
      </div>
    </div>
  );
}
