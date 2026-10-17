import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import Navbar from '../components/Navbar';
import CategoryBar from '../components/CategoryBar';
import MenuItemCard from '../components/MenuItemCard';
import CartDrawer from '../components/CartDrawer';
import FoodDetailModal from '../components/FoodDetailModal';
import { 
  Search, 
  X, 
  Leaf, 
  Flame, 
  Zap, 
  ShoppingBag, 
  ArrowRight, 
  Trash2, 
  CheckCircle2, 
  UtensilsCrossed, 
  Sparkles,
  Info,
  QrCode,
  Lock,
  ChefHat,
  Clock,
  BellRing,
  LayoutGrid,
  Rows3
} from 'lucide-react';

// Default initial menu items for full offline or standalone browsing
const DEFAULT_MENU_ITEMS = [
  // Starters
  {
    id: 'starter-1',
    name: 'Truffle Parmesan Fries',
    description: 'Crispy skin-on fries tossed with white truffle oil, shaved aged parmesan, and fresh parsley with garlic aioli.',
    price: 7.99,
    category: 'Starters',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '10 min',
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Yukon Gold Potatoes', 'White Truffle Oil', 'Aged Reggiano Parmesan', 'Fresh Flat Parsley', 'Sea Salt Flakes', 'Roasted Garlic Aioli']
  },
  {
    id: 'starter-2',
    name: 'Spicy Buffalo Wings',
    description: 'Crispy chicken wings glazed in our chef signature fiery cayenne sauce, served with blue cheese and celery sticks.',
    price: 10.99,
    category: 'Starters',
    isVeg: false,
    isSpicy: true,
    isPopular: true,
    prepTime: '15 min',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527477321005-4d01d75b2d5c?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Farm Fresh Wings', 'Fiery Cayenne Glaze', 'Wisconsin Blue Cheese Dip', 'Crisp Celery Sticks', 'Garlic Butter']
  },
  {
    id: 'starter-3',
    name: 'Garlic Butter Cheesy Bread',
    description: 'Freshly baked artisanal sourdough baguette filled with herb garlic butter and melted mozzarella cheese.',
    price: 6.50,
    category: 'Starters',
    isVeg: true,
    isSpicy: false,
    prepTime: '8 min',
    image: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Artisanal Sourdough', 'Roasted Garlic Butter', 'Fior di Latte Mozzarella', 'Oregano', 'Virgin Olive Oil']
  },
  {
    id: 'starter-4',
    name: 'Crispy Salt & Pepper Calamari',
    description: 'Tender Monterey squid lightly crusted with five-spice sea salt, served with lemon wedges and house tartar.',
    price: 11.50,
    category: 'Starters',
    isVeg: false,
    isSpicy: false,
    prepTime: '12 min',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Monterey Squid Rings', 'Five-Spice Sea Salt', 'Fresh Lemon Wedges', 'House Pickled Tartar', 'Micro Greens']
  },

  // Mains
  {
    id: 'main-1',
    name: 'Grilled Ribeye Steak (10oz)',
    description: 'Prime dry-aged Angus ribeye char-grilled to perfection, accompanied by roasted garlic herb butter and rosemary baby potatoes.',
    price: 24.99,
    category: 'Mains',
    isVeg: false,
    isSpicy: false,
    isPopular: true,
    prepTime: '20 min',
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1558030006-450675393462?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504973960431-1c467e159aa4?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Prime Angus Ribeye Cut', 'Herb Garlic Confit Butter', 'Rosemary Roasted Baby Potatoes', 'Charred Asparagus', 'Flaky Maldon Salt']
  },
  {
    id: 'main-2',
    name: 'Fiery Peri-Peri Grilled Chicken',
    description: 'Half chicken marinated 24 hours in authentic African bird eye peri-peri marinade, flame grilled with charred lime.',
    price: 17.50,
    category: 'Mains',
    isVeg: false,
    isSpicy: true,
    isPopular: true,
    prepTime: '18 min',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527477321005-4d01d75b2d5c?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Free-Range Half Chicken', 'African Bird Eye Peri-Peri', 'Smoked Sweet Paprika', 'Charred Key Lime', 'Garlic Herb Glaze']
  },
  {
    id: 'main-3',
    name: 'Pan-Seared Atlantic Salmon',
    description: 'Wild salmon fillet served over a bed of sautéed asparagus, cherry tomatoes, and saffron lemon-dill cream sauce.',
    price: 21.99,
    category: 'Mains',
    isVeg: false,
    isSpicy: false,
    prepTime: '15 min',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Wild Atlantic Salmon Fillet', 'Fresh Sautéed Asparagus', 'Heirloom Cherry Tomatoes', 'Saffron Dill Velouté', 'Lemon Zest']
  },
  {
    id: 'main-4',
    name: 'Wild Forest Mushroom Risotto',
    description: 'Arborio rice slowly simmered with porcini stock, shiitake mushrooms, white truffle oil, and aged Pecorino.',
    price: 16.50,
    category: 'Mains',
    isVeg: true,
    isSpicy: false,
    prepTime: '18 min',
    image: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1621996346565-e3d5d6281290?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Italian Arborio Rice', 'Dried Porcini & Shiitake Stock', 'White Truffle Essence', 'Aged Pecorino Romano', 'Fresh Thyme']
  },

  // Burgers
  {
    id: 'burger-1',
    name: 'SmartDine Classic Smash Burger',
    description: 'Two smashed prime beef patties, double American cheese, caramelized onions, crisp pickles, and secret burger spread on a brioche bun.',
    price: 13.50,
    category: 'Burgers',
    isVeg: false,
    isSpicy: false,
    isPopular: true,
    prepTime: '12 min',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Double Angus Beef Patties', 'Melted American Sharp Cheese', 'Slow Caramelized Onions', 'Dill Pickles', 'Signature Truffle Mayo', 'Brioche Bun']
  },
  {
    id: 'burger-2',
    name: 'The Volcano Jalapeño Burger',
    description: 'Spiced beef patty topped with grilled pickled jalapeños, pepper jack cheese, crispy fried onion strings, and habanero lava mayo.',
    price: 14.99,
    category: 'Burgers',
    isVeg: false,
    isSpicy: true,
    isPopular: true,
    prepTime: '14 min',
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Spiced Angus Beef Patty', 'Grilled Pickled Jalapeños', 'Melted Pepper Jack Cheese', 'Crispy Onion Strings', 'Habanero Lava Aioli']
  },
  {
    id: 'burger-3',
    name: 'Beyond Plant-Based Burger',
    description: '100% plant-based grilled patty, vegan cheddar, butterhead lettuce, vine tomato, and avocado chimichurri on a toasted vegan potato bun.',
    price: 14.50,
    category: 'Burgers',
    isVeg: true,
    isSpicy: false,
    prepTime: '12 min',
    image: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['100% Plant-Based Patty', 'Vegan Aged Cheddar', 'Butterhead Lettuce', 'Ripe Vine Tomato', 'Avocado Chimichurri', 'Potato Bun']
  },

  // Beverages
  {
    id: 'beverage-1',
    name: 'Signature Sparkling Lemonade',
    description: 'Freshly squeezed lemons with organic agave syrup, crushed mint, and sparkling mineral water.',
    price: 4.50,
    category: 'Beverages',
    isVeg: true,
    isSpicy: false,
    prepTime: '3 min',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556881286-fc6915169721?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Eureka Fresh Lemons', 'Organic Blue Agave', 'Garden Mint Sprigs', 'Sparkling San Pellegrino', 'Crushed Ice']
  },
  {
    id: 'beverage-2',
    name: 'Fiery Ginger Spiced Cooler',
    description: 'House brewed cold ginger root infusion, fresh lime, bird chili hint, crushed ice, and club soda.',
    price: 4.99,
    category: 'Beverages',
    isVeg: true,
    isSpicy: true,
    prepTime: '4 min',
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1556881286-fc6915169721?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['Fresh Cold-Pressed Ginger', 'Key Lime Juice', 'Subtle Bird Chili Kiss', 'Club Soda', 'Raw Turbinado Sugar']
  },

  // Desserts
  {
    id: 'dessert-1',
    name: 'Molten Chocolate Lava Cake',
    description: 'Warm Belgian dark chocolate cake with a gooey flowing center, paired with Madagascar vanilla bean ice cream.',
    price: 7.99,
    category: 'Desserts',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '10 min',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&auto=format&fit=crop&q=80'
    ],
    makingVideoUrl: '/videos/reel-chef.mp4',
    ingredients: ['70% Belgian Dark Chocolate', 'European Sweet Butter', 'Madagascar Bourbon Vanilla Gelato', 'Dutch Cocoa Dust', 'Fresh Raspberries']
  },
  {
    id: 'dessert-2',
    name: 'Classic Venetian Tiramisu',
    description: 'Espresso dipped ladyfingers layered with whipped mascarpone cream and dusted with raw Dutch cocoa.',
    price: 8.50,
    category: 'Desserts',
    isVeg: true,
    isSpicy: false,
    prepTime: '5 min',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1586040140372-b424ae30a290?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534432182912-63863115e106?w=900&auto=format&fit=crop&q=80'
    ],
  }
];

