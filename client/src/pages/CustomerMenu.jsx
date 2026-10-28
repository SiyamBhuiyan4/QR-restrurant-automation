import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import { useRestaurant } from '../context/RestaurantContext';
import { getCachedMenu } from '../db/indexedDb.js';
import Navbar from '../components/Navbar';
import CategoryBar from '../components/CategoryBar';
import CartDrawer from '../components/CartDrawer';
import FoodDetailModal from '../components/FoodDetailModal';
import FoodReelsModal from '../components/FoodReelsModal';
import GuestChat from '../components/GuestChat';
import VillageBackground from '../components/VillageBackground';
import MenuItemCard from '../components/MenuItemCard';
import '../styles/customer-hero.css';
import '../styles/customer-menu-sections.css';
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
  Star,
  MessageCircle,
  Send,
  Film
} from 'lucide-react';

// Default initial menu items for full offline or standalone browsing
const DEFAULT_MENU_ITEMS = [
  // Starters & Wings
  {
    id: 'starter-balado-wings',
    name: 'Balado Sauce Wings',
    description: 'Crispy chicken wings glazed in spicy Indonesian Minangkabau chili balado reduction, lime leaf, and garlic confit.',
    price: 14.50,
    priceK: '78 K',
    category: 'Appetizers',
    subcategory: 'Wings',
    isVeg: false,
    isSpicy: true,
    isPopular: true,
    prepTime: '15 min',
    image: '/videos/reel-chef.mp4',
    imageUrl: '/videos/reel-chef.mp4',
    images: [
      'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Crispy Farm Wings', 'Authentic Red Balado Paste', 'Kaffir Lime Leaf', 'Shallot Confit', 'Palm Sugar']
  },
  {
    id: 'starter-lemonade-wings',
    name: 'Lemonade Sauce Wings',
    description: 'Crispy golden chicken wings tossed in our signature candied citrus glaze, infused with lemon zest, honey, and fresh herbs.',
    price: 14.50,
    priceK: '78 K',
    category: 'Appetizers',
    subcategory: 'Wings',
    isVeg: false,
    isSpicy: false,
    isPopular: true,
    prepTime: '15 min',
    image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Golden Fried Wings', 'Handmade Lemonade Glaze', 'Meyer Lemon Slices', 'Wildflower Honey', 'White Sesame Seeds']
  },
  {
    id: 'starter-1',
    name: 'Truffle Parmesan Fries',
    description: 'Crispy skin-on fries tossed with white truffle oil, shaved aged parmesan, and fresh parsley with garlic aioli.',
    price: 7.99,
    priceK: '42 K',
    category: 'Appetizers',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '10 min',
    image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Yukon Gold Potatoes', 'White Truffle Oil', 'Aged Reggiano Parmesan', 'Fresh Flat Parsley', 'Sea Salt Flakes', 'Roasted Garlic Aioli']
  },
  {
    id: 'starter-2',
    name: 'Spicy Buffalo Wings',
    description: 'Crispy chicken wings glazed in our chef signature fiery cayenne sauce, served with blue cheese and celery sticks.',
    price: 10.99,
    priceK: '58 K',
    category: 'Appetizers',
    isVeg: false,
    isSpicy: true,
    isPopular: true,
    prepTime: '15 min',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Farm Fresh Wings', 'Fiery Cayenne Glaze', 'Wisconsin Blue Cheese Dip', 'Crisp Celery Sticks', 'Garlic Butter']
  },
  {
    id: 'starter-3',
    name: 'Garlic Butter Cheesy Bread',
    description: 'Freshly baked artisanal sourdough baguette filled with herb garlic butter and melted mozzarella cheese.',
    price: 6.50,
    category: 'Appetizers',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Artisanal Sourdough', 'Roasted Garlic Butter', 'Fior di Latte Mozzarella', 'Oregano', 'Virgin Olive Oil']
  },
  {
    id: 'starter-4',
    name: 'Crispy Salt & Pepper Calamari',
    description: 'Tender Monterey squid lightly crusted with five-spice sea salt, served with lemon wedges and house tartar.',
    price: 11.50,
    category: 'Appetizers',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Monterey Squid Rings', 'Five-Spice Sea Salt', 'Fresh Lemon Wedges', 'House Pickled Tartar', 'Micro Greens']
  },

  // Mains
  {
    id: 'main-1',
    name: 'Grilled Ribeye Steak (10oz)',
    description: 'Prime dry-aged Angus ribeye char-grilled to perfection, accompanied by roasted garlic herb butter and rosemary baby potatoes.',
    price: 24.99,
    category: 'Special Steak',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Prime Angus Ribeye Cut', 'Herb Garlic Confit Butter', 'Rosemary Roasted Baby Potatoes', 'Charred Asparagus', 'Flaky Maldon Salt']
  },
  {
    id: 'main-2',
    name: 'Fiery Peri-Peri Grilled Chicken',
    description: 'Half chicken marinated 24 hours in authentic African bird eye peri-peri marinade, flame grilled with charred lime.',
    price: 17.50,
    category: 'Special Steak',
    isVeg: false,
    isSpicy: true,
    isPopular: true,
    prepTime: '18 min',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Free-Range Half Chicken', 'African Bird Eye Peri-Peri', 'Smoked Sweet Paprika', 'Charred Key Lime', 'Garlic Herb Glaze']
  },
  {
    id: 'main-3',
    name: 'Pan-Seared Atlantic Salmon',
    description: 'Wild salmon fillet served over a bed of sautéed asparagus, cherry tomatoes, and saffron lemon-dill cream sauce.',
    price: 21.99,
    category: 'Special Steak',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Wild Atlantic Salmon Fillet', 'Fresh Sautéed Asparagus', 'Heirloom Cherry Tomatoes', 'Saffron Dill Velouté', 'Lemon Zest']
  },
  {
    id: 'main-4',
    name: 'Wild Forest Mushroom Risotto',
    description: 'Arborio rice slowly simmered with porcini stock, shiitake mushrooms, white truffle oil, and aged Pecorino.',
    price: 16.50,
    category: 'Special Steak',
    isVeg: true,
    isSpicy: false,
    prepTime: '18 min',
    image: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Italian Arborio Rice', 'Dried Porcini & Shiitake Stock', 'White Truffle Essence', 'Aged Pecorino Romano', 'Fresh Thyme']
  },

  // Pizza Special
  {
    id: 'pizza-1',
    name: 'Artisanal Margherita Pizza',
    description: 'San Marzano tomato sauce, fresh buffalo mozzarella, hand-picked sweet basil, and extra virgin olive oil on blistered crust.',
    price: 16.99,
    category: 'Pizza Special',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '12 min',
    image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['San Marzano Tomatoes', 'Fresh Buffalo Mozzarella', 'Sweet Genovese Basil', 'Extra Virgin Olive Oil', 'Aged Sea Salt']
  },
  {
    id: 'pizza-2',
    name: 'Black Truffle & Wild Mushroom Pizza',
    description: 'Roasted forest mushrooms, creamy fontina, thyme-infused ricotta, and shaved black summer truffles.',
    price: 19.50,
    category: 'Pizza Special',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '15 min',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Foraged Wild Mushrooms', 'Fontina Cheese', 'Thyme Ricotta', 'Shaved Black Truffle', 'Garlic Confit']
  },
  {
    id: 'pizza-3',
    name: 'Signature Spicy Pepperoni & Hot Honey',
    description: 'Crispy cup-and-char pepperoni, house marinara, melted mozzarella, finished with a drizzle of Calabrian chili hot honey.',
    price: 18.50,
    category: 'Pizza Special',
    isVeg: false,
    isSpicy: true,
    isPopular: true,
    prepTime: '12 min',
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Cup & Char Pepperoni', 'Whole Milk Mozzarella', 'San Marzano Tomato Sauce', 'Calabrian Hot Honey', 'Crushed Red Pepper']
  },
  {
    id: 'pizza-4',
    name: 'Prosciutto di Parma & Fresh Arugula Pizza',
    description: 'Aged Prosciutto di Parma draped over creamy burrata, peppery baby arugula, shaved parmesan, and balsamic glaze.',
    price: 21.00,
    category: 'Pizza Special',
    isVeg: false,
    isSpicy: false,
    prepTime: '14 min',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['24-Month Prosciutto di Parma', 'Creamy Burrata', 'Baby Arugula', 'Shaved Parmigiano-Reggiano', 'Aged Modena Balsamic Glaze']
  },

  // Special Food (Burgers & Artisan Sandwiches)
  {
    id: 'burger-1',
    name: 'SmartDine Classic Smash Burger',
    description: 'Two smashed prime beef patties, double American cheese, caramelized onions, crisp pickles, and secret burger spread on a brioche bun.',
    price: 13.50,
    category: 'Special Food',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Double Angus Beef Patties', 'Melted American Sharp Cheese', 'Slow Caramelized Onions', 'Dill Pickles', 'Signature Truffle Mayo', 'Brioche Bun']
  },
  {
    id: 'burger-2',
    name: 'The Volcano Jalapeño Burger',
    description: 'Spiced beef patty topped with grilled pickled jalapeños, pepper jack cheese, crispy fried onion strings, and habanero lava mayo.',
    price: 14.99,
    category: 'Special Food',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Spiced Angus Beef Patty', 'Grilled Pickled Jalapeños', 'Melted Pepper Jack Cheese', 'Crispy Onion Strings', 'Habanero Lava Aioli']
  },
  {
    id: 'burger-3',
    name: 'Beyond Plant-Based Burger',
    description: '100% plant-based grilled patty, vegan cheddar, butterhead lettuce, vine tomato, and avocado chimichurri on a toasted vegan potato bun.',
    price: 14.50,
    category: 'Special Food',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['100% Plant-Based Patty', 'Vegan Aged Cheddar', 'Butterhead Lettuce', 'Ripe Vine Tomato', 'Avocado Chimichurri', 'Potato Bun']
  },

  // Beverages (Classic Cocktails, Mocktails & House Coolers)
  {
    id: 'cocktail-mojito',
    name: 'Mojito',
    description: 'Cuban white rum muddled with fresh spearmint leaves, crushed lime, cane syrup, and effervescent sparkling soda.',
    price: 12.00,
    priceK: '65 K',
    category: 'Beverages',
    subType: 'cocktail',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '4 min',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Cuban White Rum', 'Fresh Spearmint', 'Tahitian Lime Wedges', 'Organic Cane Syrup', 'Club Soda']
  },
  {
    id: 'cocktail-old-fashioned',
    name: 'Old Fashioned',
    description: 'Small batch bourbon whiskey stirred with aromatic Angostura bitters, raw sugar cube, and hand-carved ice sphere.',
    price: 14.00,
    priceK: '75 K',
    category: 'Beverages',
    subType: 'cocktail',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '5 min',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Kentucky Bourbon Whiskey', 'Angostura Bitters', 'Demerara Raw Sugar', 'Flamed Orange Peel', 'Luxardo Cherry']
  },
  {
    id: 'cocktail-espresso-martini',
    name: 'Espresso Martini',
    description: 'Fresh pulled dark espresso vigorously shaken with premium vodka, coffee liqueur, and dark cocoa dust.',
    price: 13.50,
    priceK: '72 K',
    category: 'Beverages',
    subType: 'cocktail',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '5 min',
    image: 'https://images.unsplash.com/photo-1545438102-799c3991ffb2?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1545438102-799c3991ffb2?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Dark Roast Espresso', 'Single-Estate Vodka', 'Kahlua Coffee Liqueur', 'Vanilla Bean Infusion', 'Whole Coffee Beans']
  },
  {
    id: 'cocktail-gin-tonic',
    name: 'Gin Tonic',
    description: 'Artisanal botanical London dry gin paired with premium Mediterranean tonic water, fresh juniper berries, and rosemary.',
    price: 11.50,
    priceK: '60 K',
    category: 'Beverages',
    subType: 'cocktail',
    isVeg: true,
    isSpicy: false,
    prepTime: '3 min',
    image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Botanical Dry Gin', 'Mediterranean Tonic', 'Juniper Berries', 'Dehydrated Citrus Wheel', 'Fresh Garden Rosemary']
  },
  {
    id: 'mocktail-virgin-mojito',
    name: 'Virgin Mojito',
    description: 'Crisp spearmint and Tahitian lime muddled with organic blue agave and chilled San Pellegrino sparkling water.',
    price: 8.50,
    priceK: '45 K',
    category: 'Beverages',
    subType: 'mocktail',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '3 min',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Garden Spearmint', 'Tahitian Fresh Lime', 'Blue Agave Syrup', 'San Pellegrino Sparkling Mineral Water']
  },
  {
    id: 'mocktail-citrus-cooler',
    name: 'Citrus Cooler',
    description: 'Refreshing medley of pink grapefruit, blood orange, Meyer lemon, and crushed ice with fragrant rosemary.',
    price: 7.50,
    priceK: '40 K',
    category: 'Beverages',
    subType: 'mocktail',
    isVeg: true,
    isSpicy: false,
    prepTime: '3 min',
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1556881286-fc6915169721?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Ruby Red Grapefruit', 'Blood Orange Juice', 'Meyer Lemon', 'Sprig of Rosemary', 'Pure Cane Sugar']
  },
  {
    id: 'beverage-1',
    name: 'Signature Sparkling Lemonade',
    description: 'Freshly squeezed lemons with organic agave syrup, crushed mint, and sparkling mineral water.',
    price: 4.50,
    priceK: '28 K',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Eureka Fresh Lemons', 'Organic Blue Agave', 'Garden Mint Sprigs', 'Sparkling San Pellegrino', 'Crushed Ice']
  },
  {
    id: 'beverage-2',
    name: 'Fiery Ginger Spiced Cooler',
    description: 'House brewed cold ginger root infusion, fresh lime, bird chili hint, crushed ice, and club soda.',
    price: 4.99,
    priceK: '32 K',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Fresh Cold-Pressed Ginger', 'Key Lime Juice', 'Subtle Bird Chili Kiss', 'Club Soda', 'Raw Turbinado Sugar']
  },

  // Desserts
  {
    id: 'dessert-souffle',
    name: 'Chocolate Soufflé',
    description: 'Classic French chocolate soufflé puffed to airy perfection, with a warm liquid chocolate center and bourbon crème anglaise.',
    price: 9.50,
    priceK: '50 K',
    category: 'Desserts',
    isVeg: true,
    isSpicy: false,
    isPopular: true,
    prepTime: '15 min',
    image: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Valrhona Dark Chocolate', 'Pasture-Raised Eggs', 'Dutch Cocoa Powder', 'Bourbon Crème Anglaise', 'Powdered Confectioner Sugar']
  },
  {
    id: 'dessert-1',
    name: 'Molten Lava Cake',
    description: 'Warm Belgian dark chocolate cake with a gooey flowing center, paired with Madagascar vanilla bean ice cream.',
    price: 8.50,
    priceK: '45 K',
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
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['70% Belgian Dark Chocolate', 'European Sweet Butter', 'Madagascar Bourbon Vanilla Gelato', 'Dutch Cocoa Dust', 'Fresh Raspberries']
  },
  {
    id: 'dessert-2',
    name: 'Tiramisu',
    description: 'Espresso dipped ladyfingers layered with whipped mascarpone cream and dusted with raw Dutch cocoa.',
    price: 9.00,
    priceK: '48 K',
    category: 'Desserts',
    isVeg: true,
    isSpicy: false,
    prepTime: '5 min',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534432182912-63863115e106?w=900&auto=format&fit=crop&q=80'
    ],
    videoUrl: '/videos/reel-chef.mp4',
    makingVideoUrl: '/videos/reel-chef.mp4',
    making_video_url: '/videos/reel-chef.mp4',
    ingredients: ['Savoiardi Ladyfingers', 'Italian Mascarpone Cream', 'Single Origin Dark Espresso', 'Marsala Wine Hint', 'Raw Dutch Cocoa Dust']
  }
];

