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
    image: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80'
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
  // 0. Layout View Mode ('grid' for 2-column compact modern, 'list' for horizontal rows)
  const [layoutMode, setLayoutMode] = useState('grid');
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
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 pb-32 selection:bg-amber-500 selection:text-white relative">
      {/* Warm Ambient Bistro Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(217,119,6,0.05),rgba(250,248,245,0))] z-0" />
      
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
        <div className="bg-amber-500 text-white px-4 py-2.5 shadow-xs border-b border-amber-600/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 fill-white shrink-0 animate-pulse" />
              <span>
                ⚡ You are offline! You can still browse the menu and add items to your cart.
              </span>
            </div>
            <span className="hidden md:inline-block text-[11px] bg-amber-600/60 px-2 py-0.5 rounded-full font-medium">
              Offline-First Activated
            </span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 relative z-10">

        {/* 1. Dining Lounge Hero Banner & Fixed Table QR Badge */}
        <div className="relative mb-6 rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-950 via-stone-900 to-neutral-950 text-white p-5 sm:p-7 shadow-xl border border-stone-800/90 animate-fadeIn">
          {/* Subtle Ambient Gold Glow in Background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="tracking-wide uppercase text-[10px] font-bold">Artisanal Bistro &amp; Table Dining</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                Chef's Table Experience
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-lg leading-relaxed">
                Hand-crafted seasonal specialties, sommelier pairings, and personalized tableside ordering directly to our kitchen.
              </p>
            </div>

            {/* Dining Lounge Badge: Locked via QR OR Prompt to Pair Table */}
            {tableNumber ? (
              <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/15 px-4.5 py-3.5 rounded-2xl flex items-center gap-3.5 shadow-lg shadow-neutral-950/30">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-neutral-950 font-black text-base flex items-center justify-center shadow-md shadow-amber-500/25 ring-2 ring-amber-300/30">
                  {tableNumber}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-extrabold flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Lock className="w-3 h-3" /> Locked via QR
                  </div>
                  <div className="text-sm sm:text-base font-black text-white tracking-tight mt-0.5">
                    Table {tableNumber}
                  </div>
                </div>
              </div>
            ) : (
              <div className="shrink-0 bg-amber-500/15 border border-amber-500/30 backdrop-blur-md px-4.5 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-amber-400 font-extrabold">
                      Scan Table QR
                    </div>
                    <div className="text-xs text-stone-300">
                      Scan table to order
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectTable('1')}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-neutral-950 text-xs font-extrabold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <span>Demo: T01</span>
                  <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Live Customer Order Status Tracker (Order Received -> Cooking -> Ready to Serve -> Served) */}
        {activeOrder && activeOrder.status !== 'served' && (
          <div className="mb-6 bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] animate-fadeIn">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center font-black text-xs shadow-2xs">
                  {tableNumber ? `T${tableNumber}` : 'ORD'}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-stone-900 flex items-center gap-2">
                    <span>Live Kitchen Tracker</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </h4>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Order #{activeOrder.orderId || activeOrder.orderNumber || 'Active'} &bull; Table {tableNumber || activeOrder.tableNumber}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 shadow-2xs">
                  {activeOrder.status === 'preparing' ? '🔥 Cooking in Kitchen' : activeOrder.status === 'ready' ? '🛎️ Ready to Serve' : '⏳ Order Received'}
                </span>
              </div>
            </div>

            {/* Stepper Progress Bar with Connecting Animated Line */}
            {(() => {
              const stepOrder = ['pending', 'preparing', 'ready', 'served'];
              const currentIndex = Math.max(0, stepOrder.indexOf(activeOrder.status || 'pending'));
              const progressPercent = (currentIndex / (stepOrder.length - 1)) * 100;

              return (
                <div className="relative pt-2 pb-1">
                  {/* Background Track Line */}
                  <div className="absolute top-6 left-8 right-8 h-1 bg-stone-200/80 -translate-y-1/2 z-0 rounded-full" />
                  {/* Active Gradient Glow Line */}
                  <div
                    className="absolute top-6 left-8 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 -translate-y-1/2 z-0 rounded-full transition-all duration-700 shadow-xs"
                    style={{ width: `calc((100% - 4rem) * ${progressPercent / 100})` }}
                  />

                  {/* Stepper Nodes */}
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
                                ? 'bg-amber-500 text-neutral-950 ring-4 ring-amber-500/25 font-bold scale-110 shadow-lg shadow-amber-500/30'
                                : isCompleted
                                ? 'bg-emerald-600 text-white font-medium shadow-md shadow-emerald-600/25'
                                : 'bg-stone-100 text-stone-400 border border-stone-200/90'
                            }`}
                          >
                            <StepIcon className="w-4 h-4" />
                          </div>
                          <span className={`text-[11px] mt-1.5 font-bold tracking-tight ${isCurrent ? 'text-amber-700 font-extrabold' : isCompleted ? 'text-stone-800' : 'text-stone-400'}`}>
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
            
            {/* High-Contrast Luxury Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search delicious dishes, ingredients, drinks..."
                className="w-full pl-10 pr-9 py-2.5 sm:py-3 text-xs sm:text-sm bg-white rounded-2xl border border-stone-200/90 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 placeholder:text-stone-400 text-stone-900 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dietary Toggle Pills */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Veg Only Toggle */}
              <button
                type="button"
                onClick={() => setVegOnlyFilter((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                  vegOnlyFilter
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-md shadow-emerald-700/20 ring-1 ring-emerald-500/30'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200/90'
                }`}
              >
                <Leaf className={`w-3.5 h-3.5 ${vegOnlyFilter ? 'fill-current' : 'text-emerald-600'}`} />
                <span>Vegetarian</span>
              </button>

              {/* Spicy Toggle */}
              <button
                type="button"
                onClick={() => setSpicyFilter((s) => !s)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                  spicyFilter
                    ? 'bg-rose-700 text-white border-rose-700 shadow-md shadow-rose-700/20 ring-1 ring-rose-500/30'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200/90'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${spicyFilter ? 'fill-current' : 'text-rose-600'}`} />
                <span>Spicy</span>
              </button>
            </div>

          </div>
        </section>

        {/* Category Horizontal Sticky Pill Bar */}
        <section className="sticky top-16 z-30 -mx-3 sm:mx-0 mb-4 bg-[#faf8f5]/95 backdrop-blur-md pt-1 pb-1.5 border-b border-stone-200/60 shadow-2xs">
          <CategoryBar
            categories={categoriesList}
            selectedCategory={selectedCategory === 'All' ? activeScrollCategory : selectedCategory}
            onSelectCategory={handleSelectCategory}
            categoryCounts={categoryCounts}
          />
        </section>

        {/* Results Info Bar & Layout Switcher */}
        <div id="menu-content-root" className="flex items-center justify-between mb-4 px-1 scroll-mt-32">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>{selectedCategory === 'All' ? 'All Menu Choices' : `${getCategoryMetadata(selectedCategory).title}`}</span>
              <span className="text-xs font-bold font-mono text-amber-800 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full shadow-2xs">
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
                className="text-xs text-amber-700 hover:text-amber-800 font-bold cursor-pointer underline decoration-amber-400 underline-offset-2 ml-1"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* View Mode Toggle: Grid (2-col) / List (Compact) */}
          <div className="flex items-center bg-stone-200/80 p-0.5 rounded-xl border border-stone-300/70 shadow-2xs">
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                layoutMode === 'grid'
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="2-Column Compact Grid"
              aria-label="2-Column Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block text-[11px] font-semibold">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                layoutMode === 'list'
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Compact List View"
              aria-label="List View"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block text-[11px] font-semibold">List</span>
            </button>
          </div>
        </div>

        {/* Categorized Dishes Sections / Filtered Grid */}
        {filteredItems.length > 0 ? (
          <div className="space-y-8 sm:space-y-10">
            {selectedCategory === 'All' ? (
              // Categorized Grouped View (Starters -> Mains -> Burgers -> Desserts -> Beverages)
              categorizedSections.map((section) => (
                <section
                  key={section.categoryKey}
                  id={`cat-section-${section.categoryKey}`}
                  className="space-y-3.5 scroll-mt-32 pt-1"
                >
                  {/* Category Header with Icon, Title, Dish Count Pill, and Subtitle */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-stone-200/90">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 flex items-center justify-center text-lg sm:text-xl shadow-2xs shrink-0">
                        {section.icon}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg lg:text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                          <span>{section.title}</span>
                          <span className="text-[11px] sm:text-xs font-bold font-mono text-amber-800 bg-amber-500/15 border border-amber-500/30 px-2 sm:px-2.5 py-0.5 rounded-full shadow-2xs">
                            {section.items.length} {section.items.length === 1 ? 'dish' : 'dishes'}
                          </span>
                        </h3>
                        <p className="text-[11px] sm:text-xs text-stone-500 font-medium line-clamp-1 mt-0.5">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-amber-500/15 hover:border-amber-500/30 text-stone-700 hover:text-amber-900 border border-stone-200/90 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                    >
                      <span>Filter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Compact Responsive Grid: 2-col on mobile, 3 on tablet, 4 on desktop */}
                  <div className={
                    layoutMode === 'list'
                      ? "flex flex-col gap-2.5 sm:gap-3"
                      : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4"
                  }>
                    {section.items.map((dish) => {
                      const inCart = cart[dish.id];
                      return (
                        <MenuItemCard
                          key={dish.id}
                          item={dish}
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
                  <section className="space-y-3.5">
                    <div className="flex items-center justify-between pb-2.5 border-b border-stone-200/90">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 flex items-center justify-center text-lg sm:text-xl shadow-2xs shrink-0">
                          {activeMeta.icon}
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg lg:text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                            <span>{activeMeta.title}</span>
                            <span className="text-[11px] sm:text-xs font-bold font-mono text-amber-800 bg-amber-500/15 border border-amber-500/30 px-2 sm:px-2.5 py-0.5 rounded-full shadow-2xs">
                              {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
                            </span>
                          </h3>
                          <p className="text-[11px] sm:text-xs text-stone-500 font-medium line-clamp-1 mt-0.5">
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
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>View All Categories</span>
                      </button>
                    </div>

                    {/* Compact Responsive Grid: 2-col on mobile, 3 on tablet, 4 on desktop */}
                    <div className={
                      layoutMode === 'list'
                        ? "flex flex-col gap-2.5 sm:gap-3"
                        : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4"
                    }>
                      {filteredItems.map((dish) => {
                        const inCart = cart[dish.id];
                        return (
                          <MenuItemCard
                            key={dish.id}
                            item={dish}
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
          <div className="bg-white rounded-3xl border border-stone-200/90 p-8 sm:p-12 text-center max-w-md mx-auto my-10 shadow-sm">
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
      </main>

      {/* Floating Bottom Cart Summary Bar */}
      {cartSummary.totalCount > 0 && (
        <aside
          aria-label="Order Cart Summary"
          className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-gradient-to-t from-stone-100 via-stone-100/95 to-transparent backdrop-blur-xs pointer-events-none"
        >
          <div className="max-w-xl mx-auto pointer-events-auto">
            <div className="bg-neutral-950/95 backdrop-blur-md text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl shadow-neutral-950/40 flex items-center justify-between gap-3.5 border border-stone-800 ring-1 ring-white/10 animate-slideUp">
              
              {/* Left: Cart Info */}
              <div className="flex items-center gap-3.5">
                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-neutral-950 shrink-0 shadow-md shadow-amber-500/30">
                  <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-neutral-950 shadow-sm">
                    {cartSummary.totalCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-stone-400 font-medium leading-tight">
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
                className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-neutral-950 font-black text-xs sm:text-sm transition-all shadow-md shadow-amber-500/25 cursor-pointer"
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

      {/* Table Selection Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200/90 p-6 sm:p-7 transform transition-all animate-scaleUp">
            
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 mx-auto flex items-center justify-center mb-2.5 shadow-2xs">
                <UtensilsCrossed className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="font-black text-stone-900 text-lg sm:text-xl tracking-tight">
                Dine-in Table Selection
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Select your dining table number to synchronize orders with our kitchen.
              </p>
            </div>

            {/* Quick Grid 1 - 20 */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-2">
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
                          ? 'bg-neutral-950 text-white border-neutral-950 shadow-md shadow-neutral-950/20 ring-2 ring-amber-500/40 scale-102'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200/80'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Table Number Input */}
            <div className="pt-3.5 border-t border-stone-100 mb-4">
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Or enter custom dining area (Bar, Patio, VIP):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTableInput}
                  onChange={(e) => setCustomTableInput(e.target.value)}
                  placeholder="e.g. Bar 02, VIP Lounge, Terrace 1"
                  className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customTableInput.trim()) {
                      handleSelectTable(customTableInput.trim());
                    }
                  }}
                  className="px-4 py-2 bg-neutral-950 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-neutral-900 cursor-pointer shadow-xs"
                >
                  Set Table
                </button>
              </div>
            </div>

            {tableNumber && (
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Keep Table {tableNumber}
              </button>
            )}

          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200/90 p-6 sm:p-7 text-center transform transition-all animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 mx-auto flex items-center justify-center mb-3 shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-black text-stone-900 text-lg tracking-tight">
              Order Dispatched to Kitchen!
            </h3>
            <p className="text-xs text-stone-500 mt-1 mb-4 font-medium">
              Order #{orderSuccessModal.orderId} &bull; Table {orderSuccessModal.tableNumber}
            </p>

            <div className="bg-stone-50 rounded-2xl p-3.5 text-left mb-4 space-y-1.5 text-xs border border-stone-100">
              <div className="flex justify-between font-semibold text-stone-600">
                <span>Items Placed:</span>
                <span>{orderSuccessModal.items.length} items</span>
              </div>
              <div className="flex justify-between font-extrabold text-stone-900 pt-1.5 border-t border-stone-200/60">
                <span>Total Amount:</span>
                <span className="text-amber-700 font-black">${orderSuccessModal.total.toFixed(2)}</span>
              </div>
            </div>

            {!isOnline && (
              <div className="bg-amber-50 text-amber-900 text-[11px] p-3 rounded-xl mb-4 text-left border border-amber-200/90 leading-relaxed">
                <span className="font-bold">Offline Resilience:</span> Your order is secured locally and relayed over local Wi-Fi to the kitchen display.
              </div>
            )}

            <button
              type="button"
              onClick={() => setOrderSuccessModal(null)}
              className="w-full py-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-sm"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-950/95 backdrop-blur-md text-white px-4.5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 border border-stone-800 ring-1 ring-amber-500/20 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