// Canonical Michelin-grade Bistro Category Definitions
export const CANONICAL_CATEGORIES = [
  {
    key: 'starters',
    id: 'Starters',
    title: 'Starters & Appetizers',
    icon: '🥗',
    subtitle: 'Crispy appetizers, signature bites, and table warmups'
  },
  {
    key: 'mains',
    id: 'Mains',
    title: "Chef's Signature Mains",
    icon: '🥩',
    subtitle: 'Prime dry-aged steaks, flame-grilled specialties, and fresh catches'
  },
  {
    key: 'burgers',
    id: 'Burgers',
    title: 'Artisan Burgers & Sandwiches',
    icon: '🍔',
    subtitle: 'Artisan smashed wagyu patties, melted cheese, and toasted brioche'
  },
  {
    key: 'desserts',
    id: 'Desserts',
    title: 'Decadent Desserts',
    icon: '🍰',
    subtitle: 'Warm lava cakes, artisanal tiramisu, and house sweets'
  },
  {
    key: 'beverages',
    id: 'Beverages',
    title: 'Refreshing Beverages & Mocktails',
    icon: '🍹',
    subtitle: 'Hand-crafted iced coolers, spritzers, and organic teas'
  }
];

export const getCategoryMetadata = (categoryName = '') => {
  const lower = String(categoryName).toLowerCase().trim();
  if (lower.includes('start') || lower.includes('appetiz')) return CANONICAL_CATEGORIES[0];
  if (lower.includes('main') || lower.includes('steak') || lower.includes('meat') || lower.includes('entree')) return CANONICAL_CATEGORIES[1];
  if (lower.includes('burger') || lower.includes('sandwich')) return CANONICAL_CATEGORIES[2];
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('cake')) return CANONICAL_CATEGORIES[3];
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('cocktail') || lower.includes('mocktail')) return CANONICAL_CATEGORIES[4];
  
  return {
    key: lower.replace(/[^a-z0-9]+/g, '-'),
    id: categoryName,
    title: categoryName,
    icon: '🍽️',
    subtitle: 'Chef curated creations prepared fresh to order'
  };
};

