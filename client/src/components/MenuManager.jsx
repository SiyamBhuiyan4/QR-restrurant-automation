import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Leaf, 
  Flame, 
  AlertCircle, 
  Image as ImageIcon, 
  DollarSign, 
  Sparkles, 
  RefreshCw,
  Eye,
  EyeOff,
  Tag,
  CheckCircle2,
  UtensilsCrossed,
  Send,
  Video,
  Play,
  Upload,
  FolderPlus
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import { convex } from '../convexClient.js';
import { getCachedMenu, cacheMenu } from '../db/indexedDb.js';
import { uploadMediaToTelegram, publishMenuSnapshotToTelegram } from '../services/telegramClient.js';
import '../styles/admin.css';

// Helper to detect whether a media URL or file points to a video
export const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.includes('.mp4') ||
    clean.includes('.webm') ||
    clean.includes('.mov') ||
    clean.includes('.mkv') ||
    clean.includes('sendvideo') ||
    clean.includes('/videos/') ||
    clean.includes('video/') ||
    clean.startsWith('data:video')
  );
};

// 1-Click 360° Angular Profile Video Preset Clips
export const PRESET_360_VIDEOS = [
  { label: '360° Wagyu Smash Burger', url: '/videos/reel-chef.mp4' },
  { label: '360° Sizzling Ribeye Steak', url: '/videos/reel-chef.mp4' },
  { label: '360° Truffle Tagliatelle', url: '/videos/reel-chef.mp4' },
  { label: '360° Molten Lava Dessert', url: '/videos/reel-chef.mp4' },
  { label: '360° Chef Culinary Fire', url: '/videos/reel-chef.mp4' }
];

// Initial fallback sample menu in case server is fresh or offline
const INITIAL_SAMPLE_DISHES = [
  {
    id: 1,
    name: 'Truffle Mushroom Burger',
    category: 'Burgers',
    category_id: 3,
    price: 15.99,
    description: 'Brioche bun, grilled portobello, aged gruyere cheese, black truffle aioli, arugula.',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    making_video_url: '/videos/reel-chef.mp4',
    is_veg: 1,
    is_spicy: 0,
    is_available: 1
  },
  {
    id: 2,
    name: 'Spicy Buffalo Wings',
    category: 'Starters',
    category_id: 1,
    price: 12.50,
    description: 'Crispy chicken wings tossed in our signature habanero sauce, served with blue cheese dip.',
    image_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80',
    making_video_url: '',
    is_veg: 0,
    is_spicy: 1,
    is_available: 1
  },
  {
    id: 3,
    name: 'Artisan Margherita Pizza',
    category: 'Mains',
    category_id: 2,
    price: 18.00,
    description: 'San Marzano tomatoes, fresh buffalo mozzarella, extra virgin olive oil, sweet basil.',
    image_url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80',
    making_video_url: '',
    is_veg: 1,
    is_spicy: 0,
    is_available: 1
  },
  {
    id: 4,
    name: 'Char-Grilled Ribeye Steak',
    category: 'Mains',
    category_id: 2,
    price: 29.50,
    description: '300g prime grass-fed ribeye, roasted rosemary garlic butter, charred asparagus.',
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    making_video_url: '',
    is_veg: 0,
    is_spicy: 0,
    is_available: 1
  },
  {
    id: 5,
    name: 'Fiery Jalapeño Loaded Nachos',
    category: 'Starters',
    category_id: 1,
    price: 11.25,
    description: 'Stone ground tortilla chips, melted cheddar blend, pickeled jalapeños, pico de gallo, guacamole.',
    image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80',
    making_video_url: '',
    is_veg: 1,
    is_spicy: 1,
    is_available: 1
  },
  {
    id: 6,
    name: 'Signature Passionfruit Mocktail',
    category: 'Beverages',
    category_id: 4,
    price: 6.50,
    description: 'Fresh passionfruit pulp, crushed mint, lime juice, sparkling soda water.',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    making_video_url: '',
    is_veg: 1,
    is_spicy: 0,
    is_available: 1
  },
  {
    id: 7,
    name: 'Molten Belgian Chocolate Lava Cake',
    category: 'Desserts',
    category_id: 5,
    price: 8.95,
    description: 'Warm rich dark chocolate cake with a molten center, Madagascar vanilla bean gelato.',
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
    making_video_url: '',
    is_veg: 1,
    is_spicy: 0,
    is_available: 0
  }
];

const DEFAULT_CATEGORIES = ['Starters', 'Mains', 'Burgers', 'Beverages', 'Desserts', 'Sides'];