// Canonical Michelin-grade Bistro Category Definitions
export const CANONICAL_CATEGORIES = [
  {
    key: 'starters',
    id: 'Appetizers',
    title: 'APPETIZERS',
    icon: '🥗',
    subtitle: 'Crispy appetizers, signature bites, and table warmups'
  },
  {
    key: 'mains',
    id: 'SpecialSteak',
    title: 'SPECIAL STEAK',
    icon: '🥩',
    subtitle: 'Prime dry-aged steaks, flame-grilled specialties, and fresh catches'
  },
  {
    key: 'pizza',
    id: 'PizzaSpecial',
    title: 'PIZZA SPECIAL',
    icon: '🍕',
    subtitle: 'Stone-baked artisanal pizzas with rich buffalo mozzarella'
  },
  {
    key: 'burgers',
    id: 'SpecialFood',
    title: 'SPECIAL FOOD',
    icon: '🍔',
    subtitle: 'Artisan smashed wagyu patties, melted cheese, and toasted brioche'
  },
  {
    key: 'desserts',
    id: 'Desserts',
    title: 'DESSERTS',
    icon: '🍰',
    subtitle: 'Warm lava cakes, artisanal tiramisu, and house sweets'
  },
  {
    key: 'beverages',
    id: 'Beverages',
    title: 'BEVERAGES',
    icon: '🍹',
    subtitle: 'Hand-crafted iced coolers, spritzers, and organic teas'
  }
];