export default function CustomerMenu({
  menuItems: propMenuItems,
  onPlaceOrder,
  tableFromProp
}) {
  // 0. Layout View Mode ('showcase' for 1-by-1 alternating editorial, 'grid' for 2-column compact modern, 'list' for horizontal rows)
  const [layoutMode, setLayoutMode] = useState('showcase');
  const [activeScrollCategory, setActiveScrollCategory] = useState('All');

  // 1. Fixed Table Detection & Locking (No automatic table selection modal)
  const [tableNumber, setTableNumber] = useState('');
  const [isTableLocked, setIsTableLocked] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [customTableInput, setCustomTableInput] = useState('');

  // 2. Interactive Food Details & Multimedia Modal
  const [selectedDishModal, setSelectedDishModal] = useState(null);

  // 3. Live Customer Order Status Tracking
  const [activeOrder, setActiveOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('smartdine_active_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 4. Network state
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // 5. Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false);
  const [spicyFilter, setSpicyFilter] = useState(false);

  // 6. Cart State { [itemId]: { item, quantity, note, voiceNoteUrl } }
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('smartdine_cart_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 7. Drawer & Modal States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);
  const [toastMessage, setToMessage] = useState(null);

  // Monitor network online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('smartdine_cart_items', JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  }, [cart]);

  // Fixed Table QR Code Detection: automatically lock table ID from URL query param
  useEffect(() => {
    if (tableFromProp) {
      const tbl = String(tableFromProp);
      setTableNumber(tbl);
      setIsTableLocked(true);
      localStorage.setItem('smartdine_table', tbl);
      return;
    }

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlTable = searchParams.get('table') || searchParams.get('tableNumber') || searchParams.get('t');

      if (urlTable) {
        setTableNumber(urlTable);
        setIsTableLocked(true);
        localStorage.setItem('smartdine_table', urlTable);
      } else {
        const storedTable = localStorage.getItem('smartdine_table');
        if (storedTable) {
          setTableNumber(storedTable);
          setIsTableLocked(true);
        } else {
          // Fixed QR workflow: No table prompt popup for customers!
          // We show an unobtrusive notice at the top with a demo override.
          setIsTableLocked(false);
        }
      }
    }
  }, [tableFromProp]);

  // Set selected table manually (for testing/demo)
  const handleSelectTable = (num) => {
    const chosen = String(num).trim();
    if (!chosen) return;
    setTableNumber(chosen);
    setIsTableLocked(true);
    localStorage.setItem('smartdine_table', chosen);
    setIsTableModalOpen(false);
    showToast(`Table locked to Table ${chosen}! 🍽️`);
  };

  // Toast notification helper
  const showToast = (msg) => {
    setToMessage(msg);
    setTimeout(() => {
      setToMessage(null);
    }, 4000);
  };

  // Cart operations
  const handleAddToCart = (item) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const newQty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [item.id]: {
          item,
          quantity: newQty,
          note: existing ? existing.note : ''
        }
      };
    });
  };

  const handleUpdateQuantity = (itemId, newQty) => {
    setCart((prev) => {
      if (newQty <= 0) {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      }
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          quantity: newQty
        }
      };
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const handleUpdateNote = (itemId, noteText) => {
    setCart((prev) => {
      if (!prev[itemId]) {
        // If not in cart yet, add it with 1 qty and note
        const found = allMenuItems.find((i) => i.id === itemId);
        if (found) {
          return {
            ...prev,
            [itemId]: { item: found, quantity: 1, note: noteText }
          };
        }
        return prev;
      }
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          note: noteText
        }
      };
    });
    showToast('Dish preferences saved! ✨');
  };

  // Query real-time Convex menu
  const convexMenu = useQuery(api.menu.getMenu);

  // Auto-seed Convex menu if connected and empty
  const seedMenuMutation = useMutation(api.menu.seedMenu);
  useEffect(() => {
    if (Array.isArray(convexMenu) && convexMenu.length === 0) {
      seedMenuMutation().catch(() => {});
    }
  }, [convexMenu, seedMenuMutation]);

  // Convex live order subscription for this table
  const tableNumParsed = Number(tableNumber) || (tableNumber ? parseInt(String(tableNumber).replace(/\D/g, ''), 10) : undefined);
  const liveTableOrders = useQuery(
    api.orders.getOrders,
    tableNumParsed ? { tableNumber: tableNumParsed } : 'skip'
  );

  // Direct subscription to the customer's specific active order by ID or orderNumber
  const rawSearchId = activeOrder?.orderNumber || activeOrder?.orderId || activeOrder?._id;
  const activeOrderSearchId = typeof rawSearchId === 'string' && rawSearchId.trim().length > 0
    ? rawSearchId.trim()
    : (rawSearchId ? String(rawSearchId) : null);
  const liveOrder = useQuery(
    api.orders.getOrderById,
    activeOrderSearchId ? { orderId: activeOrderSearchId } : 'skip'
  );

  // Synchronize activeOrder status when KDS updates it in Convex
  useEffect(() => {
    // 1. Prioritize direct liveOrder match
    if (liveOrder) {
      setActiveOrder((prev) => {
        const updated = {
          ...(prev || {}),
          _id: liveOrder._id,
          orderId: liveOrder.orderNumber || liveOrder._id,
          orderNumber: liveOrder.orderNumber,
          status: liveOrder.status, // 'pending' | 'preparing' | 'ready' | 'served'
          totalAmount: liveOrder.totalAmount,
          items: liveOrder.items || prev?.items || []
        };
        try {
          localStorage.setItem('smartdine_active_order', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      return;
    }

    // 2. Otherwise match from liveTableOrders
    if (liveTableOrders && liveTableOrders.length > 0) {
      let match = null;
      if (activeOrder) {
        match = liveTableOrders.find(
          (o) => o._id === activeOrder._id || o.orderNumber === activeOrder.orderId || o.orderNumber === activeOrder.orderNumber
        );
      }
      if (!match) {
        match = liveTableOrders.find((o) => o.status !== 'served') || liveTableOrders[0];
      }
      if (match) {
        setActiveOrder((prev) => {
          const updated = {
            ...(prev || {}),
            _id: match._id,
            orderId: match.orderNumber || match._id,
            orderNumber: match.orderNumber,
            status: match.status,
            totalAmount: match.totalAmount,
            items: match.items || prev?.items || []
          };
          try {
            localStorage.setItem('smartdine_active_order', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    }
  }, [liveOrder, liveTableOrders]);

  const convexFormattedItems = useMemo(() => {
    if (!convexMenu || !Array.isArray(convexMenu) || convexMenu.length === 0) return null;
    const list = [];
    convexMenu.forEach((cat) => {
      (cat.items || []).forEach((item) => {
        list.push({
          id: item._id,
          _id: item._id,
          name: item.name,
          title: item.name,
          description: item.description,
          price: item.price,
          category: cat.name,
          categorySlug: cat.slug || item.categorySlug,
          isVeg: Boolean(item.isVeg),
          isSpicy: Boolean(item.isSpicy),
          isAvailable: item.isAvailable !== false,
          image: item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
          imageUrl: item.imageUrl,
          images: Array.isArray(item.images) && item.images.length > 0
            ? item.images
            : (item.imageUrl ? [item.imageUrl] : []),
          makingVideoUrl: (item.makingVideoUrl && !item.makingVideoUrl.includes('mixkit.co'))
            ? item.makingVideoUrl
            : '/videos/reel-chef.mp4',
        });
      });
    });
    return list.length > 0 ? list : null;
  }, [convexMenu]);


  // Menu items list (Convex Cloud -> Props -> Default Offline)
  const allMenuItems = useMemo(() => {
    return convexFormattedItems || (propMenuItems && propMenuItems.length > 0 ? propMenuItems : DEFAULT_MENU_ITEMS);
  }, [convexFormattedItems, propMenuItems]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return allMenuItems.filter((dish) => {
      // Category filter
      if (selectedCategory && selectedCategory.toLowerCase() !== 'all') {
        const dishCategory = (dish.category || '').toLowerCase();
        if (dishCategory !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Vegetarian filter
      if (vegOnlyFilter) {
        const isVeg = dish.isVeg === true || dish.veg === true || (Array.isArray(dish.tags) && dish.tags.some(t => /veg/i.test(t)));
        if (!isVeg) return false;
      }

      // Spicy filter
      if (spicyFilter) {
        const isSpicy = dish.isSpicy === true || dish.spicy === true || (Array.isArray(dish.tags) && dish.tags.some(t => /spic/i.test(t)));
        if (!isSpicy) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (dish.name || dish.title || '').toLowerCase().includes(query);
        const descMatch = (dish.description || '').toLowerCase().includes(query);
        const categoryMatch = (dish.category || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !categoryMatch) return false;
      }

      return true;
    });
  }, [allMenuItems, selectedCategory, vegOnlyFilter, spicyFilter, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { All: allMenuItems.length };
    allMenuItems.forEach((item) => {
      const cat = item.category || 'Mains';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allMenuItems]);

  // Categories list sorted canonically with rich metadata
  const categoriesList = useMemo(() => {
    const rawCategories = Array.from(new Set(allMenuItems.map((item) => item.category || 'Mains')));
    
    // Canonical ordering: Starters, Mains, Burgers, Desserts, Beverages
    const orderMap = { starters: 1, mains: 2, burgers: 3, desserts: 4, beverages: 5 };
    rawCategories.sort((a, b) => {
      const ordA = orderMap[getCategoryMetadata(a).key] || 99;
      const ordB = orderMap[getCategoryMetadata(b).key] || 99;
      return ordA - ordB;
    });

    const list = [
      { id: 'All', name: 'All Dishes', icon: '✨', count: allMenuItems.length }
    ];

    rawCategories.forEach((cat) => {
      const meta = getCategoryMetadata(cat);
      const count = allMenuItems.filter((i) => (i.category || '').toLowerCase() === cat.toLowerCase()).length;
      list.push({
        id: cat,
        name: meta.title,
        icon: meta.icon,
        count
      });
    });

    return list;
  }, [allMenuItems]);

  // Group filtered items into canonical structured Category sections
  const categorizedSections = useMemo(() => {
    const map = new Map();

    // Initialize canonical sections in exact order
    CANONICAL_CATEGORIES.forEach((cat) => {
      map.set(cat.key, {
        categoryKey: cat.key,
        canonicalId: cat.id,
        title: cat.title,
        icon: cat.icon,
        subtitle: cat.subtitle,
        items: []
      });
    });

    filteredItems.forEach((dish) => {
      const meta = getCategoryMetadata(dish.category || 'Mains');
      if (!map.has(meta.key)) {
        map.set(meta.key, {
          categoryKey: meta.key,
          canonicalId: meta.id,
          title: meta.title,
          icon: meta.icon,
          subtitle: meta.subtitle,
          items: []
        });
      }
      map.get(meta.key).items.push(dish);
    });

    return Array.from(map.values()).filter((section) => section.items.length > 0);
  }, [filteredItems]);

  // Scroll spy to highlight active CategoryBar pill when in 'All' mode
  useEffect(() => {
    if (selectedCategory !== 'All') return;

    const handleScroll = () => {
      const scrollPos = window.scrollY + 180;
      let currentId = 'All';

      for (const section of categorizedSections) {
        const el = document.getElementById(`cat-section-${section.categoryKey}`);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            currentId = section.canonicalId;
            break;
          }
        }
      }

      if (window.scrollY < 220) {
        currentId = 'All';
      }

      setActiveScrollCategory(currentId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedCategory, categorizedSections]);

  // Smooth scroll or cleanly filter when CategoryBar pills are clicked
  const handleSelectCategory = (catId) => {
    if (catId === 'All') {
      setSelectedCategory('All');
      const root = document.getElementById('menu-content-root');
      if (root) {
        root.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const meta = getCategoryMetadata(catId);
    const sectionEl = document.getElementById(`cat-section-${meta.key}`);

    if (selectedCategory === 'All' && sectionEl) {
      // Smooth scroll directly to that category section
      sectionEl.scrollIntoView({ behavior: 'smooth' });
      setActiveScrollCategory(catId);
    } else {
      // Cleanly filter to that category
      setSelectedCategory(catId);
      const root = document.getElementById('menu-content-root');
      if (root) {
        root.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Cart summary calculations
  const cartSummary = useMemo(() => {
    const items = Object.values(cart);
    const totalCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
    const subtotal = items.reduce((acc, curr) => {
      const price = typeof curr.item.price === 'number' ? curr.item.price : parseFloat(curr.item.price) || 0;
      return acc + price * curr.quantity;
    }, 0);
    const tax = subtotal * 0.05; // 5% estimated tax
    const total = subtotal + tax;

    return { totalCount, subtotal, tax, total, items };
  }, [cart]);

  // Handle Waiter Called from Navbar
  const handleWaiterCalled = (reason, table) => {
    showToast(`🛎️ Waiter called for Table ${table || tableNumber || 'your table'} (${reason})`);
  };

  // Submit Order handler
  const handleCheckoutOrder = () => {
    if (!tableNumber) {
      setIsTableModalOpen(true);
      return;
    }
    const orderPayload = {
      orderId: `SD-${Date.now().toString().slice(-4)}`,
      tableNumber,
      items: cartSummary.items.map((i) => ({
        id: i.item.id,
        name: i.item.name || i.item.title,
        price: i.item.price,
        quantity: i.quantity,
        note: i.note || ''
      })),
      subtotal: cartSummary.subtotal,
      tax: cartSummary.tax,
      total: cartSummary.total,
      timestamp: new Date().toISOString(),
      status: 'pending',
      isOfflineSyncPending: !isOnline
    };

    if (onPlaceOrder) {
      onPlaceOrder(orderPayload);
    }

    setActiveOrder(orderPayload);
    try {
      localStorage.setItem('smartdine_active_order', JSON.stringify(orderPayload));
    } catch (e) {}

    setOrderSuccessModal(orderPayload);
    setCart({});
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-stone-100 pb-32 selection:bg-[#FF5A26] selection:text-white relative">
      {/* =====================================================================
          WorldPlate Flame Orange & Noir Ambient Atmosphere (GPU 60 FPS)
         ===================================================================== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none">
        {/* Soft Radial Flame Warmth Base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-20%,rgba(255,90,38,0.14),rgba(10,10,12,0)_75%)]" />

        {/* 1. Flame Coral Warm Ambient Orb (Top Left) */}
        <div className="absolute -top-32 -left-28 w-[450px] h-[450px] sm:w-[580px] sm:h-[580px] rounded-full bg-gradient-to-tr from-[#FF5A26]/25 via-[#FF7A45]/15 to-transparent blur-[130px] animate-ambient-drift-1" />

        {/* 2. Soft Golden Hearth Orb (Top Right) */}
        <div className="absolute top-16 -right-32 w-[400px] h-[400px] sm:w-[520px] sm:h-[520px] rounded-full bg-gradient-to-bl from-amber-500/18 via-[#FF5A26]/12 to-transparent blur-[120px] animate-ambient-drift-2" />

        {/* 3. Deep Noir Hearth Glow (Middle Left) */}
        <div className="absolute top-[42%] -left-36 w-[420px] h-[420px] rounded-full bg-gradient-to-r from-[#FF5A26]/16 via-amber-600/10 to-transparent blur-[140px] animate-ambient-drift-3" />

        {/* 4. Honey Hearth Warm Glow Accent (Bottom Center / Right) */}
        <div className="absolute bottom-12 right-[8%] w-[480px] h-[480px] rounded-full bg-gradient-to-tl from-[#FF7A45]/18 via-amber-500/10 to-transparent blur-[130px] animate-ambient-pulse" />

        {/* 5. Floating Culinary Ember Particles */}
        <div className="ember-sparkle sparkle-1" />
        <div className="ember-sparkle sparkle-2" />
        <div className="ember-sparkle sparkle-3" />
        <div className="ember-sparkle sparkle-4" />
        <div className="ember-sparkle sparkle-5" />
        <div className="ember-sparkle sparkle-6" />
        <div className="ember-sparkle sparkle-7" />
        <div className="ember-sparkle sparkle-8" />

        {/* 6. Subtle Micro-texture Dot Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,122,69,0.035)_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
      </div>
      
      {/* 1. Header Navigation */}
      <Navbar
        tableNumber={tableNumber}
        isOnline={isOnline}
        onCallWaiter={handleWaiterCalled}
        onChangeTable={() => setIsTableModalOpen(true)}
        cartItemCount={cartSummary.totalCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* 2. Offline Notice Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2.5 shadow-xs border-b border-amber-700/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 fill-white shrink-0 animate-pulse" />
              <span>
                ⚡ You are offline! You can still browse the menu and add items to your cart.
              </span>
            </div>
            <span className="hidden md:inline-block text-[11px] bg-amber-700/60 px-2 py-0.5 rounded-full font-medium">
              Offline-First Activated
            </span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 relative z-10">

        {/* 1. WorldPlate Hero Banner & Fixed Table QR Badge (Screenshots 1 & 2) */}
        <div id="menu-hero" className="relative mb-8 rounded-3xl overflow-hidden bg-gradient-to-br from-[#121216] via-[#16161c] to-[#0a0a0c] text-white p-6 sm:p-10 shadow-2xl border border-zinc-800/90 animate-fadeIn">
          {/* Subtle Ambient Flame Glow Orbs */}
          <div className="absolute top-0 right-10 w-96 h-96 bg-[#FF5A26]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-[#FF7A45]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            {/* Left Column: Big Headline & Action Buttons (Screenshot 1) */}
            <div className="max-w-xl text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-[#FF7A45] text-xs font-bold mb-4 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5A26]" />
                <span className="tracking-wide uppercase text-[10px] font-extrabold">Taste the Tradition, Served Fresh Daily</span>
              </div>

              {/* Exact Display Typography from Screenshot 1 */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
                Experience the <br />
                <span className="inline-flex flex-wrap items-center gap-2.5 sm:gap-3.5 my-1.5">
                  <span className="text-[#FF5A26] underline decoration-[#FF5A26]/60 underline-offset-8 flame-text-glow">Taste</span>
                  <span className="inline-flex items-center -space-x-2 px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700/80 shadow-md">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80" alt="Diner" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover ring-2 ring-[#0a0a0c]" />
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80" alt="Diner" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover ring-2 ring-[#0a0a0c]" />
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80" alt="Diner" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover ring-2 ring-[#0a0a0c]" />
                  </span>
                  <span className="text-white">of the</span>
                </span> <br />
                World
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-zinc-400 mt-4 leading-relaxed font-normal">
                From classic favorites to exotic delights, explore a diverse menu inspired by cuisines from across the globe and freshly prepared by master chefs.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 mt-6">
                <a
                  href="#menu-content-root"
                  className="px-6 py-3 rounded-full flame-gradient-btn text-white text-xs sm:text-sm font-black shadow-lg shadow-[#FF5A26]/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore Menu</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </a>

                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(true)}
                  className="px-5 py-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 hover:border-[#FF5A26]/50 text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF5A26]" />
                  <span>{tableNumber ? `Table ${tableNumber}` : 'Set Dining Table'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                </button>
              </div>
            </div>

            {/* Right Column: Floating Ceramic Artisanal Ramen Bowl (Screenshot 1) */}
            <div className="relative shrink-0 flex items-center justify-center select-none py-2 lg:py-6">
              {/* Radiant Orange Glow Behind Bowl */}
              <div className="absolute w-72 h-72 sm:w-80 sm:h-80 bg-[#FF5A26]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
              
              {/* Floating Ceramic Dish */}
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-92 md:h-92 rounded-full p-2.5 bg-gradient-to-tr from-[#FF5A26]/50 via-transparent to-[#FF7A45]/30 shadow-2xl">
                <div className="w-full h-full rounded-full overflow-hidden shadow-2xl ring-4 ring-white/10 hover:scale-104 transition-transform duration-700 bg-zinc-900">
                  <img
                    src="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900&auto=format&fit=crop&q=80"
                    alt="WorldPlate Signature Artisanal Ramen Bowl"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                  />
                </div>

                {/* Floating Highlight Badge */}
                <div className="absolute -bottom-2 -left-2 bg-[#161619]/95 backdrop-blur-md border border-zinc-800 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A26] animate-ping" />
                  <span className="text-xs font-black text-white">Chef Special</span>
                  <span className="text-[10px] text-[#FF7A45] font-bold">&bull; Fresh Daily</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stadium Discount Banner from Screenshot 1 */}
          <div className="relative mt-8 rounded-3xl sm:rounded-full bg-white text-neutral-900 shadow-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden border border-zinc-200">
            {/* Left Sub-Section */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left z-10">
              <div>
                <h4 className="font-black text-sm sm:text-base text-neutral-950 tracking-tight">
                  Great food and lots of discounted prices
                </h4>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <div className="flex -space-x-2">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80" alt="Diner" className="w-6 h-6 rounded-full object-cover ring-2 ring-white" />
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80" alt="Diner" className="w-6 h-6 rounded-full object-cover ring-2 ring-white" />
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80" alt="Diner" className="w-6 h-6 rounded-full object-cover ring-2 ring-white" />
                  </div>
                  <span className="text-xs font-extrabold text-neutral-800">
                    +40 People grabbed the offer
                  </span>
                </div>
              </div>
            </div>

            {/* Center Notched Divider with 2 Circular Cutouts from Screenshot 1 */}
            <div className="hidden md:flex flex-col items-center justify-between h-14 relative px-2">
              <div className="w-4 h-4 rounded-full bg-[#0a0a0c] -mt-6 shadow-inner" />
              <div className="h-8 w-px border-l-2 border-dashed border-neutral-300" />
              <div className="w-4 h-4 rounded-full bg-[#0a0a0c] -mb-6 shadow-inner" />
            </div>

            {/* Right Sub-Section: 50% Offer + Dish Plate */}
            <div className="flex items-center gap-4 z-10">
              <div className="text-right">
                <span className="block text-2xl sm:text-4xl font-black text-neutral-950 tracking-tight leading-none">
                  50%
                </span>
                <span className="text-[11px] font-black uppercase text-neutral-600 tracking-wider">
                  Offer On Now
                </span>
              </div>
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-lg border-2 border-white ring-2 ring-[#FF5A26]/40 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80"
                  alt="Gourmet Salad Special"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-0 right-0 w-6 h-6 bg-[#FF5A26] text-white text-[9px] font-black flex items-center justify-center rounded-bl-lg">
                  ★
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Live Customer Order Status Tracker */}
        {activeOrder && activeOrder.status !== 'served' && (
          <div className="mb-6 bg-[#161619]/95 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-[#FF7A45] flex items-center justify-center font-black text-xs shadow-2xs">
                  {tableNumber ? `T${tableNumber}` : 'ORD'}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                    <span>Live Kitchen Tracker</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </h4>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Order #{activeOrder.orderId || activeOrder.orderNumber || 'Active'} &bull; Table {tableNumber || activeOrder.tableNumber}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 shadow-xs">
                  {activeOrder.status === 'preparing' ? '🔥 Cooking in Kitchen' : activeOrder.status === 'ready' ? '🛎️ Ready to Serve' : '⏳ Order Received'}
                </span>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            {(() => {
              const stepOrder = ['pending', 'preparing', 'ready', 'served'];
              const currentIndex = Math.max(0, stepOrder.indexOf(activeOrder.status || 'pending'));
              const progressPercent = (currentIndex / (stepOrder.length - 1)) * 100;

              return (
                <div className="relative pt-2 pb-1">
                  <div className="absolute top-6 left-8 right-8 h-1 bg-zinc-800 -translate-y-1/2 z-0 rounded-full" />
                  <div
                    className="absolute top-6 left-8 h-1 bg-gradient-to-r from-[#FF5A26] via-[#FF7A45] to-emerald-400 -translate-y-1/2 z-0 rounded-full transition-all duration-700 shadow-xs"
                    style={{ width: `calc((100% - 4rem) * ${progressPercent / 100})` }}
                  />

                  <div className="relative z-10 grid grid-cols-4 gap-2 text-center">
                    {[
                      { id: 'pending', label: 'Received', icon: CheckCircle2 },
                      { id: 'preparing', label: 'Cooking', icon: ChefHat },
                      { id: 'ready', label: 'Plated', icon: BellRing },
                      { id: 'served', label: 'Served', icon: UtensilsCrossed }
                    ].map((step, idx) => {
                      const isCompleted = currentIndex >= idx;
                      const isCurrent = currentIndex === idx;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.id} className="flex flex-col items-center">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                              isCurrent
                                ? 'flame-gradient-btn text-white ring-4 ring-[#FF5A26]/30 font-bold scale-110 shadow-lg shadow-[#FF5A26]/40'
                                : isCompleted
                                ? 'bg-emerald-600 text-white font-medium shadow-md shadow-emerald-600/25'
                                : 'bg-zinc-800/90 text-zinc-500 border border-zinc-700'
                            }`}
                          >
                            <StepIcon className="w-4 h-4" />
                          </div>
                          <span className={`text-[11px] mt-1.5 font-bold tracking-tight ${isCurrent ? 'text-[#FF7A45] font-extrabold' : isCompleted ? 'text-stone-300' : 'text-stone-500'}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Search Bar & Dietary Filter Toggles */}
        <section className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search delicious dishes, ingredients, drinks..."
                className="w-full pl-10 pr-9 py-2.5 sm:py-3 text-xs sm:text-sm bg-[#161619]/90 rounded-2xl border border-zinc-800 shadow-md focus:outline-none focus:ring-2 focus:ring-[#FF5A26]/40 focus:border-[#FF5A26] placeholder:text-zinc-500 text-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dietary Toggle Pills */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setVegOnlyFilter((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                  vegOnlyFilter
                    ? 'bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-700/30 ring-1 ring-emerald-400/40'
                    : 'bg-[#161619] hover:bg-zinc-800 text-stone-300 border-zinc-800'
                }`}
              >
                <Leaf className={`w-3.5 h-3.5 ${vegOnlyFilter ? 'fill-current' : 'text-emerald-400'}`} />
                <span>Vegetarian</span>
              </button>

              <button
                type="button"
                onClick={() => setSpicyFilter((s) => !s)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                  spicyFilter
                    ? 'bg-rose-700 text-white border-rose-600 shadow-md shadow-rose-700/30 ring-1 ring-rose-400/40'
                    : 'bg-[#161619] hover:bg-zinc-800 text-stone-300 border-zinc-800'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${spicyFilter ? 'fill-current' : 'text-rose-400'}`} />
                <span>Spicy</span>
              </button>
            </div>

          </div>
        </section>

        {/* Category Horizontal Sticky Pill Bar */}
        <section className="sticky top-16 z-30 -mx-3 sm:mx-0 mb-4 bg-[#0a0a0c]/95 backdrop-blur-md pt-1 pb-1.5 border-b border-zinc-800/80 shadow-md">
          <CategoryBar
            categories={categoriesList}
            selectedCategory={selectedCategory === 'All' ? activeScrollCategory : selectedCategory}
            onSelectCategory={handleSelectCategory}
            categoryCounts={categoryCounts}
          />
        </section>

        {/* Results Info Bar & 3-way Layout Switcher (Showcase / Grid / List) */}
        <div id="menu-content-root" className="flex items-center justify-between mb-6 px-1 scroll-mt-32">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>{selectedCategory === 'All' ? 'All Menu Choices' : `${getCategoryMetadata(selectedCategory).title}`}</span>
              <span className="text-xs font-bold font-mono text-[#FF7A45] bg-[#FF5A26]/15 border border-[#FF5A26]/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                {filteredItems.length}
              </span>
            </h2>
            {(searchQuery || vegOnlyFilter || spicyFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setVegOnlyFilter(false);
                  setSpicyFilter(false);
                }}
                className="text-xs text-[#FF7A45] hover:text-[#FF5A26] font-bold cursor-pointer underline decoration-[#FF5A26] underline-offset-2 ml-1"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* View Mode Switcher: Showcase (Unboxed 1-by-1 floating) / Grid / List */}
          <div className="flex items-center bg-[#161619] p-1 rounded-2xl border border-zinc-800 shadow-md">
            <button
              type="button"
              onClick={() => setLayoutMode('showcase')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                layoutMode === 'showcase'
                  ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/30 ring-1 ring-[#FF7A45]/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Showcase View: Unboxed 1-by-1 Alternating Layout"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Showcase</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                layoutMode === 'grid'
                  ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/30 ring-1 ring-[#FF7A45]/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="2-Column Compact Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block text-[11px] font-semibold">Grid</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                layoutMode === 'list'
                  ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/30 ring-1 ring-[#FF7A45]/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Compact List View"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block text-[11px] font-semibold">List</span>
            </button>
          </div>
        </div>

        {/* Categorized Dishes Sections / Filtered Grid */}
        {filteredItems.length > 0 ? (
          <div className="space-y-12 sm:space-y-16">
            {selectedCategory === 'All' ? (
              // Categorized Grouped View
              categorizedSections.map((section) => (
                <section
                  key={section.categoryKey}
                  id={`cat-section-${section.categoryKey}`}
                  className="space-y-6 scroll-mt-32 pt-2"
                >
                  {/* Category Header with WorldPlate Stylized Brackets [ Title ] */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-white flex items-center justify-center text-lg sm:text-xl shadow-sm shrink-0">
                        {section.icon}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
                          <span className="text-[#FF5A26] font-mono text-xl sm:text-2xl font-black">[</span>
                          <span>{section.title}</span>
                          <span className="text-[#FF5A26] font-mono text-xl sm:text-2xl font-black">]</span>
                          <span className="text-[11px] sm:text-xs font-bold font-mono text-[#FF7A45] bg-[#FF5A26]/15 border border-[#FF5A26]/30 px-2 sm:px-2.5 py-0.5 rounded-full shadow-2xs ml-1">
                            {section.items.length} {section.items.length === 1 ? 'dish' : 'dishes'}
                          </span>
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-400 font-normal line-clamp-1 mt-0.5">
                          {section.subtitle}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(section.canonicalId);
                        window.scrollTo({ top: 160, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-[#FF5A26]/40 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                    >
                      <span>Filter</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#FF7A45]" />
                    </button>
                  </div>

                  {/* Dishes Display: Unboxed Showcase (1-by-1 alternating) | Grid | List */}
                  <div className={
                    layoutMode === 'showcase'
                      ? "flex flex-col"
                      : layoutMode === 'list'
                      ? "flex flex-col gap-2.5 sm:gap-3"
                      : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                  }>
                    {section.items.map((dish, dishIdx) => {
                      const inCart = cart[dish.id];
                      return (
                        <MenuItemCard
                          key={dish.id}
                          item={dish}
                          index={dishIdx}
                          layout={layoutMode}
                          cartQuantity={inCart ? inCart.quantity : 0}
                          itemNote={inCart ? inCart.note : ''}
                          onAddToCart={handleAddToCart}
                          onUpdateQuantity={handleUpdateQuantity}
                          onRemoveFromCart={handleRemoveFromCart}
                          onUpdateNote={handleUpdateNote}
                          onSelectDish={(selected) => setSelectedDishModal(selected)}
                        />
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              // Filtered Single Category View
              (() => {
                const activeMeta = getCategoryMetadata(selectedCategory);
                return (
                  <section className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-white flex items-center justify-center text-lg sm:text-xl shadow-sm shrink-0">
                          {activeMeta.icon}
                        </div>
                        <div>
                          <h3 className="text-base sm:text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
                            <span className="text-[#FF5A26] font-mono text-xl sm:text-2xl font-black">[</span>
                            <span>{activeMeta.title}</span>
                            <span className="text-[#FF5A26] font-mono text-xl sm:text-2xl font-black">]</span>
                            <span className="text-[11px] sm:text-xs font-bold font-mono text-[#FF7A45] bg-[#FF5A26]/15 border border-[#FF5A26]/30 px-2 sm:px-2.5 py-0.5 rounded-full shadow-2xs ml-1">
                              {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
                            </span>
                          </h3>
                          <p className="text-xs sm:text-sm text-zinc-400 font-normal line-clamp-1 mt-0.5">
                            {activeMeta.subtitle}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('All');
                          window.scrollTo({ top: 160, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl flame-gradient-btn text-white text-xs font-bold transition shadow-md cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>View All Categories</span>
                      </button>
                    </div>

                    {/* Dishes Display: Unboxed Showcase (1-by-1 alternating) | Grid | List */}
                    <div className={
                      layoutMode === 'showcase'
                        ? "flex flex-col"
                        : layoutMode === 'list'
                        ? "flex flex-col gap-2.5 sm:gap-3"
                        : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                    }>
                      {filteredItems.map((dish, dishIdx) => {
                        const inCart = cart[dish.id];
                        return (
                          <MenuItemCard
                            key={dish.id}
                            item={dish}
                            index={dishIdx}
                            layout={layoutMode}
                            cartQuantity={inCart ? inCart.quantity : 0}
                            itemNote={inCart ? inCart.note : ''}
                            onAddToCart={handleAddToCart}
                            onUpdateQuantity={handleUpdateQuantity}
                            onRemoveFromCart={handleRemoveFromCart}
                            onUpdateNote={handleUpdateNote}
                            onSelectDish={(selected) => setSelectedDishModal(selected)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })()
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-zinc-900/90 rounded-3xl border border-zinc-800 p-8 sm:p-12 text-center max-w-md mx-auto my-10 shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3.5 shadow-2xs">
              <UtensilsCrossed className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h3 className="font-black text-stone-900 text-lg mb-1 tracking-tight">
              No matching dishes found
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mb-5 leading-relaxed">
              Try adjusting your search query or reset dietary filters to view all chef-crafted menu choices.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setVegOnlyFilter(false);
                setSpicyFilter(false);
                setSelectedCategory('All');
              }}
              className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer"
            >
              View Full Menu
            </button>
          </div>
        )}
        {/* 3. REVIEWS TESTIMONIALS SECTION [ What They Say? ] (Screenshot 1) */}
        <section id="reviews-section" className="my-16 sm:my-24 scroll-mt-24">
          <div className="flex items-center justify-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#141418]/90 border border-zinc-800 shadow-xl">
              <span className="text-[#FF5A26] font-mono text-2xl sm:text-3xl font-black">[</span>
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <span>What They</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] flame-text-glow">Say?</span>
              </h2>
              <span className="text-[#FF5A26] font-mono text-2xl sm:text-3xl font-black">]</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                name: 'John Smith',
                rating: 5,
                image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                comment: 'Absolutely loved the flavors! The food was fresh, and the delivery was super fast. Highly recommend!',
                dish: 'Artisanal Salmon & Arugula'
              },
              {
                name: 'Elena Rostova',
                rating: 5,
                image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
                comment: 'The Woodfired Wagyu burger and the fresh made sauces were out of this world. Best dining experience in town.',
                dish: 'Truffle Wagyu Smash'
              },
              {
                name: 'Marcus Vance',
                rating: 5,
                image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
                comment: 'The interactive chef video reels and real-time QR ordering are so smooth and innovative. A true 10/10.',
                dish: 'Wild Mushroom Risotto'
              }
            ].map((review, i) => (
              <div
                key={i}
                className="bg-[#141418]/90 hover:bg-[#18181f] backdrop-blur-xl border border-zinc-800/80 hover:border-[#FF5A26]/40 p-6 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-black/50 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3.5 mb-4">
                    <img
                      src={review.image}
                      alt={review.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF5A26]/40 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h4 className="font-black text-sm text-white group-hover:text-[#FF7A45] transition-colors">
                        {review.name}
                      </h4>
                      <div className="flex items-center text-amber-400 gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star key={s} className="w-3.5 h-3.5 fill-current text-[#FF7A45]" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic font-normal">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                  <span className="text-[#FF7A45] font-semibold">{review.dish}</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Verified Diner
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. MASTER CHEF FEATURE SECTION [ Meet Our Chefs ] (Screenshot 1) */}
        <section id="chefs-section" className="my-16 sm:my-24 scroll-mt-24">
          <div className="flex items-center justify-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#141418]/90 border border-zinc-800 shadow-xl">
              <span className="text-[#FF5A26] font-mono text-2xl sm:text-3xl font-black">[</span>
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Meet Our</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] flame-text-glow">Chefs</span>
              </h2>
              <span className="text-[#FF5A26] font-mono text-2xl sm:text-3xl font-black">]</span>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#15151a] via-[#121216] to-[#0a0a0c] border border-zinc-800/90 p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Ambient Backlight */}
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#FF5A26]/12 rounded-full blur-3xl pointer-events-none" />

            {/* Chef Portrait (holding plated dish matching Screenshot 1) */}
            <div className="relative w-64 h-72 sm:w-80 sm:h-96 rounded-2xl overflow-hidden border border-zinc-700/80 shadow-2xl shrink-0 group">
              <img
                src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=900&auto=format&fit=crop&q=80"
                alt="Executive Master Chef"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-center">
                <span className="block text-sm font-black text-white">Chef Alessandro Rossi</span>
                <span className="text-[11px] text-[#FF7A45] font-bold">Executive Culinary Director</span>
              </div>
            </div>

            {/* Chef Bio Details from Screenshot 1 */}
            <div className="flex-1 text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-[#FF7A45] text-xs font-bold">
                <ChefHat className="w-3.5 h-3.5 text-[#FF5A26]" />
                <span className="uppercase text-[10px] tracking-widest font-extrabold">Michelin Recognized Craftsmanship</span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
                Culinary Mastery in Every <span className="text-[#FF5A26]">Handcrafted</span> Plate
              </h3>

              <p className="text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed font-normal">
                Our expert chefs bring passion, skill, and creativity to every dish, ensuring an unforgettable dining experience. With years of experience across top kitchens and a deep love for global flavors, they craft each meal to perfection using only the freshest, artisanal ingredients.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="#menu-content-root"
                  className="px-6 py-2.5 rounded-full flame-gradient-btn text-white text-xs sm:text-sm font-black shadow-lg shadow-[#FF5A26]/30 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <span>View Chef's Specials</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </a>

                <div className="flex items-center gap-3 text-xs text-zinc-400 font-semibold pl-2">
                  <span className="text-[#FF7A45] font-bold">★ 15+ Years</span>
                  <span>•</span>
                  <span>Organic Sourced</span>
                  <span>•</span>
                  <span>Zero Preservatives</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. WORLDPLATE LUXURY FOOTER (Screenshot 1 & 2) */}
        <footer id="footer-section" className="mt-20 pt-16 pb-12 border-t border-zinc-800/80 bg-[#070709] text-stone-300 -mx-3 sm:-mx-6 lg:-mx-8 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Col 1: WorldPlate Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5A26] to-[#FF7A45] flex items-center justify-center text-white shadow-md shadow-[#FF5A26]/40">
                  <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-xl font-black text-white tracking-tight">
                  World<span className="text-[#FF5A26]">Plate</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                At WorldPlate, we are dedicated to crafting world-class culinary experiences with high-speed tableside QR ordering and artisanal kitchen mastery.
              </p>
              {/* Social Icons in Flame Orange Circular Tiles (Screenshot 1 & 2) */}
              <div className="flex items-center gap-2 pt-1">
                {['Twitter', 'Facebook', 'TikTok', 'Instagram'].map((network, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={network}
                    className="w-8 h-8 rounded-full bg-[#FF5A26] hover:bg-[#FF7A45] text-white flex items-center justify-center text-xs font-bold transition shadow-sm hover:scale-110 cursor-pointer"
                  >
                    {network.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-white">
                Quick Links
              </h4>
              <ul className="space-y-2 text-xs text-zinc-400 font-medium">
                <li><a href="#menu-hero" className="hover:text-white transition">Home</a></li>
                <li><a href="#menu-content-root" className="hover:text-white transition">Artisanal Menu</a></li>
                <li><a href="#reviews-section" className="hover:text-white transition">Customer Reviews</a></li>
                <li><a href="#chefs-section" className="hover:text-white transition">Meet The Chefs</a></li>
              </ul>
            </div>

            {/* Col 3: Direct Contact (Phone from Screenshot 2) */}
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-white">
                Contact &amp; Reservations
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                Dine-in tableside assistance, private catering &amp; event reservations:
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-black text-[#FF7A45]">
                <span>📞</span>
                <span>+20 654 87 432</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">
                Open Daily: 10:00 AM – 11:30 PM
              </p>
            </div>

            {/* Col 4: Newsletter Signup (Screenshot 1) */}
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-white">
                Sign Up Our Newsletters
              </h4>
              <p className="text-xs text-zinc-400 font-normal">
                Let's stay connected. Get exclusive secret recipes &amp; seasonal discount drops.
              </p>
              <div className="space-y-2 pt-1">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A26]"
                />
                <button
                  type="button"
                  onClick={() => showToast('Thank you for subscribing to WorldPlate! 🌟')}
                  className="w-full py-2 rounded-xl flame-gradient-btn text-white text-xs font-black shadow-md shadow-[#FF5A26]/30 cursor-pointer active:scale-95 transition"
                >
                  Subscribe Now
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-3">
            <p>© 2026 WorldPlate. All Rights Reserved. Crafted for Artisanal Dining.</p>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="hover:text-zinc-400 cursor-pointer">Privacy Policy</span>
              <span>&bull;</span>
              <span className="hover:text-zinc-400 cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Floating Bottom Cart Summary Bar */}
      {cartSummary.totalCount > 0 && (
        <aside
          aria-label="Order Cart Summary"
          className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/90 to-transparent backdrop-blur-xs pointer-events-none"
        >
          <div className="max-w-xl mx-auto pointer-events-auto">
            <div className="bg-[#141418]/95 backdrop-blur-xl text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl shadow-black/80 flex items-center justify-between gap-3.5 border border-zinc-800 ring-1 ring-[#FF5A26]/20 animate-slideUp">
              
              {/* Left: Cart Info */}
              <div className="flex items-center gap-3.5">
                <div className="relative w-11 h-11 rounded-xl flame-gradient-btn flex items-center justify-center text-white shrink-0 shadow-md shadow-[#FF5A26]/40">
                  <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-[#0a0a0c] shadow-sm">
                    {cartSummary.totalCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-400 font-medium leading-tight">
                    {cartSummary.totalCount} {cartSummary.totalCount === 1 ? 'dish' : 'dishes'}
                    {tableNumber ? ` • Table ${tableNumber}` : ''}
                  </span>
                  <span className="text-base sm:text-lg font-black text-white leading-tight tracking-tight mt-0.5">
                    ${cartSummary.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Right: View Order Button */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl flame-gradient-btn active:scale-95 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-[#FF5A26]/30 cursor-pointer"
              >
                <span>View Order</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

            </div>
          </div>
        </aside>
      )}

      {/* Cart & Voice Customization Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        tableNumber={tableNumber}
        onUpdateQuantity={(itemId, newQty) => handleUpdateQuantity(itemId, newQty)}
        onRemoveItem={(itemId) => handleRemoveFromCart(itemId)}
        onUpdateNote={(itemId, noteText) => handleUpdateNote(itemId, noteText)}
        onOrderSuccess={(order) => {
          setOrderSuccessModal(order);
          setActiveOrder(order);
          try {
            localStorage.setItem('smartdine_active_order', JSON.stringify(order));
          } catch (e) {}
          setCart({});
          setIsCartOpen(false);
        }}
      />

      {/* Interactive Food Details & Multimedia Modal */}
      <FoodDetailModal
        isOpen={!!selectedDishModal}
        dish={selectedDishModal}
        onClose={() => setSelectedDishModal(null)}
        cartQuantity={selectedDishModal && cart[selectedDishModal.id] ? cart[selectedDishModal.id].quantity : 0}
        onAddToCart={(item, qty, note, voiceUrl) => {
          setCart((prev) => {
            const existing = prev[item.id];
            const newQty = (existing?.quantity || 0) + (qty || 1);
            return {
              ...prev,
              [item.id]: {
                item,
                quantity: newQty,
                note: note || existing?.note || '',
                voiceNoteUrl: voiceUrl || existing?.voiceNoteUrl || null
              }
            };
          });
          showToast(`Added ${item.name || item.title} to order! 🌟`);
        }}
        onUpdateQuantity={(itemId, qty) => handleUpdateQuantity(itemId, qty)}
      />

      {/* Table Selection Modal (Dark Noir Glass Theme) */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#161619] text-white rounded-3xl shadow-2xl border border-zinc-800 p-6 sm:p-7 transform transition-all animate-scaleUp">
            
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-[#FF5A26] mx-auto flex items-center justify-center mb-2.5 shadow-2xs">
                <UtensilsCrossed className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="font-black text-white text-lg sm:text-xl tracking-tight">
                Dine-in Table Selection
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Select your dining table number to synchronize orders with our kitchen.
              </p>
            </div>

            {/* Quick Grid 1 - 20 */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Select Table (1 - 20):
              </label>
              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => {
                  const isCurrent = String(tableNumber) === String(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleSelectTable(num)}
                      className={`h-11 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                        isCurrent
                          ? 'flame-gradient-btn text-white shadow-md shadow-[#FF5A26]/40 ring-2 ring-[#FF7A45] scale-102'
                          : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Table Number Input */}
            <div className="pt-3.5 border-t border-zinc-800/80 mb-4">
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Or enter custom dining area (Bar, Patio, VIP):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTableInput}
                  onChange={(e) => setCustomTableInput(e.target.value)}
                  placeholder="e.g. Bar 02, VIP Lounge, Terrace 1"
                  className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-zinc-900 rounded-xl border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#FF5A26] focus:border-[#FF5A26] transition"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customTableInput.trim()) {
                      handleSelectTable(customTableInput.trim());
                    }
                  }}
                  className="px-4 py-2 flame-gradient-btn text-white text-xs sm:text-sm font-bold rounded-xl cursor-pointer shadow-xs active:scale-95"
                >
                  Set Table
                </button>
              </div>
            </div>

            {tableNumber && (
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Keep Table {tableNumber}
              </button>
            )}

          </div>
        </div>
      )}

      {/* Order Success Modal (Dark Noir Glass Theme) */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#161619] text-white rounded-3xl shadow-2xl border border-zinc-800 p-6 sm:p-7 text-center transform transition-all animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-3 shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-black text-white text-lg tracking-tight">
              Order Dispatched to Kitchen!
            </h3>
            <p className="text-xs text-zinc-400 mt-1 mb-4 font-medium">
              Order #{orderSuccessModal.orderId} &bull; Table {orderSuccessModal.tableNumber}
            </p>

            <div className="bg-zinc-900/90 rounded-2xl p-3.5 text-left mb-4 space-y-1.5 text-xs border border-zinc-800">
              <div className="flex justify-between font-semibold text-zinc-400">
                <span>Items Placed:</span>
                <span className="text-white font-bold">{orderSuccessModal.items.length} items</span>
              </div>
              <div className="flex justify-between font-extrabold text-white pt-1.5 border-t border-zinc-800">
                <span>Total Amount:</span>
                <span className="text-[#FF5A26] font-black">${orderSuccessModal.total.toFixed(2)}</span>
              </div>
            </div>

            {!isOnline && (
              <div className="bg-amber-950/40 text-amber-300 text-[11px] p-3 rounded-xl mb-4 text-left border border-amber-500/30 leading-relaxed">
                <span className="font-bold">Offline Resilience:</span> Your order is secured locally and relayed over local Wi-Fi to the kitchen display.
              </div>
            )}

            <button
              type="button"
              onClick={() => setOrderSuccessModal(null)}
              className="w-full py-3 rounded-xl flame-gradient-btn text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-md active:scale-95"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#161619]/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 border border-zinc-800 ring-1 ring-[#FF5A26]/30 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-[#FF5A26] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