export default function MenuManager({ className = '' }) {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState('');

  // Custom categories list with persistence
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('smartdine_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Category creation modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    icon: '🍽️',
    description: ''
  });
  const [categoryError, setCategoryError] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Inline category creation in Dish Modal
  const [isCreatingInlineCategory, setIsCreatingInlineCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');

  // Filtering and search state
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'veg', 'spicy', 'available', 'unavailable'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingDishId, setEditingDishId] = useState(null);

  // Delete confirmation modal state
  const [dishToDelete, setDishToDelete] = useState(null);

  // Form input state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Mains',
    price: '',
    description: '',
    image_url: '',
    making_video_url: '',
    telegram_file_id: '',
    telegram_video_file_id: '',
    is_veg: false,
    is_spicy: false,
    is_available: true,
    show_in_reels: true
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Telegram Channel Media Upload states & file refs
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isSyncingTelegram, setIsSyncingTelegram] = useState(false);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Convex Real-Time Menu & Mutations (Convex = structured text database, Telegram = free media storage CDN)
  const convexMenu = useQuery(api.menu.getMenu);
  const convexCategories = useQuery(api.menu.getCategories);
  const createConvexItem = useMutation(api.menu.createMenuItem);
  const updateConvexItem = useMutation(api.menu.updateMenuItem);
  const deleteConvexItem = useMutation(api.menu.deleteMenuItem);
  const toggleConvexAvailability = useMutation(api.menu.toggleAvailability);
  const createConvexCategory = useMutation(api.menu.createCategory);

  // Normalizes dish object to handle both snake_case, camelCase and Convex fields
  const normalizeDish = useCallback((item) => {
    const isConvexId = typeof item._id === 'string' || (typeof item.id === 'string' && item.id.startsWith('j'));
    const convexId = item._id || (isConvexId ? item.id : item.convexId || null);

    const rawVideo = item.making_video_url || item.makingVideoUrl || item.videoUrl || (isVideoUrl(item.image_url || item.imageUrl || item.image) ? (item.image_url || item.imageUrl || item.image) : '');
    const rawImage = item.image_url || item.imageUrl || item.image || '';

    return {
      id: item.id || item._id,
      convexId,
      name: item.name || item.title || 'Untitled Dish',
      category: item.category || item.category_name || item.categoryName || 'Mains',
      category_id: item.category_id || item.categoryId || null,
      categorySlug: item.categorySlug || (item.category ? item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'mains'),
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
      description: item.description || '',
      image_url: rawImage || rawVideo || '',
      making_video_url: rawVideo || (isVideoUrl(rawImage) ? rawImage : ''),
      videoUrl: rawVideo || undefined,
      telegram_file_id: item.telegram_file_id || item.telegramFileId || '',
      telegram_video_file_id: item.telegram_video_file_id || item.telegramVideoFileId || '',
      is_veg: item.is_veg === 1 || item.is_veg === true || item.isVeg === true || item.veg === true ? 1 : 0,
      is_spicy: item.is_spicy === 1 || item.is_spicy === true || item.isSpicy === true || item.spicy === true ? 1 : 0,
      is_available: item.is_available === 0 || item.is_available === false || item.isAvailable === false || item.available === false ? 0 : 1
    };
  }, []);

  // Show a momentary success message
  const triggerSuccess = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast('');
    }, 3500);
  };

  // Load menu from Server with fallback to LocalStorage, IndexedDB or initial sample data
  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError(null);
    let loadedDishes = [];

    // 0. High priority check: LocalStorage smartdine_menu_items
    try {
      const stored = localStorage.getItem('smartdine_menu_items');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedDishes = parsed.map(normalizeDish);
        }
      }
    } catch (e) {
      console.warn('[MenuManager] LocalStorage retrieval error:', e);
    }

    try {
      // 1. Load the menu from Convex (categories with their items, flattened to dishes)
      const menu = await convex.query(api.menu.getMenu);
      const list = [];
      (Array.isArray(menu) ? menu : []).forEach((cat) => {
        (cat.items || []).forEach((item) => {
          list.push(normalizeDish({
            ...item,
            id: item._id,
            convexId: item._id,
            category: cat.name,
            categorySlug: cat.slug || item.categorySlug,
            categoryId: cat._id
          }));
        });
      });
      if (list.length > 0 && loadedDishes.length === 0) {
        loadedDishes = list;
      }
    } catch (err) {
      console.warn('[MenuManager] Convex menu load failed or offline, loading from IndexedDB:', err.message);
    }

    // 2. If server failed or returned empty, load from IndexedDB
    if (loadedDishes.length === 0) {
      try {
        const cached = await getCachedMenu();
        if (cached && Array.isArray(cached) && cached.length > 0) {
          loadedDishes = cached.map(normalizeDish);
        }
      } catch (idbErr) {
        console.warn('[MenuManager] IndexedDB retrieval failed:', idbErr);
      }
    }

    // 3. Fallback to sample data if both server and IndexedDB were empty
    if (loadedDishes.length === 0) {
      loadedDishes = INITIAL_SAMPLE_DISHES.map(normalizeDish);
    }

    try {
      localStorage.setItem('smartdine_menu_items', JSON.stringify(loadedDishes));
    } catch {}
    await cacheMenu(loadedDishes).catch(() => {});

    // Also fetch categories from server API
    try {
      const cats = await convex.query(api.menu.getCategories);
      if (Array.isArray(cats) && cats.length > 0) {
        const names = cats.map(c => c.name).filter(Boolean);
        setCustomCategories(prev => Array.from(new Set([...prev, ...names])));
      }
    } catch (e) {
      // offline fallback
    }

    setDishes(loadedDishes);
    setLoading(false);
  }, [normalizeDish]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // Real-time synchronization listener for external updates from other tabs
  useEffect(() => {
    const handleMenuSync = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setDishes(e.detail.map(normalizeDish));
      }
    };
    window.addEventListener('smartdine:menu-updated', handleMenuSync);

    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.onmessage = (evt) => {
          if (evt.data?.type === 'MENU_UPDATED' && Array.isArray(evt.data?.menu)) {
            setDishes(evt.data.menu.map(normalizeDish));
          }
        };
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('smartdine:menu-updated', handleMenuSync);
      if (bc) {
        try { bc.close(); } catch (_) {}
      }
    };
  }, [normalizeDish]);

  // Extract all unique category names (Default + Custom + Convex + Existing Dishes)
  const availableCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    customCategories.forEach(c => {
      if (c && typeof c === 'string') set.add(c.trim());
      else if (c && c.name) set.add(c.name.trim());
    });
    if (convexCategories && Array.isArray(convexCategories)) {
      convexCategories.forEach(c => {
        if (c.name) set.add(c.name.trim());
      });
    }
    dishes.forEach(d => {
      if (d.category && typeof d.category === 'string') {
        set.add(d.category.trim());
      }
    });
    return Array.from(set);
  }, [dishes, customCategories, convexCategories]);

  // Sync Convex Categories
  useEffect(() => {
    if (convexCategories && Array.isArray(convexCategories)) {
      const names = convexCategories.map(c => c.name).filter(Boolean);
      if (names.length > 0) {
        setCustomCategories(prev => {
          const set = new Set([...prev, ...names]);
          const arr = Array.from(set);
          try {
            localStorage.setItem('smartdine_custom_categories', JSON.stringify(arr));
          } catch {}
          return arr;
        });
      }
    }
  }, [convexCategories]);

  // Filtered dishes calculation
  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      // Category check
      if (selectedCategory !== 'All' && dish.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = dish.name.toLowerCase().includes(query);
        const matchesDesc = (dish.description || '').toLowerCase().includes(query);
        const matchesCat = (dish.category || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCat) {
          return false;
        }
      }
      // Dietary / Availability / Media filters
      if (filterType === 'video' && !dish.making_video_url && !dish.makingVideoUrl && !dish.videoUrl && !isVideoUrl(dish.image_url)) return false;
      if (filterType === 'veg' && !dish.is_veg) return false;
      if (filterType === 'spicy' && !dish.is_spicy) return false;
      if (filterType === 'available' && !dish.is_available) return false;
      if (filterType === 'unavailable' && dish.is_available) return false;

      return true;
    });
  }, [dishes, selectedCategory, searchQuery, filterType]);

  // Group filtered dishes by category for sectioned display (keeps filter order)
  const groupedDishes = useMemo(() => {
    const groups = new Map();
    filteredDishes.forEach((dish) => {
      const key = dish.category || 'Uncategorized';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(dish);
    });
    return Array.from(groups.entries());
  }, [filteredDishes]);

  // Real-time synchronization with Convex Cloud Database
  useEffect(() => {
    if (convexMenu && Array.isArray(convexMenu) && convexMenu.length > 0) {
      const list = [];
      const catNames = [];
      convexMenu.forEach((cat) => {
        if (cat.name) catNames.push(cat.name);
        (cat.items || []).forEach((item) => {
          list.push(normalizeDish({
            ...item,
            id: item._id,
            convexId: item._id,
            category: cat.name,
            categorySlug: cat.slug || item.categorySlug,
            categoryId: cat._id
          }));
        });
      });
      if (catNames.length > 0) {
        setCustomCategories(prev => Array.from(new Set([...prev, ...catNames])));
      }
      if (list.length > 0) {
        setDishes(list);
        setLoading(false);
        cacheMenu(list).catch(() => {});
      }
    }
  }, [convexMenu, normalizeDish]);

  // Overall quick stats
  const stats = useMemo(() => {
    const total = dishes.length;
    const inStock = dishes.filter(d => d.is_available).length;
    const outOfStock = total - inStock;
    const vegCount = dishes.filter(d => d.is_veg).length;
    const tgMediaCount = dishes.filter(d => (d.image_url || '').includes('telegram') || (d.making_video_url || '').includes('telegram')).length;
    return { total, inStock, outOfStock, vegCount, tgMediaCount };
  }, [dishes]);

  // Centralized menu updater: state, localStorage, IndexedDB, CustomEvent, BroadcastChannel, Telegram snapshot
  const commitMenuUpdate = useCallback(async (updatedList) => {
    // 1. Direct local dishes state
    setDishes(updatedList);

    // 2. Persist to localStorage
    try {
      localStorage.setItem('smartdine_menu_items', JSON.stringify(updatedList));
    } catch (err) {
      console.warn('[MenuManager] LocalStorage menu persistence warning:', err);
    }

    // 3. Persist to IndexedDB cache
    try {
      await cacheMenu(updatedList);
    } catch (err) {
      console.warn('[MenuManager] IndexedDB cacheMenu warning:', err);
    }

    // 4. Dispatch custom event for real-time same-window sync with CustomerMenu
    try {
      window.dispatchEvent(new CustomEvent('smartdine:menu-updated', { detail: updatedList }));
    } catch (err) {
      console.warn('[MenuManager] CustomEvent smartdine:menu-updated warning:', err);
    }

    // 5. BroadcastChannel for cross-tab sync with CustomerMenu
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.postMessage({ type: 'MENU_UPDATED', menu: updatedList, detail: updatedList });
        bc.close();
      }
    } catch (err) {
      console.warn('[MenuManager] BroadcastChannel dispatch warning:', err);
    }

    // 6. Automatically call publishMenuSnapshotToTelegram
    try {
      if (typeof publishMenuSnapshotToTelegram === 'function') {
        publishMenuSnapshotToTelegram(updatedList, customCategories).catch((tgErr) => {
          console.warn('[MenuManager] Telegram snapshot auto-sync warning:', tgErr);
        });
      }
    } catch (tgErr) {
      console.warn('[MenuManager] Telegram publishMenuSnapshotToTelegram call warning:', tgErr);
    }
  }, [customCategories]);

  // Manual trigger to publish complete menu snapshot to Telegram CDN
  const handleManualTelegramSync = async () => {
    setIsSyncingTelegram(true);
    try {
      const res = await publishMenuSnapshotToTelegram(dishes, customCategories);
      if (res && res.success === false && res.reason === 'unconfigured') {
        triggerSuccess('Menu saved locally! (Telegram bot token unconfigured) 📤');
      } else {
        triggerSuccess('Menu database snapshot synced to Telegram CDN! 📤✨');
      }
    } catch (err) {
      console.error('[MenuManager] Manual Telegram sync error:', err);
      setError('Failed to sync menu to Telegram: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSyncingTelegram(false);
    }
  };

  // Upload Dish Photo directly to Telegram CDN
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If a video file was selected via photo button, seamlessly route to video upload
    if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
      return handleVideoUpload(e);
    }

    setUploadingPhoto(true);
    setUploadError('');
    try {
      const uploadResult = await uploadMediaToTelegram(file);
      const url = uploadResult?.cdnUrl || uploadResult?.url || '';
      const fileId = uploadResult?.fileId || uploadResult?.file_id || '';
      setFormData((prev) => ({
        ...prev,
        image_url: url,
        telegram_file_id: fileId
      }));
      triggerSuccess('Photo uploaded to Telegram CDN! 📸');
    } catch (err) {
      console.error('[MenuManager] Telegram photo upload failed:', err);
      setUploadError(err.message || 'Failed to upload photo to Telegram Channel');
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Upload 360° Profile Video directly to Telegram CDN
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    setUploadError('');
    try {
      const uploadResult = await uploadMediaToTelegram(file);
      const url = uploadResult?.cdnUrl || uploadResult?.url || '';
      const fileId = uploadResult?.fileId || uploadResult?.file_id || '';
      // Sync so both image_url and making_video_url recognize the 360° video
      setFormData((prev) => ({
        ...prev,
        making_video_url: url,
        telegram_video_file_id: fileId,
        image_url: prev.image_url && !isVideoUrl(prev.image_url) ? prev.image_url : url
      }));
      triggerSuccess('360° Profile Video uploaded to Telegram CDN! 🎥');
    } catch (err) {
      console.error('[MenuManager] Telegram video upload failed:', err);
      setUploadError(err.message || 'Failed to upload video to Telegram Channel');
    } finally {
      setUploadingVideo(false);
      if (e.target) e.target.value = '';
    }
  };

  // Primary media input change: seamlessly detects if link is video or photo
  const handlePrimaryMediaUrlChange = (val) => {
    const isVid = isVideoUrl(val);
    setFormData((prev) => ({
      ...prev,
      image_url: val,
      making_video_url: isVid ? val : (isVideoUrl(prev.making_video_url) ? '' : prev.making_video_url)
    }));
  };

  // Explicit video link input change
  const handleMakingVideoUrlChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      making_video_url: val,
      image_url: !prev.image_url || isVideoUrl(prev.image_url) ? (val || prev.image_url) : prev.image_url
    }));
  };

  // 1-Click apply 360° angular video preset
  const handleSelectVideoPreset = (url) => {
    setFormData((prev) => ({
      ...prev,
      making_video_url: url,
      image_url: prev.image_url && !isVideoUrl(prev.image_url) ? prev.image_url : url
    }));
    triggerSuccess('360° Angular Video Reel preset applied! 🔄🎥');
  };

  // Toggle item availability immediately (Local state + LocalStorage + IndexedDB + Broadcast + Telegram + Convex)
  const handleToggleAvailability = async (dishId, currentStatus, e) => {
    if (e) e.stopPropagation();

    const newStatus = currentStatus === 1 ? 0 : 1;
    const targetDish = dishes.find(d => d.id === dishId);

    const updatedDishes = dishes.map((d) => 
      d.id === dishId ? { ...d, is_available: newStatus } : d
    );
    await commitMenuUpdate(updatedDishes);

    // Sync to Convex Cloud Database in background if available
    if (toggleConvexAvailability && targetDish?.convexId) {
      try {
        await toggleConvexAvailability({
          id: targetDish.convexId,
          isAvailable: newStatus === 1
        });
      } catch (convexErr) {
        console.warn('[MenuManager] Convex toggle availability failed:', convexErr.message);
      }
    }

    triggerSuccess(newStatus ? 'Item marked in stock' : 'Item marked out of stock');
  };

  // Inline price edit: reuses the same Convex + SQLite update paths as the edit modal
  const [inlinePriceId, setInlinePriceId] = useState(null);
  const [inlinePriceDraft, setInlinePriceDraft] = useState('');
  const [inlinePriceSaving, setInlinePriceSaving] = useState(false);

  const startInlinePriceEdit = (dish, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setInlinePriceId(dish.id);
    setInlinePriceDraft(String(Number(dish.price) || 0));
  };

  const cancelInlinePriceEdit = () => {
    setInlinePriceId(null);
    setInlinePriceDraft('');
  };

  const saveInlinePrice = async (dish) => {
    const parsed = parseFloat(inlinePriceDraft);
    if (isNaN(parsed) || parsed < 0) {
      setError('Please enter a valid positive price.');
      return;
    }
    const price = Math.round(parsed * 100) / 100;
    if (price === (Number(dish.price) || 0)) {
      cancelInlinePriceEdit();
      return;
    }

    setInlinePriceSaving(true);
    const updatedDishes = dishes.map((d) => (d.id === dish.id ? { ...d, price } : d));
    await commitMenuUpdate(updatedDishes);

    if (updateConvexItem && dish.convexId) {
      try {
        await updateConvexItem({ id: dish.convexId, price });
      } catch (convexErr) {
        console.warn('[MenuManager] Convex inline price update failed:', convexErr.message);
      }
    }

    setInlinePriceSaving(false);
    cancelInlinePriceEdit();
    triggerSuccess(`"${dish.name}" price updated`);
  };

  // Create Category Handler (Top banner & Toolbar)
  const handleCreateCategory = async (e) => {
    if (e) e.preventDefault();
    setCategoryError('');

    const trimmedName = newCategoryData.name.trim();
    if (!trimmedName) {
      setCategoryError('Please enter a category name.');
      return;
    }

    if (availableCategories.some(c => c.toLowerCase() === trimmedName.toLowerCase())) {
      setCategoryError(`Category "${trimmedName}" already exists.`);
      return;
    }

    setCategorySubmitting(true);
    const chosenIcon = newCategoryData.icon.trim() || '🍽️';

    // 1. Update local custom categories
    setCustomCategories(prev => {
      const updated = Array.from(new Set([...prev, trimmedName]));
      try {
        localStorage.setItem('smartdine_custom_categories', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Persist to Convex Cloud Database
    if (createConvexCategory) {
      try {
        await createConvexCategory({
          name: trimmedName,
          icon: chosenIcon,
          slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        });
      } catch (convexErr) {
        console.warn('[MenuManager] Convex createCategory warning:', convexErr.message);
      }
    }

    setCategorySubmitting(false);
    setIsCategoryModalOpen(false);
    setNewCategoryData({ name: '', icon: '🍽️', description: '' });

    // Automatically switch active view to the new category and show success toast
    setSelectedCategory(trimmedName);
    triggerSuccess(`Category "${trimmedName}" created! ✨`);
  };

  // Inline Category in Dish Modal Handlers
  const handleCategorySelectChange = (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      setIsCreatingInlineCategory(true);
      setInlineCategoryName('');
    } else {
      setIsCreatingInlineCategory(false);
      setFormData(prev => ({ ...prev, category: val }));
    }
  };

  const handleConfirmInlineCategory = async () => {
    const trimmed = inlineCategoryName.trim();
    if (!trimmed) {
      setIsCreatingInlineCategory(false);
      return;
    }

    setCustomCategories(prev => {
      const updated = Array.from(new Set([...prev, trimmed]));
      try {
        localStorage.setItem('smartdine_custom_categories', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (createConvexCategory) {
      try {
        await createConvexCategory({ name: trimmed, icon: '🍽️' });
      } catch (err) {
        console.warn('[MenuManager] Inline Convex createCategory warning:', err.message);
      }
    }

    setFormData(prev => ({ ...prev, category: trimmed }));
    setIsCreatingInlineCategory(false);
    setInlineCategoryName('');
    triggerSuccess(`Category "${trimmed}" ready! ✨`);
  };

  // Open modal for Adding a new dish
  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingDishId(null);
    setIsCreatingInlineCategory(false);
    setInlineCategoryName('');
    setFormData({
      name: '',
      category: selectedCategory !== 'All' ? selectedCategory : (availableCategories[0] || 'Mains'),
      price: '',
      description: '',
      image_url: '',
      making_video_url: '',
      telegram_file_id: '',
      telegram_video_file_id: '',
      is_veg: false,
      is_spicy: false,
      is_available: true,
      show_in_reels: true
    });
    setFormError('');
    setUploadError('');
    setIsModalOpen(true);
  };

  // Open modal for Editing an existing dish
  const handleOpenEditModal = (dish) => {
    setModalMode('edit');
    setEditingDishId(dish.id);
    setIsCreatingInlineCategory(false);
    setInlineCategoryName('');
    const rawVid = dish.making_video_url || dish.makingVideoUrl || dish.videoUrl || (isVideoUrl(dish.image_url || dish.imageUrl) ? (dish.image_url || dish.imageUrl) : '');
    const rawImg = dish.image_url || dish.imageUrl || '';
    setFormData({
      name: dish.name || '',
      category: dish.category || 'Mains',
      price: dish.price !== undefined ? String(dish.price) : '',
      description: dish.description || '',
      image_url: rawImg || rawVid || '',
      making_video_url: rawVid || '',
      telegram_file_id: dish.telegram_file_id || dish.telegramFileId || '',
      telegram_video_file_id: dish.telegram_video_file_id || dish.telegramVideoFileId || '',
      is_veg: Boolean(dish.is_veg),
      is_spicy: Boolean(dish.is_spicy),
      is_available: Boolean(dish.is_available),
      show_in_reels: dish.show_in_reels !== undefined ? Boolean(dish.show_in_reels) : Boolean(rawVid)
    });
    setFormError('');
    setUploadError('');
    setIsModalOpen(true);
  };

  // Save Dish (Add or Edit) -> Persists to Local State, LocalStorage, IndexedDB, Broadcast, Telegram CDN Snapshot & Convex
  const handleSaveDish = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError('Please provide a dish name.');
      return;
    }

    const parsedPrice = parseFloat(formData.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('Please enter a valid positive price.');
      return;
    }

    setSubmitting(true);

    let categoryName = formData.category.trim();
    if (isCreatingInlineCategory && inlineCategoryName.trim()) {
      categoryName = inlineCategoryName.trim();
      setCustomCategories(prev => {
        const updated = Array.from(new Set([...prev, categoryName]));
        try {
          localStorage.setItem('smartdine_custom_categories', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      if (createConvexCategory) {
        createConvexCategory({ name: categoryName, icon: '🍽️' }).catch(() => {});
      }
    } else if (!categoryName || categoryName === '__new__') {
      categoryName = availableCategories[0] || 'Mains';
    }
    const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'mains';

    // Synchronize media fields seamlessly
    const primaryMedia = formData.image_url.trim();
    const videoMedia = formData.making_video_url.trim();
    const isPrimaryVideo = isVideoUrl(primaryMedia);

    const finalVideoUrl = videoMedia || (isPrimaryVideo ? primaryMedia : '');
    const finalImageUrl = primaryMedia || finalVideoUrl;

    const payload = {
      name: trimmedName,
      category: categoryName,
      category_name: categoryName,
      categorySlug,
      price: Math.round(parsedPrice * 100) / 100,
      description: formData.description.trim(),
      image_url: finalImageUrl,
      image: finalImageUrl,
      making_video_url: finalVideoUrl,
      makingVideoUrl: finalVideoUrl,
      videoUrl: finalVideoUrl || undefined,
      telegram_file_id: formData.telegram_file_id || '',
      telegram_video_file_id: formData.telegram_video_file_id || '',
      is_veg: formData.is_veg ? 1 : 0,
      is_spicy: formData.is_spicy ? 1 : 0,
      is_available: formData.is_available ? 1 : 0,
      show_in_reels: formData.show_in_reels ? 1 : 0
    };

    let updatedList = [...dishes];

    try {
      if (modalMode === 'add') {
        // 1. Save structured record to Convex Cloud Database in background if configured
        let convexNewId = null;
        if (createConvexItem) {
          try {
            convexNewId = await createConvexItem({
              categorySlug,
              name: trimmedName,
              description: formData.description.trim(),
              price: Math.round(parsedPrice * 100) / 100,
              imageUrl: finalImageUrl,
              images: [finalImageUrl].filter(Boolean),
              makingVideoUrl: finalVideoUrl || undefined,
              isVeg: Boolean(formData.is_veg),
              isSpicy: Boolean(formData.is_spicy),
              isAvailable: Boolean(formData.is_available)
            });
          } catch (convexErr) {
            console.warn('[MenuManager] Convex create failed (running local-first):', convexErr.message);
          }
        }

        // 2. Build local dish record
        const maxId = dishes.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0);
        const newDishObj = {
          ...payload,
          id: convexNewId || (maxId + 1),
          convexId: convexNewId
        };

        updatedList = [normalizeDish(newDishObj), ...updatedList];
        await commitMenuUpdate(updatedList);
        triggerSuccess(`"${trimmedName}" saved to menu! ✨`);
      } else {
        // Edit existing dish
        const currentDish = dishes.find(d => d.id === editingDishId);
        const targetConvexId = currentDish?.convexId;

        // 1. Update in Convex Cloud Database in background if configured
        if (targetConvexId && updateConvexItem) {
          try {
            await updateConvexItem({
              id: targetConvexId,
              name: trimmedName,
              description: formData.description.trim(),
              price: Math.round(parsedPrice * 100) / 100,
              imageUrl: finalImageUrl,
              images: [finalImageUrl].filter(Boolean),
              makingVideoUrl: finalVideoUrl || undefined,
              isVeg: Boolean(formData.is_veg),
              isSpicy: Boolean(formData.is_spicy),
              isAvailable: Boolean(formData.is_available)
            });
          } catch (convexErr) {
            console.warn('[MenuManager] Convex update failed:', convexErr.message);
          }
        } else if (!targetConvexId && createConvexItem) {
          try {
            await createConvexItem({
              categorySlug,
              name: trimmedName,
              description: formData.description.trim(),
              price: Math.round(parsedPrice * 100) / 100,
              imageUrl: finalImageUrl,
              images: [finalImageUrl].filter(Boolean),
              makingVideoUrl: finalVideoUrl || undefined,
              isVeg: Boolean(formData.is_veg),
              isSpicy: Boolean(formData.is_spicy),
              isAvailable: Boolean(formData.is_available)
            });
          } catch (cErr) {
            console.warn('[MenuManager] Convex push failed:', cErr.message);
          }
        }

        updatedList = updatedList.map((d) => 
          d.id === editingDishId ? normalizeDish({ ...d, ...payload, id: editingDishId, convexId: targetConvexId }) : d
        );
        await commitMenuUpdate(updatedList);
        triggerSuccess(`"${trimmedName}" updated! ✨`);
      }

      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Error saving dish. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm and Execute Deletion (Local State + LocalStorage + IndexedDB + Broadcast + Telegram + Convex)
  const handleDeleteDish = async () => {
    if (!dishToDelete) return;
    const { id, convexId, name } = dishToDelete;

    const updatedList = dishes.filter(d => d.id !== id);
    await commitMenuUpdate(updatedList);

    // 1. Delete in Convex in background if configured
    if (deleteConvexItem && convexId) {
      try {
        await deleteConvexItem({ id: convexId });
      } catch (convexErr) {
        console.warn('[MenuManager] Convex delete failed:', convexErr.message);
      }
    }

    setDishToDelete(null);
    triggerSuccess(`"${name}" was deleted from the menu.`);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Top Banner / Actions Bar */}
      <div className="admin-enter bg-[var(--adm-surface)] rounded-2xl border border-[var(--adm-border)] p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-[var(--adm-text)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--adm-text)] tracking-tight">
            Menu Management
          </h2>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleManualTelegramSync}
            disabled={isSyncingTelegram}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-sky-600/90 hover:bg-sky-500 active:scale-95 disabled:opacity-60 text-white font-semibold text-xs sm:text-sm transition shadow-md shadow-sky-600/20 cursor-pointer border border-sky-400/30"
            title="Publish full menu database snapshot directly to Telegram Channel CDN"
          >
            {isSyncingTelegram ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>📤</span>
            )}
            <span>{isSyncingTelegram ? 'Syncing...' : 'Sync Menu to Telegram CDN'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold text-xs sm:text-sm transition shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Dish</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-2 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast('')}
            className="text-emerald-400 hover:text-emerald-200 text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="admin-enter grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" style={{ '--i': 1 }}>
        <div className="bg-[var(--adm-surface)] p-4 rounded-xl border border-[var(--adm-border)] shadow-xs">
          <span className="text-xs font-medium text-[var(--adm-text-muted)]">Total Items</span>
          <div className="text-xl sm:text-2xl font-bold text-[var(--adm-text)] mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-[var(--adm-surface)] p-4 rounded-xl border border-[var(--adm-border)] shadow-xs">
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> In Stock
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
            {stats.inStock}
          </div>
        </div>
        <div className="bg-[var(--adm-surface)] p-4 rounded-xl border border-[var(--adm-border)] shadow-xs">
          <span className="text-xs font-medium text-rose-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Sold Out
          </span>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 mt-1">
            {stats.outOfStock}
          </div>
        </div>
        <div className="bg-[var(--adm-surface)] p-4 rounded-xl border border-[var(--adm-border)] shadow-xs">
          <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Vegetarian
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[var(--adm-text)] mt-1">
            {stats.vegCount}
          </div>
        </div>
      </div>

      {/* 2-Tier Glassmorphic Dark-Mode Menu Filter and Category Toolbar */}
      <div 
        className="rounded-[12px] p-3 sm:p-3.5 space-y-2.5 shadow-2xl backdrop-blur-md transition-all text-[var(--adm-text)]"
        style={{
          backgroundColor: 'var(--adm-surface)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* TIER 1: Search & Item Filters (Top Row) */}
        <div className="flex items-center justify-between gap-3 w-full">
          {/* Left-Side Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name, description, or ingredients..."
              className="w-full text-xs text-slate-100 placeholder:text-[var(--adm-text-muted)] font-normal pl-9 pr-8 py-2 rounded-[8px] transition focus:outline-none focus:border-amber-500/60"
              style={{
                backgroundColor: 'var(--adm-surface)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--adm-text-muted)] hover:text-white text-xs cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right-Side Filters (Pill-shaped buttons with 8px radius) */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Items', icon: null },
              { id: 'video', label: 'Has Video', icon: <Play className="w-3 h-3 fill-rose-400 text-rose-400 shrink-0" /> },
              { id: 'available', label: 'In Stock', icon: <Check className="w-3 h-3 text-emerald-400 shrink-0 stroke-[2.5]" /> },
              { id: 'unavailable', label: 'Sold Out', icon: null },
              { id: 'veg', label: 'Veg Only', icon: <Leaf className="w-3 h-3 text-emerald-400 fill-emerald-400/30 shrink-0" /> },
              { id: 'spicy', label: 'Spicy', icon: <Flame className="w-3 h-3 text-rose-400 fill-rose-400/30 shrink-0" /> }
            ].map((f) => {
              const isActive = filterType === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--adm-primary)] to-[var(--adm-primary)] text-white border-amber-400/40 shadow-sm shadow-amber-500/25'
                      : 'bg-[var(--adm-surface)]/90 hover:bg-[var(--adm-surface-2)] text-[var(--adm-text-muted)] hover:text-white border-white/[0.08]'
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thin Divider Line (rgba(255, 255, 255, 0.05)) */}
        <div 
          className="w-full h-px" 
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }} 
        />

        {/* TIER 2: Categories & Admin CTA (Bottom Row) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full pt-0.5">
          {/* All Categories Button */}
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 border ${
              selectedCategory === 'All'
                ? 'bg-gradient-to-r from-[var(--adm-primary)] to-[var(--adm-primary)] text-white border-amber-400/40 shadow-sm shadow-amber-500/20'
                : 'bg-[var(--adm-surface)]/90 text-[var(--adm-text-muted)] hover:text-white hover:bg-[var(--adm-surface-2)] border-white/[0.08]'
            }`}
          >
            All Categories ({dishes.length})
          </button>

          {/* Category Capsules */}
          {availableCategories.map((cat) => {
            const count = dishes.filter(d => d.category.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-[var(--adm-primary)] to-[var(--adm-primary)] text-white border-amber-400/40 shadow-sm shadow-amber-500/20'
                    : 'bg-[var(--adm-surface)]/90 text-[var(--adm-text-muted)] hover:text-white hover:bg-[var(--adm-surface-2)] border-white/[0.08]'
                }`}
              >
                <span>{cat}</span>
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-black/35 text-white' : 'bg-[var(--adm-surface)] text-[var(--adm-text-muted)] border border-white/[0.05]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Far-Right Button: + Add Category */}
          <button
            type="button"
            onClick={() => {
              setNewCategoryData({ name: '', icon: '🍽️', description: '' });
              setCategoryError('');
              setIsCategoryModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-dashed border-[var(--adm-primary)]/50 hover:border-[var(--adm-primary)] bg-[var(--adm-primary)]/10 hover:bg-[var(--adm-primary)]/20 text-[var(--adm-primary)] text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-xs active:scale-95 shrink-0 ml-auto"
            title="Create a new menu category"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Category</span>
          </button>
        </div>
      </div>

      {/* Dishes Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-[var(--adm-text-muted)]">Loading restaurant dishes...</p>
        </div>
      ) : filteredDishes.length === 0 ? (
        <div className="admin-empty bg-[var(--adm-surface)] rounded-2xl border border-dashed border-[var(--adm-border)] p-12 px-4 text-center">
          <UtensilsCrossed className="w-10 h-10 text-[var(--adm-text-muted)] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[var(--adm-text)]">No dishes found</h3>
          <p className="text-xs text-[var(--adm-text-muted)] max-w-sm mx-auto mt-1 mb-4">
            No menu items match your current search and category filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setFilterType('all');
            }}
            className="px-4 py-2 rounded-xl bg-[var(--adm-surface-2)] hover:bg-[var(--adm-border)] text-[var(--adm-text)] border border-[var(--adm-border)] text-xs font-semibold transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedDishes.map(([categoryName, categoryDishes]) => (
          <section key={categoryName} aria-label={categoryName}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--adm-primary)]">{categoryName}</h3>
              <span className="text-[11px] font-bold text-[var(--adm-text-muted)] bg-[var(--adm-surface-2)] border border-[var(--adm-border)] rounded-full px-2 py-0.5">
                {categoryDishes.length} {categoryDishes.length === 1 ? 'dish' : 'dishes'}
              </span>
              <div className="flex-1 h-px bg-[var(--adm-border)]" />
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {categoryDishes.map((dish) => {
            const isAvailable = Boolean(dish.is_available);
            const dishVideo = dish.making_video_url || dish.makingVideoUrl || dish.videoUrl || (isVideoUrl(dish.image_url) ? dish.image_url : null);
            const hasVideo = Boolean(dishVideo);

            return (
              <div
                key={dish.id}
                className={`group flex flex-col justify-between h-full bg-[var(--adm-surface)] rounded-2xl border transition-all duration-200 overflow-hidden shadow-md hover:border-[var(--adm-text-muted)] hover:shadow-xl ${
                  !isAvailable ? 'border-[var(--adm-danger)]/60 bg-[var(--adm-surface)]/90' : 'border-[var(--adm-border)]'
                }`}
              >
                <div className="flex flex-col flex-1">
                  {/* Dish Header Media & Tags - strictly uniform height and aspect ratio */}
                  <div className="relative w-full h-48 bg-[var(--adm-surface)] overflow-hidden shrink-0">
                    {hasVideo ? (
                      <video
                        src={dishVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                          !isAvailable ? 'grayscale-40 opacity-70' : ''
                        }`}
                      />
                    ) : dish.image_url && !isVideoUrl(dish.image_url) ? (
                      <img
                        src={dish.image_url}
                        alt={dish.name}
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                          !isAvailable ? 'grayscale-40 opacity-70' : ''
                        }`}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full flex flex-col items-center justify-center bg-[var(--adm-surface-2)] text-[var(--adm-text-muted)] ${
                        hasVideo || (dish.image_url && !isVideoUrl(dish.image_url)) ? 'hidden' : 'flex'
                      }`}
                    >
                      <ImageIcon className="w-8 h-8 mb-1 opacity-60" />
                      <span className="text-[11px] font-medium text-zinc-400">No Media Provided</span>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10 max-w-[70%]">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--adm-surface)]/90 backdrop-blur-xs text-[var(--adm-text)] border border-white/10 shadow-xs">
                        {dish.category}
                      </span>
                      {Boolean(dish.is_veg) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                          <Leaf className="w-2.5 h-2.5 fill-current" />
                          Veg
                        </span>
                      )}
                      {Boolean(dish.is_spicy) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[var(--adm-danger)] text-white shadow-xs">
                          <Flame className="w-2.5 h-2.5 fill-current" />
                          Spicy
                        </span>
                      )}
                      {Boolean((dish.image_url && (dish.image_url.includes('telegram') || dish.image_url.includes('api.telegram.org'))) ||
                               (dishVideo && (dishVideo.includes('telegram') || dishVideo.includes('api.telegram.org')))) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-600 text-white shadow-xs" title="Media hosted on Telegram Channel CDN">
                          <Send className="w-2.5 h-2.5 -rotate-45" />
                          TG Media
                        </span>
                      )}
                      {hasVideo ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white shadow-md border border-rose-400/50 animate-pulse" title="360° Profile Video active: running 24/7">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                          <Video className="w-2.5 h-2.5 fill-current" />
                          <span>🎥 360° Video</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(dish);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/80 hover:bg-[var(--adm-surface-2)] text-[var(--adm-text-muted)] hover:text-white border border-slate-700/80 cursor-pointer transition"
                          title="Click to add a 360° profile video to this dish"
                        >
                          <Video className="w-2.5 h-2.5 text-purple-400" />
                          + 360° Video
                        </button>
                      )}
                    </div>

                    {/* Stock Status Badge Overlay */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight shadow-xs uppercase ${
                          isAvailable
                            ? 'bg-[var(--adm-success)] text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {isAvailable ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-bold text-[var(--adm-text)] text-base leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors" title={dish.name}>
                          {dish.name}
                        </h3>
                        {inlinePriceId === dish.id ? (
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-sm font-bold text-[var(--adm-text)]">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              autoFocus
                              aria-label={`Price for ${dish.name}`}
                              value={inlinePriceDraft}
                              onChange={(e) => setInlinePriceDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlinePrice(dish);
                                if (e.key === 'Escape') cancelInlinePriceEdit();
                              }}
                              disabled={inlinePriceSaving}
                              className="w-20 px-1.5 py-0.5 rounded-md bg-[var(--adm-surface)] border border-[var(--adm-primary)] text-sm font-bold text-[var(--adm-text)] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => saveInlinePrice(dish)}
                              disabled={inlinePriceSaving}
                              className="px-1.5 py-0.5 rounded-md bg-[var(--adm-primary)] text-[var(--adm-primary-fg)] text-[11px] font-bold disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelInlinePriceEdit}
                              className="px-1 py-0.5 rounded-md text-[11px] font-bold text-[var(--adm-text-muted)] hover:text-white"
                            >
                              Esc
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => startInlinePriceEdit(dish, e)}
                            className="text-base font-extrabold text-[var(--adm-text)] tracking-tight shrink-0 rounded px-1 -mx-1 border border-dashed border-transparent hover:border-[var(--adm-border)] hover:bg-[var(--adm-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            title="Click to edit price"
                            aria-label={`Edit price for ${dish.name}`}
                          >
                            ${(Number(dish.price) || 0).toFixed(2)}
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-[var(--adm-text-muted)] line-clamp-2 leading-relaxed h-9 overflow-hidden">
                        {dish.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls: Availability Switch + Edit + Delete */}
                <div className="p-3.5 bg-[var(--adm-surface-2)] border-t border-[var(--adm-border)] flex items-center justify-between gap-2 shrink-0 mt-auto">
                  
                  {/* Availability Toggle Switch */}
                  <label className="relative inline-flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-checked={isAvailable}
                      checked={isAvailable}
                      onChange={(e) => handleToggleAvailability(dish.id, dish.is_available, e)}
                      className="sr-only peer"
                    />
                    <span className={`relative inline-block w-11 h-6 rounded-full transition-colors ${isAvailable ? "bg-[var(--adm-success)]" : "bg-[var(--adm-border)]"} peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--adm-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--adm-surface)]`}>
                      <span className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${isAvailable ? 'translate-x-5' : ''}`} />
                    </span>
                    <span className={`text-xs font-black ${isAvailable ? "text-[var(--adm-success)]" : "text-[var(--adm-danger)]"}`}>
                      {isAvailable ? 'In stock' : 'Out of stock'}
                    </span>
                  </label>

                  {/* Edit and Delete Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(dish)}
                      className="p-1.5 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] hover:bg-[var(--adm-border)] text-[var(--adm-text)] transition active:scale-95 cursor-pointer"
                      title="Edit dish details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDishToDelete(dish)}
                      className="p-1.5 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] hover:bg-rose-950/60 hover:border-rose-700 text-[var(--adm-text-muted)] hover:text-rose-400 transition active:scale-95 cursor-pointer"
                      title="Delete dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
          </div>
          </section>
          ))}
        </div>
      )}

      {/* =========================================================================
          ADD / EDIT DISH MODAL
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[var(--adm-surface)] rounded-2xl shadow-2xl border border-[var(--adm-border)] overflow-clip transform transition-all animate-scaleUp max-h-[90vh] flex flex-col text-[var(--adm-text)]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--adm-border)] flex items-center justify-between bg-[var(--adm-surface-2)] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  {modalMode === 'add' ? <Plus className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-[var(--adm-text)] text-base leading-tight">
                    {modalMode === 'add' ? 'Add New Dish' : 'Edit Dish Details'}
                  </h3>
                  <p className="text-xs text-[var(--adm-text-muted)]">
                    {modalMode === 'add' ? 'Fill out the details to introduce a new menu item' : 'Update pricing, images, or dish information'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--adm-text-muted)] hover:text-[var(--adm-text)] p-1 rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <form onSubmit={handleSaveDish} className="p-6 overflow-y-auto space-y-4 flex-1 min-h-0">
              {formError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Dish Name */}
              <div>
                <label className="block text-xs font-bold text-[var(--adm-text-muted)] uppercase tracking-wider mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Signature Truffle Ribeye"
                  className="admin-dark-input w-full placeholder-[var(--adm-text-muted)]"
                  style={{
                    backgroundColor: 'var(--adm-surface)',
                    color: 'var(--adm-text)',
                    border: '1px solid var(--adm-border)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                />
              </div>

              {/* Category & Price Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Selection / Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[var(--adm-text-muted)] uppercase tracking-wider">
                      Category *
                    </label>
                    {!isCreatingInlineCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingInlineCategory(true);
                          setInlineCategoryName('');
                        }}
                        className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New Category</span>
                      </button>
                    )}
                  </div>

                  {!isCreatingInlineCategory ? (
                    <select
                      value={formData.category}
                      onChange={handleCategorySelectChange}
                      className="admin-dark-select w-full"
                      style={{
                        backgroundColor: 'var(--adm-surface)',
                        color: 'var(--adm-text)',
                        border: '1px solid var(--adm-border)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      {availableCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__new__" className="text-amber-400 font-bold bg-[var(--adm-surface-2)]">
                        + Create New Category...
                      </option>
                    </select>
                  ) : (
                    <div className="space-y-1.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={inlineCategoryName}
                          onChange={(e) => setInlineCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConfirmInlineCategory();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setIsCreatingInlineCategory(false);
                            }
                          }}
                          placeholder="Type new category..."
                          autoFocus
                          className="admin-dark-input flex-1 placeholder-[var(--adm-text-muted)]"
                          style={{
                            backgroundColor: 'var(--adm-surface)',
                            color: 'var(--adm-text)',
                            border: '1px solid var(--adm-primary)',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 500
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleConfirmInlineCategory}
                          disabled={!inlineCategoryName.trim()}
                          className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingInlineCategory(false);
                            setInlineCategoryName('');
                          }}
                          className="px-2.5 py-2 rounded-lg bg-[var(--adm-surface-2)] hover:bg-[var(--adm-border)] text-[var(--adm-text-muted)] hover:text-[var(--adm-text)] text-xs font-semibold transition cursor-pointer border border-[var(--adm-border)] shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--adm-text-muted)]">
                        Press Enter or click Add to create and select category.
                      </p>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-bold text-[var(--adm-text-muted)] uppercase tracking-wider mb-1">
                    Price ($ USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-[var(--adm-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="14.99"
                      className="admin-dark-input w-full placeholder-[var(--adm-text-muted)]"
                      style={{
                        backgroundColor: 'var(--adm-surface)',
                        color: 'var(--adm-text)',
                        border: '1px solid var(--adm-border)',
                        padding: '10px 14px',
                        paddingLeft: '36px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[var(--adm-text-muted)] uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ingredients, cooking style, portion notes..."
                  className="admin-dark-input w-full placeholder-[var(--adm-text-muted)] resize-none"
                  style={{
                    backgroundColor: 'var(--adm-surface)',
                    color: 'var(--adm-text)',
                    border: '1px solid var(--adm-border)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                />
              </div>

              {/* ========================================================= */}
              {/* MEDIA STORAGE: TELEGRAM CHANNEL CDN + CONVEX TEXT DB     */}
              {/* ========================================================= */}
              <div className="p-4 bg-[var(--adm-surface-2)] rounded-2xl border border-[var(--adm-border)] space-y-4">
                
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-xs">
                      <Send className="w-3.5 h-3.5 -rotate-45" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--adm-text)] uppercase tracking-wider flex items-center gap-1.5">
                        <span>Telegram Media Storage & CDN</span>
                        <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/80 px-1.5 py-0.2 rounded-full border border-sky-800">
                          Free Cloud CDN
                        </span>
                      </h4>
                      <p className="text-[11px] text-[var(--adm-text-muted)]">
                        High-res photos & 360° looping video reels hosted on <strong className="text-[var(--adm-text)]">@Restaurant Media</strong>; records in <strong className="text-[var(--adm-text)]">Convex</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-2.5 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Primary Media: Food Profile Media (Photo or 360° Angular Video Reel) */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="text-xs font-bold text-[var(--adm-text)] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs sm:text-sm font-extrabold text-white">Food Profile Media (Photo or 360° Angular Video Reel)</span>
                      </label>

                      {((formData.image_url && (formData.image_url.includes('telegram') || formData.image_url.includes('api.telegram.org'))) ||
                        (formData.making_video_url && (formData.making_video_url.includes('telegram') || formData.making_video_url.includes('api.telegram.org')))) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700 animate-fadeIn">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>✅ Hosted on Telegram Channel CDN</span>
                          </span>
                          {(formData.telegram_file_id || formData.telegram_video_file_id) && (
                            <span className="text-[10px] text-sky-400 font-mono bg-sky-950/70 px-2 py-0.5 rounded-full border border-sky-800" title={`Telegram File ID: ${formData.telegram_file_id || formData.telegram_video_file_id}`}>
                              ID: {(formData.telegram_file_id || formData.telegram_video_file_id).slice(0, 16)}...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--adm-text-muted)] mt-0.5">
                      Upload a high-res photo or a 360° looping video reel to Telegram Channel CDN (@Restaurant Media). Video profiles run continuously 24/7 on customer view!
                    </p>
                  </div>

                  {/* Hidden file inputs */}
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*,video/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />

                  {/* Dual High-Visibility Upload Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* [📸 Upload Photo to Telegram] (Sky blue button triggering photoInputRef) */}
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto || uploadingVideo}
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition cursor-pointer disabled:opacity-50"
                    >
                      {uploadingPhoto ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 -rotate-45" />
                      )}
                      <span>{uploadingPhoto ? 'Uploading Photo to Telegram...' : '📸 Upload Photo to Telegram'}</span>
                    </button>

                    {/* [🎥 Upload 360° Profile Video to Telegram] (Rose/Purple button triggering videoInputRef) */}
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingPhoto || uploadingVideo}
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-rose-600 to-amber-600 hover:from-purple-500 hover:via-rose-500 hover:to-amber-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
                    >
                      {uploadingVideo ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Video className="w-4 h-4" />
                      )}
                      <span>{uploadingVideo ? 'Uploading 360° Video...' : '🎥 Upload 360° Profile Video to Telegram'}</span>
                    </button>
                  </div>

                  {/* Primary Media URL Input Field (accepts both photo and video) */}
                  <div className="relative">
                    <input
                      type="url"
                      value={formData.image_url || formData.making_video_url}
                      onChange={(e) => handlePrimaryMediaUrlChange(e.target.value)}
                      placeholder="Paste Telegram CDN link, 360° video link (.mp4/.webm), or image URL..."
                      className="admin-dark-input w-full font-mono placeholder-[var(--adm-text-muted)] truncate text-xs"
                      style={{
                        backgroundColor: 'var(--adm-surface)',
                        color: 'var(--adm-text)',
                        border: (formData.making_video_url || isVideoUrl(formData.image_url)) ? '1px solid var(--adm-danger)' : '1px solid var(--adm-border)',
                        padding: '10px 14px',
                        paddingRight: '32px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                    />
                    {(formData.image_url || formData.making_video_url) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, image_url: '', making_video_url: '' }));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--adm-text-muted)] hover:text-[var(--adm-text)] text-xs p-1 cursor-pointer"
                        title="Clear media"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Quick 360° Video Presets */}
                  <div className="bg-[var(--adm-surface)] p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Quick 360° Video Presets (1-Click Apply):</span>
                      </span>
                      <span className="text-[10px] text-[var(--adm-text-muted)] font-medium">Plays 24/7 Loop</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_360_VIDEOS.map((preset) => {
                        const isSelected = (formData.making_video_url === preset.url || formData.image_url === preset.url);
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleSelectVideoPreset(preset.url)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                              isSelected
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm shadow-rose-500/20'
                                : 'bg-[var(--adm-surface-2)]/90 hover:bg-[var(--adm-surface-2)] text-[var(--adm-text-muted)] hover:text-white border-slate-700'
                            }`}
                          >
                            <span>🔄</span>
                            <span>{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Profile Media Preview Player */}
                  {(() => {
                    const activeVideo = (formData.making_video_url && isVideoUrl(formData.making_video_url)) 
                      ? formData.making_video_url 
                      : (formData.image_url && isVideoUrl(formData.image_url))
                        ? formData.image_url
                        : formData.making_video_url;
                    const isVideoActive = Boolean(activeVideo && (isVideoUrl(activeVideo) || formData.making_video_url));

                    if (isVideoActive) {
                      return (
                        <div className="p-3.5 bg-[var(--adm-surface)] rounded-xl border-2 border-rose-500/50 shadow-lg shadow-rose-950/40 space-y-2.5 animate-fadeIn">
                          {/* Glowing Badge */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-md shadow-rose-600/30 border border-rose-400/40 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                              <Video className="w-3.5 h-3.5 fill-current" />
                              <span>🎥 360° Angular Video Profile Active (Plays 24/7 on Diner Card)</span>
                            </span>
                            <span className="text-[10px] text-[var(--adm-text-muted)] font-mono truncate max-w-xs">
                              {activeVideo}
                            </span>
                          </div>

                          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-black aspect-video max-h-52 flex items-center justify-center">
                            <video
                              src={activeVideo}
                              autoPlay
                              loop
                              muted
                              playsInline
                              controls
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <p className="text-[11px] text-[var(--adm-text-muted)] leading-tight">
                            ✨ This high-impact 360° profile video will play smoothly in a continuous 24/7 loop on the diner's mobile card, giving guests an immersive 360° product experience!
                          </p>
                        </div>
                      );
                    }

                    if (formData.image_url && !isVideoUrl(formData.image_url)) {
                      return (
                        <div className="flex items-center gap-3 p-3 bg-[var(--adm-surface)] rounded-xl border border-[var(--adm-border)] animate-fadeIn">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--adm-border)] bg-[var(--adm-surface-2)] shrink-0">
                            <img
                              src={formData.image_url}
                              alt="Dish Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                Photo Profile
                              </span>
                              <p className="text-xs font-bold text-[var(--adm-text)] truncate">
                                {formData.name || 'Dish Photo Preview'}
                              </p>
                            </div>
                            <p className="text-[10px] text-[var(--adm-text-muted)] truncate font-mono mt-1">
                              {formData.image_url}
                            </p>
                            {(formData.image_url.includes('telegram') || formData.image_url.includes('api.telegram.org')) && (
                              <span className="text-[10px] text-sky-400 font-medium flex items-center gap-1 mt-0.5">
                                <Send className="w-2.5 h-2.5 -rotate-45" /> Telegram Channel CDN (@Restaurant Media)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {/* Optional secondary video URL or fallback photo link accordion */}
                  <details className="text-xs text-[var(--adm-text-muted)] pt-1 border-t border-slate-700/60">
                    <summary className="cursor-pointer hover:text-white font-semibold transition py-1 select-none flex items-center gap-1">
                      <span>⚙️ Advanced: Separate Kitchen Reel Video URL (Optional)</span>
                    </summary>
                    <div className="mt-2 space-y-2 p-2.5 bg-[var(--adm-surface)] rounded-lg border border-slate-800">
                      <div>
                        <label className="text-[11px] font-semibold text-[var(--adm-text-muted)] block mb-1">
                          Direct Video URL (making_video_url):
                        </label>
                        <input
                          type="url"
                          value={formData.making_video_url}
                          onChange={(e) => handleMakingVideoUrlChange(e.target.value)}
                          placeholder="e.g. /videos/reel-chef.mp4 or Telegram video link..."
                          className="admin-dark-input w-full font-mono text-xs placeholder-[var(--adm-text-muted)]"
                          style={{
                            backgroundColor: 'var(--adm-surface-2)',
                            color: 'var(--adm-text)',
                            border: '1px solid var(--adm-border)',
                            padding: '8px 12px',
                            borderRadius: '6px'
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[var(--adm-text-muted)] block mb-1">
                          Static Fallback Photo URL (image_url):
                        </label>
                        <input
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => handlePrimaryMediaUrlChange(e.target.value)}
                          placeholder="e.g. https://images.unsplash.com/... or Telegram photo link"
                          className="admin-dark-input w-full font-mono text-xs placeholder-[var(--adm-text-muted)]"
                          style={{
                            backgroundColor: 'var(--adm-surface-2)',
                            color: 'var(--adm-text)',
                            border: '1px solid var(--adm-border)',
                            padding: '8px 12px',
                            borderRadius: '6px'
                          }}
                        />
                      </div>
                    </div>
                  </details>

                  {/* Food Reels Showcase Placement Toggle */}
                  <div className="p-3 bg-[var(--adm-surface)] border border-purple-500/30 rounded-xl flex items-center justify-between gap-3 mt-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[var(--adm-text)]">Feature in Food Reels</span>
                          <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
                            Reels Feed
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--adm-text-muted)] leading-tight mt-0.5">
                          {formData.show_in_reels
                            ? 'Video appears in both the public customer Reels feed (with Add-to-Cart) and dish details.'
                            : 'Video stays exclusive to dish details modal only (hidden from Reels feed).'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={formData.show_in_reels}
                        onChange={(e) => setFormData({ ...formData, show_in_reels: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-rose-600 border border-slate-700"></div>
                    </label>
                  </div>

                </div>

              </div>

              {/* Dietary Flags & Stock Switch */}
              <div className="pt-2 border-t border-[var(--adm-border)] space-y-2.5">
                <span className="block text-xs font-bold text-[var(--adm-text-muted)] uppercase tracking-wider">
                  Dish Attributes
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Vegetarian Toggle */}
                  <label className={`relative flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                    formData.is_veg ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-[var(--adm-surface-2)] border-[var(--adm-border)] text-[var(--adm-text-muted)]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.is_veg}
                      onChange={(e) => setFormData({ ...formData, is_veg: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      formData.is_veg ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-[var(--adm-border)] bg-[var(--adm-surface)]'
                    }`}>
                      {formData.is_veg && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold">Vegetarian</span>
                  </label>

                  {/* Spicy Toggle */}
                  <label className={`relative flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                    formData.is_spicy ? 'bg-rose-950/40 border-rose-500/70 text-rose-300' : 'bg-[var(--adm-surface-2)] border-[var(--adm-border)] text-[var(--adm-text-muted)]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.is_spicy}
                      onChange={(e) => setFormData({ ...formData, is_spicy: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      formData.is_spicy ? 'bg-rose-500 border-rose-500 text-white' : 'border-[var(--adm-border)] bg-[var(--adm-surface)]'
                    }`}>
                      {formData.is_spicy && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-xs font-semibold">Spicy</span>
                  </label>

                  {/* Available In Stock Toggle */}
                  <label className={`relative flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                    formData.is_available ? 'border-[var(--adm-success)] bg-[var(--adm-surface-2)] text-[var(--adm-text)]' : 'border-[var(--adm-border)] bg-[var(--adm-surface-2)] text-[var(--adm-text-muted)]'
                  }`}>
                    <span className="flex flex-col">
                      <span className="text-xs font-bold">Stock status</span>
                      <span className={`text-[11px] font-semibold ${formData.is_available ? 'text-[var(--adm-success)]' : 'text-[var(--adm-danger)]'}`}>
                        {formData.is_available ? 'In stock: visible and orderable' : 'Out of stock: hidden from ordering'}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-checked={formData.is_available}
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      className="sr-only peer"
                    />
                    <span className={`relative inline-block w-11 h-6 rounded-full shrink-0 transition-colors ${formData.is_available ? 'bg-[var(--adm-success)]' : 'bg-[var(--adm-border)]'} peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--adm-primary)]`}>
                      <span className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${formData.is_available ? 'translate-x-5' : ''}`} />
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Bottom Actions */}
              <div className="pt-4 border-t border-[var(--adm-border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] hover:bg-[var(--adm-border)] text-[var(--adm-text-muted)] hover:text-[var(--adm-text)] text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs sm:text-sm font-semibold transition shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === 'add' ? 'Create Dish' : 'Save Changes'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE CATEGORY MODAL
          ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--adm-surface)] rounded-2xl shadow-2xl border border-[var(--adm-border)] overflow-hidden transform transition-all animate-scaleUp text-[var(--adm-text)]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--adm-border)] flex items-center justify-between bg-[var(--adm-surface-2)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--adm-text)] text-base leading-tight">
                    Add New Category
                  </h3>
                  <p className="text-xs text-[var(--adm-text-muted)]">
                    Create a menu section to group your dishes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[var(--adm-text-muted)] hover:text-[var(--adm-text)] p-1 rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              {categoryError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{categoryError}</span>
                </div>
              )}

              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold text-[var(--adm-text-muted)] uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryData.name}
                  onChange={(e) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                  placeholder="e.g. Mocktails, Artisan Pizzas, Chef Specials"
                  className="admin-dark-input w-full placeholder-[var(--adm-text-muted)]"
                  style={{
                    backgroundColor: 'var(--adm-surface)',
                    color: 'var(--adm-text)',
                    border: '1px solid var(--adm-border)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                />
              </div>

              {/* Category Icon / Emoji Quick Selector */}
              <div>
                <label className="block text-xs font-bold text-[var(--adm-text-muted)] uppercase tracking-wider mb-1">
                  Icon / Emoji <span className="text-[10px] text-[var(--adm-text-muted)] font-normal">(Optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryData.icon}
                    onChange={(e) => setNewCategoryData({ ...newCategoryData, icon: e.target.value })}
                    placeholder="🍽️"
                    className="admin-dark-input w-16 text-center text-lg placeholder-[var(--adm-text-muted)]"
                    style={{
                      backgroundColor: 'var(--adm-surface)',
                      color: 'var(--adm-text)',
                      border: '1px solid var(--adm-border)',
                      padding: '8px',
                      borderRadius: '8px',
                      fontWeight: 500
                    }}
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['🍕', '🍔', '🥗', '🍹', '🍰', '🥩', '🌮', '🍜', '☕', '🍲'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCategoryData({ ...newCategoryData, icon: emoji })}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition border cursor-pointer ${
                          newCategoryData.icon === emoji
                            ? 'bg-amber-500/20 border-amber-500 scale-105'
                            : 'bg-[var(--adm-surface-2)] border-[var(--adm-border)] hover:bg-[var(--adm-border)]'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[var(--adm-text-muted)] uppercase tracking-wider mb-1">
                  Description <span className="text-[10px] text-[var(--adm-text-muted)] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData({ ...newCategoryData, description: e.target.value })}
                  placeholder="e.g. Signature handcrafted mocktails & refreshments"
                  className="admin-dark-input w-full placeholder-[var(--adm-text-muted)]"
                  style={{
                    backgroundColor: 'var(--adm-surface)',
                    color: 'var(--adm-text)',
                    border: '1px solid var(--adm-border)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[var(--adm-border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] hover:bg-[var(--adm-border)] text-[var(--adm-text-muted)] hover:text-[var(--adm-text)] text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categorySubmitting || !newCategoryData.name.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 active:scale-95 text-white text-xs sm:text-sm font-semibold transition shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  {categorySubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION MODAL
          ========================================================================= */}
      {dishToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[var(--adm-surface)] rounded-2xl shadow-2xl border border-[var(--adm-border)] p-6 text-center transform transition-all animate-scaleUp text-[var(--adm-text)]">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[var(--adm-text)] mb-1">
              Delete Menu Dish?
            </h3>
            <p className="text-xs text-[var(--adm-text-muted)] leading-relaxed mb-5">
              Are you sure you want to delete <span className="font-semibold text-[var(--adm-text)]">"{dishToDelete.name}"</span>? This will remove the item immediately from the customer menu.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDishToDelete(null)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] hover:bg-[var(--adm-border)] text-[var(--adm-text-muted)] hover:text-[var(--adm-text)] text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Keep Dish
              </button>
              <button
                type="button"
                onClick={handleDeleteDish}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-semibold transition shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