export const getCategoryMetadata = (categoryName = '') => {
  const lower = String(categoryName).toLowerCase().trim();
  if (lower.includes('start') || lower.includes('appetiz')) return CANONICAL_CATEGORIES[0];
  if (lower.includes('steak') || lower.includes('meat') || lower.includes('main') || lower.includes('entree')) return CANONICAL_CATEGORIES[1];
  if (lower.includes('pizza')) return CANONICAL_CATEGORIES[2];
  if (lower.includes('burger') || lower.includes('sandwich') || lower.includes('special food') || lower.includes('food')) return CANONICAL_CATEGORIES[3];
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('cake')) return CANONICAL_CATEGORIES[4];
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('cocktail') || lower.includes('mocktail')) return CANONICAL_CATEGORIES[5];
  
  return {
    key: lower.replace(/[^a-z0-9]+/g, '-'),
    id: categoryName,
    title: categoryName.toUpperCase(),
    icon: '🍽️',
    subtitle: 'Chef curated creations prepared fresh to order'
  };
};

// Helper to detect if a URL is hosted on Telegram CDN / bot API
export const isTelegramCdnUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.includes('api.telegram.org') ||
    lower.includes('telegram.org') ||
    lower.includes('telesco.pe') ||
    lower.includes('telegram-cdn') ||
    lower.includes('t.me')
  );
};

// Helper to detect if a URL (including Telegram CDN videos) represents video / 360° product reel
export const isVideoMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (clean.includes('mixkit.co')) return false;
  if (/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(clean)) return true;
  if (
    clean.includes('/videos/') ||
    clean.includes('/video/') ||
    clean.includes('/video_notes/') ||
    clean.includes('sendvideo') ||
    clean.includes('video_note') ||
    clean.includes('video/mp4') ||
    clean.includes('mime_type=video')
  ) {
    return true;
  }
  return false;
};

// Normalize a dish item to ensure complete compatibility across cards and modals,
// seamlessly resolving Telegram CDN photos and 360° videos
export const normalizeDishItem = (item, defaultCategory = 'Mains') => {
  if (!item || typeof item !== 'object') return null;

  const id = item.id || item._id || (item.name ? `dish_${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}` : Math.random().toString(36).substr(2, 9));
  const name = item.name || item.title || 'Untitled Dish';
  const category = item.category || item.category_name || item.categoryName || defaultCategory;
  const categorySlug = item.categorySlug || (typeof category === 'string' ? category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'mains');
  const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
  const description = item.description || '';

  // Extract candidate media links
  const explicitVideo = item.videoUrl || item.video_url || item.makingVideoUrl || item.making_video_url || item.makingVideo || item.video;
  const explicitImage = item.imageUrl || item.image_url || item.image;

  // Identify if image candidate is actually a 360° video (e.g. uploaded directly as the primary dish media)
  const isExplicitImageVideo = isVideoMediaUrl(explicitImage);
  const resolvedVideo = (!explicitVideo || (typeof explicitVideo === 'string' && explicitVideo.includes('mixkit.co')))
    ? (isExplicitImageVideo ? explicitImage : (Array.isArray(item.videos) && item.videos[0]) || '/videos/reel-chef.mp4')
    : explicitVideo;

  // Primary culinary photo for dish thumbnails and posters
  let resolvedImage = (!isExplicitImageVideo && explicitImage) ? explicitImage : null;
  if (!resolvedImage && Array.isArray(item.images)) {
    const nonVideo = item.images.find(img => typeof img === 'string' && !isVideoMediaUrl(img));
    if (nonVideo) resolvedImage = nonVideo;
  }
  if (!resolvedImage) {
    resolvedImage = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80';
  }

  // Build images array
  let allImages = [];
  if (Array.isArray(item.images) && item.images.length > 0) {
    allImages = item.images.filter(img => typeof img === 'string' && img.trim().length > 0);
  } else {
    allImages = [resolvedImage];
  }
  if (!allImages.includes(resolvedImage)) {
    allImages.unshift(resolvedImage);
  }

  // Boolean flags
  const isVeg = Boolean(item.isVeg || item.is_veg === 1 || item.is_veg === true || item.veg === true || (Array.isArray(item.tags) && item.tags.some(t => /veg/i.test(t))));
  const isSpicy = Boolean(item.isSpicy || item.is_spicy === 1 || item.is_spicy === true || item.spicy === true || (Array.isArray(item.tags) && item.tags.some(t => /spic/i.test(t))));
  const isAvailable = item.isAvailable !== false && item.is_available !== 0 && item.is_available !== false && item.available !== false && item.outOfStock !== true;

  return {
    id: String(id),
    _id: item._id || String(id),
    convexId: item.convexId || item._id || null,
    name,
    title: name,
    category,
    categorySlug,
    price,
    description,
    image: resolvedImage,
    imageUrl: resolvedImage,
    image_url: resolvedImage,
    images: allImages,
    videoUrl: resolvedVideo,
    video_url: resolvedVideo,
    makingVideoUrl: resolvedVideo,
    making_video_url: resolvedVideo,
    isVeg,
    is_veg: isVeg ? 1 : 0,
    isSpicy,
    is_spicy: isSpicy ? 1 : 0,
    isAvailable,
    is_available: isAvailable ? 1 : 0,
    ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
    isPopular: Boolean(item.isPopular || item.popular),
    prepTime: item.prepTime || '15 min'
  };
};

export const normalizeDishList = (input) => {
  if (!input) return null;
  let target = input;
  // If JSON string
  if (typeof target === 'string') {
    try {
      target = JSON.parse(target);
    } catch (_) {
      return null;
    }
  }
  // If input is an object with items / data / menu / dishes property
  if (!Array.isArray(target) && typeof target === 'object') {
    target = target.items || target.menu || target.dishes || target.data || [];
  }
  if (!Array.isArray(target) || target.length === 0) return null;

  // Check if it's categorized (each item has .items array)
  if (target.some(cat => cat && Array.isArray(cat.items))) {
    const flattened = [];
    target.forEach(cat => {
      const catName = cat.name || cat.title || 'Mains';
      (cat.items || []).forEach(dish => {
        const normalized = normalizeDishItem(dish, catName);
        if (normalized) flattened.push(normalized);
      });
    });
    return flattened.length > 0 ? flattened : null;
  }

  // Flat dish list
  const list = target.map(d => normalizeDishItem(d)).filter(Boolean);
  return list.length > 0 ? list : null;
};

export default function CustomerMenu({
  menuItems: propMenuItems,
  onPlaceOrder,
  tableFromProp
}) {
  // 0. Layout View Mode ('showcase' for 1-by-1 alternating editorial, 'grid' for 2-column compact modern, 'list' for horizontal rows)
  const [activeScrollCategory, setActiveScrollCategory] = useState('All');

  // Restaurant Context for table and employee routing
  let restaurant = null;
  try {
    restaurant = useRestaurant();
  } catch (_) {}

  // 1. Fixed Table Detection & Locking (No automatic table selection modal)
  const [tableNumber, setTableNumber] = useState('');
  const [isTableLocked, setIsTableLocked] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [customTableInput, setCustomTableInput] = useState('');

  // 2. Interactive Food Details & Multimedia Modal
  const [selectedDishModal, setSelectedDishModal] = useState(null);

  // 2.5 Food Reels Modal & Gesture Navigation (Swipe Right to open Reels)
  const [isReelsOpen, setIsReelsOpen] = useState(false);
  const [reelsInitialDishId, setReelsInitialDishId] = useState(null);
  const touchStartRef = React.useRef({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      // Sliding right gesture opens Food Reels
      if (deltaX > 90 && Math.abs(deltaY) < 70) {
        setIsReelsOpen(true);
      }
    }
  };

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

  // 6.5 Priority 1 Menu Items: localStorage ('smartdine_menu_items') or IndexedDB
  const [storedMenuItems, setStoredMenuItems] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('smartdine_menu_items');
        if (raw) {
          const parsed = JSON.parse(raw);
          const normalized = normalizeDishList(parsed);
          if (normalized && normalized.length > 0) {
            return normalized;
          }
        }
      } catch (err) {
        console.warn('[CustomerMenu] Error reading initial smartdine_menu_items from localStorage:', err);
      }
    }
    return null;
  });

  // Ensure Telegram CDN assets (images & 360° videos) can be fetched without hotlinking / referrer restrictions
  useEffect(() => {
    if (typeof document !== 'undefined') {
      let meta = document.querySelector('meta[name="referrer"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'referrer';
        meta.content = 'no-referrer-when-downgrade';
        document.head.appendChild(meta);
      }
    }
  }, []);

  // Priority 1: Load from IndexedDB if not found in localStorage or on initial launch
  useEffect(() => {
    let isMounted = true;
    async function loadCachedMenu() {
      try {
        const localRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('smartdine_menu_items') : null;
        if (localRaw) {
          try {
            const parsed = JSON.parse(localRaw);
            const normalized = normalizeDishList(parsed);
            if (normalized && normalized.length > 0) {
              if (isMounted) setStoredMenuItems(normalized);
              return;
            }
          } catch (_) {}
        }

        const cached = await getCachedMenu();
        if (cached && isMounted) {
          const normalized = normalizeDishList(cached);
          if (normalized && normalized.length > 0) {
            setStoredMenuItems(normalized);
          }
        }
      } catch (e) {
        console.warn('[CustomerMenu] Error loading cached menu from IndexedDB:', e);
      }
    }
    loadCachedMenu();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time listener for MenuManager saves/edits:
  // - smartdine:menu-updated (window / document custom event)
  // - smartdine_restaurant_state (BroadcastChannel)
  // - smartdine_menu_items (storage event across tabs)
  useEffect(() => {
    const handleMenuSync = async (payload) => {
      if (payload) {
        const normalized = normalizeDishList(payload);
        if (normalized && normalized.length > 0) {
          setStoredMenuItems(normalized);
          return;
        }
      }

      // Check localStorage first
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem('smartdine_menu_items');
          if (raw) {
            const parsed = JSON.parse(raw);
            const normalized = normalizeDishList(parsed);
            if (normalized && normalized.length > 0) {
              setStoredMenuItems(normalized);
              return;
            }
          }
        } catch (e) {
          console.warn('[CustomerMenu] Error re-reading localStorage smartdine_menu_items:', e);
        }
      }

      // Check IndexedDB
      try {
        const cached = await getCachedMenu();
        if (cached) {
          const normalized = normalizeDishList(cached);
          if (normalized && normalized.length > 0) {
            setStoredMenuItems(normalized);
          }
        }
      } catch (e) {
        console.warn('[CustomerMenu] Error re-reading IndexedDB menu:', e);
      }
    };

    // A. Custom Event listener: 'smartdine:menu-updated' on window and document
    const onMenuUpdated = (e) => {
      const data = e?.detail?.items || e?.detail?.menu || e?.detail?.dishes || e?.detail;
      handleMenuSync(data);
    };
    window.addEventListener('smartdine:menu-updated', onMenuUpdated);
    document.addEventListener('smartdine:menu-updated', onMenuUpdated);

    // B. BroadcastChannel listener on 'smartdine_restaurant_state'
    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.onmessage = (event) => {
          const msg = event?.data;
          if (!msg) return;

          const isMenuUpdate =
            msg.type === 'smartdine:menu-updated' ||
            msg.type === 'MENU_UPDATED' ||
            msg.type === 'MENU_ITEMS_UPDATED' ||
            msg.type === 'MENU_SYNC' ||
            msg.type === 'smartdine_menu_items' ||
            (typeof msg.type === 'string' && msg.type.toLowerCase().includes('menu'));

          if (isMenuUpdate) {
            const data = msg.data?.items || msg.data?.menu || msg.data?.dishes || msg.data || msg.items || msg.menu;
            handleMenuSync(data);
          }
        };
      }
    } catch (e) {
      console.warn('[CustomerMenu] BroadcastChannel setup error:', e);
    }

    // C. Cross-tab storage change listener
    const onStorage = (e) => {
      if (e.key === 'smartdine_menu_items' || e.key === 'smartdine_offline_menu') {
        handleMenuSync();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('smartdine:menu-updated', onMenuUpdated);
      document.removeEventListener('smartdine:menu-updated', onMenuUpdated);
      window.removeEventListener('storage', onStorage);
      if (bc) {
        try {
          bc.close();
        } catch (_) {}
      }
    };
  }, []);

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
  const showToast = useCallback((msg) => {
    setToMessage(msg);
    setTimeout(() => {
      setToMessage(null);
    }, 4000);
  }, []);

  // ── Two-Way Staff & Customer Messaging Engine ─────────────────────────────
  const [activeStaffMessage, setActiveStaffMessage] = useState(null);
  const [staffMessageHistory, setStaffMessageHistory] = useState([]);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Play pleasant audible chime on receiving a new staff message
  const playStaffMessageChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const t = ctx.currentTime;
      // 2-tone melodic chime: E5 (659Hz) -> A5 (880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, t);
      gain1.gain.setValueAtTime(0.25, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, t + 0.12);
      gain2.gain.setValueAtTime(0.2, t + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.12);
      osc2.stop(t + 0.5);
    } catch (_) {}
  }, []);

  // Time formatter for message elapsed time
  const formatTimeAgo = useCallback((ts) => {
    if (!ts) return 'Just now';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }, []);

  // Load initial staff message for this table on mount or when tableNumber changes
  useEffect(() => {
    if (!tableNumber) return;
    const tblStr = String(tableNumber);
    try {
      const raw = localStorage.getItem(`smartdine_table_msg_${tblStr}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.text && !parsed.dismissed) {
          // Keep visible if within last 2 hours
          if (!parsed.sentAt || Date.now() - parsed.sentAt < 2 * 3600 * 1000) {
            setActiveStaffMessage(parsed);
          }
        }
      }
      const histRaw = localStorage.getItem(`smartdine_table_msgs_${tblStr}`);
      if (histRaw) {
        const histParsed = JSON.parse(histRaw);
        if (Array.isArray(histParsed)) {
          setStaffMessageHistory(histParsed);
        }
      }
    } catch (_) {}
  }, [tableNumber]);

  // Real-time listener for incoming staff messages to Table #X
  useEffect(() => {
    if (!tableNumber) return;
    const tblStr = String(tableNumber);

    const handleIncomingMessage = (msgData) => {
      if (!msgData || String(msgData.table) !== tblStr) return;
      setActiveStaffMessage(msgData);
      setStaffMessageHistory(prev => {
        const exists = prev.some(m => m.id === msgData.id);
        return exists ? prev : [...prev, msgData];
      });
      playStaffMessageChime();
      showToast(`💬 Staff Message: "${msgData.text}"`);
    };

    // 1. Cross-tab BroadcastChannel
    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.onmessage = (e) => {
          if (e.data?.type === 'CUSTOMER_MESSAGE' && e.data?.data) {
            handleIncomingMessage(e.data.data);
          }
        };
      }
    } catch (_) {}

    // 2. Storage event for cross-tab fallback
    const handleStorage = (e) => {
      if (e.key === `smartdine_table_msg_${tblStr}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && !parsed.dismissed) {
            handleIncomingMessage(parsed);
          }
        } catch (_) {}
      }
    };

    // 3. Custom DOM event (for same-window / embedded simulator iframes)
    const handleCustomEvent = (e) => {
      if (e.detail) {
        handleIncomingMessage(e.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('smartdine:table_message', handleCustomEvent);

    return () => {
      if (bc) {
        try { bc.close(); } catch (_) {}
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('smartdine:table_message', handleCustomEvent);
    };
  }, [tableNumber, playStaffMessageChime, showToast]);

  // Dismiss active staff message
  const handleDismissStaffMessage = useCallback(() => {
    if (!activeStaffMessage || !tableNumber) {
      setActiveStaffMessage(null);
      return;
    }
    const tblStr = String(tableNumber);
    try {
      const updated = { ...activeStaffMessage, dismissed: true };
      localStorage.setItem(`smartdine_table_msg_${tblStr}`, JSON.stringify(updated));
    } catch (_) {}
    setActiveStaffMessage(null);
    setIsReplyOpen(false);
  }, [activeStaffMessage, tableNumber]);

  // Send customer reply back to staff / manager
  const handleSendCustomerReply = useCallback((replyContent) => {
    const textToSend = (replyContent || replyText).trim();
    if (!textToSend || !tableNumber) return;

    setIsSendingReply(true);
    const tblNum = Number(tableNumber);
    const timestamp = Date.now();
    const replyPayload = {
      id: `reply-${timestamp}-${Math.random().toString(36).substr(2, 4)}`,
      reportId: activeStaffMessage?.reportId || null,
      table: tblNum,
      from: `Table #${tblNum} Guest`,
      text: textToSend,
      sentAt: timestamp
    };

    // 1. Append to reports in localStorage
    try {
      ['smartdine_customer_reports_v4', 'smartdine_customer_reports_v3'].forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const reports = JSON.parse(raw);
          if (Array.isArray(reports)) {
            const updated = reports.map(r => {
              const matchesId = activeStaffMessage?.reportId && r.id === activeStaffMessage.reportId;
              const matchesTable = Number(r.table) === tblNum && r.status !== 'resolved';
              if (matchesId || matchesTable) {
                return {
                  ...r,
                  messages: [
                    ...(r.messages || []),
                    {
                      id: replyPayload.id,
                      to: 'staff',
                      from: `Table #${tblNum} Guest`,
                      text: textToSend,
                      sentAt: timestamp
                    }
                  ]
                };
              }
              return r;
            });
            localStorage.setItem(key, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('smartdine:report_updated', { detail: { reports: updated } }));
          }
        }
      });

      // Also set dedicated customer reply key for immediate storage triggers
      localStorage.setItem('smartdine_customer_reply', JSON.stringify(replyPayload));
    } catch (_) {}

    // 2. BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.postMessage({
          type: 'CUSTOMER_REPLY',
          data: replyPayload,
          timestamp
        });
        bc.close();
      }
    } catch (_) {}

    // 3. UI feedback
    showToast(`✓ Sent reply to staff: "${textToSend}"`);
    setReplyText('');
    setIsReplyOpen(false);
    setIsSendingReply(false);
  }, [replyText, tableNumber, activeStaffMessage, showToast]);

  // Look up if current table has an active waiter assistance request
  const activeTableAssistanceCall = useMemo(() => {
    if (!tableNumber) return null;
    const tblNum = Number(tableNumber);
    if (!tblNum) return null;

    if (restaurant?.assistanceCalls && Array.isArray(restaurant.assistanceCalls)) {
      const found = restaurant.assistanceCalls.find(
        c => Number(c.tableNumber || c.table_number || c.table) === tblNum && c.status !== 'resolved'
      );
      if (found) return found;
    }

    try {
      const raw = localStorage.getItem('smartdine_active_assistance_calls');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const found = parsed.find(
            c => Number(c.tableNumber || c.table_number || c.table) === tblNum && c.status !== 'resolved'
          );
          if (found) return found;
        }
      }
    } catch (_) {}

    return null;
  }, [restaurant?.assistanceCalls, tableNumber]);

  // Cancel assistance call
  const handleCancelAssistance = useCallback(() => {
    if (!activeTableAssistanceCall) return;
    const idToResolve = activeTableAssistanceCall.id || activeTableAssistanceCall.tableNumber;
    if (restaurant?.resolveAssistanceCall) {
      restaurant.resolveAssistanceCall(idToResolve);
    } else {
      try {
        const raw = localStorage.getItem('smartdine_active_assistance_calls');
        if (raw) {
          const parsed = JSON.parse(raw);
          const filtered = parsed.filter(c => c.id !== idToResolve && Number(c.tableNumber) !== Number(tableNumber));
          localStorage.setItem('smartdine_active_assistance_calls', JSON.stringify(filtered));
        }
      } catch (_) {}
    }
    showToast('Assistance request cancelled.');
  }, [activeTableAssistanceCall, restaurant, tableNumber, showToast]);

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
        const normalized = normalizeDishItem(item, cat.name);
        if (normalized) list.push(normalized);
      });
    });
    return list.length > 0 ? list : null;
  }, [convexMenu]);

  // Menu items list adhering strictly to priority hierarchy:
  // 1. First: localStorage.getItem('smartdine_menu_items') or IndexedDB cached items (storedMenuItems)
  // 2. Second: propMenuItems
  // 3. Third: DEFAULT_MENU_ITEMS (with fallback to convexFormattedItems if neither 1 nor 2 present)
  const allMenuItems = useMemo(() => {
    // Priority 1: localStorage or IndexedDB cached items
    if (storedMenuItems && Array.isArray(storedMenuItems) && storedMenuItems.length > 0) {
      return storedMenuItems;
    }
    // Priority 2: propMenuItems
    if (propMenuItems && Array.isArray(propMenuItems) && propMenuItems.length > 0) {
      const normalizedProps = normalizeDishList(propMenuItems);
      return (normalizedProps && normalizedProps.length > 0) ? normalizedProps : propMenuItems;
    }
    // Priority 3: convexFormattedItems (if present from cloud) or DEFAULT_MENU_ITEMS
    if (convexFormattedItems && Array.isArray(convexFormattedItems) && convexFormattedItems.length > 0) {
      return convexFormattedItems;
    }
    return DEFAULT_MENU_ITEMS;
  }, [storedMenuItems, propMenuItems, convexFormattedItems]);

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
    
    // Canonical ordering: Appetizers/Starters, Steak/Mains, Pizza, Burgers/Special Food, Desserts, Beverages
    const orderMap = { starters: 1, mains: 2, pizza: 3, burgers: 4, desserts: 5, beverages: 6 };
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
        key: cat.key,
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
          key: meta.key,
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

  // Reveal menu sections as they scroll into view (CSS handles the motion;
  // reduced-motion users get everything visible immediately via CSS)
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const pending = Array.from(document.querySelectorAll('[data-ch-reveal]:not(.is-visible)'));
    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    );
    pending.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categorizedSections, selectedCategory, filteredItems.length]);

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

  // Handle Assistance Called from Navbar
  const handleWaiterCalled = (reason, table) => {
    const finalTable = table || tableNumber || '1';
    const assignedEmp = restaurant?.getAssignedEmployeeForTable?.(finalTable);
    const assignedName = assignedEmp ? assignedEmp.name : 'Floor Specialist';
    showToast(`🛎️ Table #${finalTable} requested assistance -> Routed to assigned employee: ${assignedName}`);
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
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-transparent text-slate-100 pb-32 selection:bg-[#0284c7] selection:text-white relative"
    >
      {/* Village at dusk: trees, grazing cow, kash flowers in the wind (light SVG + CSS) */}
      <VillageBackground />
      
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

      {/* Main Container: Dedicated 3D Interactive Restaurant Menu Book */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-2 pb-16 relative z-10 flex flex-col items-center">

        {/* ── REAL-TIME STAFF DISPATCH MESSAGE BANNER ── */}
        {activeStaffMessage && (
          <div className="w-full max-w-5xl mb-4 bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-[#0b101d]/95 border border-cyan-500/50 ring-1 ring-cyan-400/30 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur-md animate-fadeIn transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 flex items-center justify-center shrink-0 shadow-inner">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-cyan-500/25 border border-cyan-400/40 text-cyan-200">
                      Staff Message &bull; Table #{tableNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {activeStaffMessage.from || 'Restaurant Staff'} &bull; {formatTimeAgo(activeStaffMessage.sentAt)}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-white leading-snug break-words">
                    "{activeStaffMessage.text}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReplyOpen(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Send a quick reply to staff"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reply</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissStaffMessage}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                  title="Dismiss notification"
                  aria-label="Dismiss staff message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Reply Drawer / Chips */}
            {isReplyOpen && (
              <div className="mt-3.5 pt-3 border-t border-cyan-500/20 animate-fadeIn">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Thank you! 👍', "We're ready 👌", 'Please hurry 🙏', 'Understood, thanks! ✨'].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendCustomerReply(chip)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-200 transition cursor-pointer active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendCustomerReply()}
                    placeholder="Write a quick note back to staff..."
                    className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-[#070b14] border border-cyan-500/30 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    disabled={!replyText.trim() || isSendingReply}
                    onClick={() => handleSendCustomerReply()}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVE WAITER ASSISTANCE STATUS BANNER ── */}
        {activeTableAssistanceCall && (
          <div className="w-full max-w-5xl mb-4 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/30 border border-amber-500/40 ring-1 ring-amber-400/20 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-lg shadow-black/40 backdrop-blur-md animate-fadeIn">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Waiter Assistance Active
                  </span>
                  <span className="text-[10px] font-bold text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    {activeTableAssistanceCall.assignedEmployeeName ? `Routed to: ${activeTableAssistanceCall.assignedEmployeeName}` : 'Floor Staff Alerted'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    &bull; {formatTimeAgo(activeTableAssistanceCall.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-200 truncate mt-0.5 font-medium">
                  Requested: <span className="font-semibold text-white">{activeTableAssistanceCall.reason || 'Assistance requested'}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelAssistance}
              className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-700 transition shrink-0 cursor-pointer active:scale-95"
              title="Cancel assistance call"
            >
              Cancel Request
            </button>
          </div>
        )}

        {/* Live Customer Order Status Tracker (only if active order) */}
        {activeOrder && activeOrder.status !== 'served' && (
          <div className="w-full max-w-5xl mb-4 bg-[#0b0b0e]/45 border border-[#FF5A26]/35 ring-1 ring-[#FF5A26]/20 rounded-3xl p-5 sm:p-6 shadow-lg animate-fadeIn">
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

        {/* =====================================================================
            A La Carte Dishes Grid (Matching Screenshot Plate Aesthetic)
            ===================================================================== */}
        <section id="menu-food-grid" className="w-full max-w-7xl pt-4 sm:pt-6 pb-12 scroll-mt-24">
          {/* Section Divider & Heading */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-3 text-amber-400 text-xs font-bold tracking-[0.22em] uppercase mb-2">
              <span className="opacity-60">✦ ─────</span>
              <span>À LA CARTE SELECTION</span>
              <span className="opacity-60">───── ✦</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-normal text-white tracking-tight [font-family:Playfair_Display,Georgia,serif]">
              Chef's Culinary Creations
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-2 font-normal">
              Freshly prepared to order. Tap any dish for 360° views and culinary details, or add directly to your dining order.
            </p>
          </div>

          {/* Category Bar for quick navigation */}
          <div className="mb-6">
            <CategoryBar
              categories={categoriesList}
              selectedCategory={selectedCategory}
              onSelectCategory={(catId) => handleSelectCategory(catId)}
              categoryCounts={categoryCounts}
            />
          </div>

          {/* Search & Dietary Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8 px-1">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes, ingredients..."
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition shadow-inner"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVegOnlyFilter((v) => !v)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  vegOnlyFilter
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700 hover:border-emerald-500/50'
                }`}
              >
                <Leaf className="w-3.5 h-3.5" />
                <span>Veg Only</span>
              </button>

              <button
                type="button"
                onClick={() => setSpicyFilter((s) => !s)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  spicyFilter
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700 hover:border-emerald-500/50'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Spicy</span>
              </button>

              {(searchQuery || vegOnlyFilter || spicyFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setVegOnlyFilter(false);
                    setSpicyFilter(false);
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Dishes Presentation (Grid matching screenshot style) */}
          {filteredItems.length > 0 ? (
            selectedCategory === 'All' && !searchQuery && !vegOnlyFilter && !spicyFilter ? (
              // Grouped by Category with Section Titles
              <div className="space-y-12">
                {categorizedSections.map((section) => (
                  <div key={section.categoryKey} id={`cat-section-${section.categoryKey}`} className="space-y-4 scroll-mt-28">
                    {/* Category Title Banner */}
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                      <div className="flex items-center gap-3">
                        <span className="text-xl sm:text-2xl">{section.icon}</span>
                        <div>
                          <h3 className="text-lg sm:text-2xl font-normal text-white tracking-tight [font-family:Playfair_Display,Georgia,serif]">
                            {section.title}
                          </h3>
                          <p className="text-xs text-slate-400">{section.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 bg-slate-900/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                        {section.items.length} {section.items.length === 1 ? 'dish' : 'dishes'}
                      </span>
                    </div>

                    {/* 4-column Grid matching screenshot */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                      {section.items.map((dish, idx) => {
                        const inCart = cart[dish.id];
                        return (
                          <MenuItemCard
                            key={dish.id}
                            item={dish}
                            index={idx}
                            layout="plate"
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
                  </div>
                ))}
              </div>
            ) : (
              // Filtered / Searched Single Grid
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                  <h3 className="text-lg sm:text-2xl font-normal text-white tracking-tight [font-family:Playfair_Display,Georgia,serif]">
                    {selectedCategory === 'All' ? 'Search Results' : (getCategoryMetadata(selectedCategory).title || selectedCategory)}
                  </h3>
                  <span className="text-xs font-bold text-amber-400 bg-slate-900/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                    {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                  {filteredItems.map((dish, idx) => {
                    const inCart = cart[dish.id];
                    return (
                      <MenuItemCard
                        key={dish.id}
                        item={dish}
                        index={idx}
                        layout="plate"
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
              </div>
            )
          ) : (
            /* Empty State */
            <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-8 sm:p-12 text-center max-w-md mx-auto my-10 shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center mb-3.5 border border-emerald-500/30">
                <UtensilsCrossed className="w-8 h-8 stroke-[1.8]" />
              </div>
              <h3 className="font-normal text-white text-xl mb-1 [font-family:Playfair_Display,Georgia,serif]">
                No matching dishes found
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
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
                className="min-h-11 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>
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
                <div className="cm-showcase flex flex-col">
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

      {/* Guest chat with the restaurant (table staff + manager) */}
      <GuestChat tableNumber={tableNumber} raised={cartSummary.totalCount > 0} hidden={isCartOpen || !!selectedDishModal} />

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
        onOpenReels={(dish) => {
          setSelectedDishModal(null);
          setReelsInitialDishId(dish?.id || null);
          setIsReelsOpen(true);
        }}
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

      {/* FB / Instagram Style Full Functional Food Reels with Anonymous Comments & 1-Tap Order */}
      <FoodReelsModal
        isOpen={isReelsOpen}
        onClose={() => {
          setIsReelsOpen(false);
          setReelsInitialDishId(null);
        }}
        menuItems={allMenuItems}
        initialDishId={reelsInitialDishId}
        tableNumber={tableNumber}
        onAddToCart={(item, qty) => {
          setCart((prev) => {
            const existing = prev[item.id];
            const newQty = (existing?.quantity || 0) + (qty || 1);
            return {
              ...prev,
              [item.id]: {
                item,
                quantity: newQty,
                note: existing?.note || '',
                voiceNoteUrl: existing?.voiceNoteUrl || null
              }
            };
          });
          showToast(`Added ${item.name || item.title} to order! 🌟`);
        }}
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

      {/* Floating Food Reels Trigger Pill (FB/IG Reels Style with Swipe-Right gesture) */}
      <button
        type="button"
        onClick={() => {
          setReelsInitialDishId(null);
          setIsReelsOpen(true);
        }}
        className="fixed right-4 bottom-24 sm:bottom-8 z-40 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-[#FF5A26] via-rose-500 to-pink-600 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-2xl active:scale-95 transition-all cursor-pointer border border-white/20 hover:scale-105 hover:shadow-rose-500/30 group"
        title="Watch Food Reels with Anonymous Comments & 1-Tap Order (or swipe right)"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <Film className="w-4 h-4 stroke-[2.5] text-white group-hover:rotate-6 transition-transform" />
        <span className="tracking-tight font-extrabold">Food Reels</span>
        <span className="px-1.5 py-0.5 rounded-full bg-black/35 text-[10px] font-black uppercase tracking-wider text-amber-300">Live</span>
      </button>

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
