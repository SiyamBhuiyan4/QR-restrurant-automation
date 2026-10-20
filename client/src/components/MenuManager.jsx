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
import { uploadPhotoToTelegram, uploadVideoToTelegram } from '../services/telegramClient';
import { resolveServerUrl } from '../context/SocketContext';
import { getCachedMenu, cacheMenu } from '../db/indexedDb.js';
import '../styles/admin.css';

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
    making_video_url: '',
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
    is_veg: false,
    is_spicy: false,
    is_available: true
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Telegram Channel Media Upload states & file refs
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState('');
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

    return {
      id: item.id || item._id,
      convexId,
      name: item.name || item.title || 'Untitled Dish',
      category: item.category || item.category_name || item.categoryName || 'Mains',
      category_id: item.category_id || item.categoryId || null,
      categorySlug: item.categorySlug || (item.category ? item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'mains'),
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
      description: item.description || '',
      image_url: item.image_url || item.imageUrl || item.image || '',
      making_video_url: item.making_video_url || item.makingVideoUrl || '',
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

  // Load menu from Server with fallback to IndexedDB or initial sample data
  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError(null);
    let loadedDishes = [];

    const serverUrl = resolveServerUrl();

    try {
      // 1. Try fetching from backend API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${serverUrl}/api/menu`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        // Server could return { success: true, data: [...] } or direct array [...]
        const items = Array.isArray(data) ? data : (data.data || data.menu || data.items || []);
        if (items.length > 0) {
          loadedDishes = items.map(normalizeDish);
          // Update offline IndexedDB cache
          await cacheMenu(loadedDishes);
        }
      }
    } catch (err) {
      console.warn('[MenuManager] API fetch failed or offline, loading from IndexedDB:', err.message);
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
      await cacheMenu(loadedDishes);
    }

    // Also fetch categories from server API
    try {
      const catRes = await fetch(`${serverUrl}/api/menu/categories`);
      if (catRes.ok) {
        const catData = await catRes.json();
        const cats = Array.isArray(catData) ? catData : (catData.data || []);
        if (cats.length > 0) {
          const names = cats.map(c => c.name).filter(Boolean);
          setCustomCategories(prev => Array.from(new Set([...prev, ...names])));
        }
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
      if (filterType === 'video' && !dish.making_video_url && !dish.makingVideoUrl) return false;
      if (filterType === 'veg' && !dish.is_veg) return false;
      if (filterType === 'spicy' && !dish.is_spicy) return false;
      if (filterType === 'available' && !dish.is_available) return false;
      if (filterType === 'unavailable' && dish.is_available) return false;

      return true;
    });
  }, [dishes, selectedCategory, searchQuery, filterType]);

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

  // Upload Dish Photo to Telegram Channel Media CDN
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setUploadError('');
    try {
      const result = await uploadPhotoToTelegram(file);
      if (result.cdnUrl) {
        setFormData((prev) => ({ ...prev, image_url: result.cdnUrl }));
        triggerSuccess('Photo hosted on Telegram Channel (@Restaurant Media)! 📸');
      }
    } catch (err) {
      console.error('[MenuManager] Telegram photo upload failed:', err);
      setUploadError(err.message || 'Failed to upload photo to Telegram Channel');
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Upload Kitchen Reel Video to Telegram Channel Media CDN
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    setUploadError('');
    try {
      const result = await uploadVideoToTelegram(file);
      if (result.cdnUrl) {
        setFormData((prev) => ({ ...prev, making_video_url: result.cdnUrl }));
        triggerSuccess('Kitchen reel hosted on Telegram Channel (@Restaurant Media)! 🎥');
      }
    } catch (err) {
      console.error('[MenuManager] Telegram video upload failed:', err);
      setUploadError(err.message || 'Failed to upload video to Telegram Channel');
    } finally {
      setUploadingVideo(false);
      if (e.target) e.target.value = '';
    }
  };

  // Toggle item availability immediately (Convex + SQLite + IndexedDB)
  const handleToggleAvailability = async (dishId, currentStatus, e) => {
    if (e) e.stopPropagation();

    const newStatus = currentStatus === 1 ? 0 : 1;
    const targetDish = dishes.find(d => d.id === dishId);

    const updatedDishes = dishes.map((d) => 
      d.id === dishId ? { ...d, is_available: newStatus } : d
    );
    setDishes(updatedDishes);

    // Save to IndexedDB
    await cacheMenu(updatedDishes);

    // 1. Sync to Convex Cloud Database
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

    // 2. Sync with SQLite Server API
    try {
      const serverUrl = resolveServerUrl();
      const res = await fetch(`${serverUrl}/api/menu/${dishId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: newStatus })
      });

      if (!res.ok) {
        await fetch(`${serverUrl}/api/menu/${dishId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_available: newStatus })
        });
      }
    } catch (err) {
      console.warn('[MenuManager] Saved availability toggle locally (offline mode):', err.message);
    }

    triggerSuccess(newStatus ? 'Item marked in stock' : 'Item marked out of stock');
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

    // 3. Persist to SQLite Server
    try {
      const serverUrl = resolveServerUrl();
      await fetch(`${serverUrl}/api/menu/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          icon: chosenIcon
        })
      });
    } catch (apiErr) {
      console.warn('[MenuManager] Server createCategory warning (offline mode):', apiErr.message);
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

    try {
      const serverUrl = resolveServerUrl();
      await fetch(`${serverUrl}/api/menu/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, icon: '🍽️' })
      });
    } catch {}

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
      is_veg: false,
      is_spicy: false,
      is_available: true
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
    setFormData({
      name: dish.name || '',
      category: dish.category || 'Mains',
      price: dish.price !== undefined ? String(dish.price) : '',
      description: dish.description || '',
      image_url: dish.image_url || dish.imageUrl || '',
      making_video_url: dish.making_video_url || dish.makingVideoUrl || '',
      is_veg: Boolean(dish.is_veg),
      is_spicy: Boolean(dish.is_spicy),
      is_available: Boolean(dish.is_available)
    });
    setFormError('');
    setUploadError('');
    setIsModalOpen(true);
  };

  // Save Dish (Add or Edit) -> Persists to Convex Cloud AND SQLite Local Server
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
    const serverUrl = resolveServerUrl();

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

    const payload = {
      name: trimmedName,
      category: categoryName,
      category_name: categoryName,
      categorySlug,
      price: Math.round(parsedPrice * 100) / 100,
      description: formData.description.trim(),
      image_url: formData.image_url.trim(),
      image: formData.image_url.trim(),
      making_video_url: formData.making_video_url.trim(),
      is_veg: formData.is_veg ? 1 : 0,
      is_spicy: formData.is_spicy ? 1 : 0,
      is_available: formData.is_available ? 1 : 0
    };

    let updatedList = [...dishes];

    try {
      if (modalMode === 'add') {
        // 1. Save structured record to Convex Cloud Database
        let convexNewId = null;
        if (createConvexItem) {
          try {
            convexNewId = await createConvexItem({
              categorySlug,
              name: trimmedName,
              description: formData.description.trim(),
              price: Math.round(parsedPrice * 100) / 100,
              imageUrl: formData.image_url.trim(),
              images: [formData.image_url.trim()].filter(Boolean),
              makingVideoUrl: formData.making_video_url.trim() || undefined,
              isVeg: Boolean(formData.is_veg),
              isSpicy: Boolean(formData.is_spicy),
              isAvailable: Boolean(formData.is_available)
            });
          } catch (convexErr) {
            console.warn('[MenuManager] Convex create failed:', convexErr.message);
          }
        }

        // 2. Save into SQLite Local Server
        let newDishObj = null;
        try {
          const res = await fetch(`${serverUrl}/api/menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              making_video_url: formData.making_video_url.trim(),
              convex_id: convexNewId || undefined
            })
          });
          if (res.ok) {
            const result = await res.json();
            newDishObj = result.data || result;
          }
        } catch (postErr) {
          console.warn('[MenuManager] Server POST failed, saving locally:', postErr.message);
        }

        // 3. Fallback ID resolution
        if (!newDishObj || !newDishObj.id) {
          const maxId = dishes.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0);
          newDishObj = {
            ...payload,
            id: convexNewId || (maxId + 1),
            convexId: convexNewId
          };
        } else if (convexNewId) {
          newDishObj.convexId = convexNewId;
        }

        updatedList = [normalizeDish(newDishObj), ...updatedList];
        triggerSuccess(`"${trimmedName}" saved to Convex & Menu! ✨`);
      } else {
        // Edit existing dish
        const currentDish = dishes.find(d => d.id === editingDishId);
        const targetConvexId = currentDish?.convexId;

        // 1. Update in Convex Cloud Database
        if (targetConvexId && updateConvexItem) {
          try {
            await updateConvexItem({
              id: targetConvexId,
              name: trimmedName,
              description: formData.description.trim(),
              price: Math.round(parsedPrice * 100) / 100,
              imageUrl: formData.image_url.trim(),
              images: [formData.image_url.trim()].filter(Boolean),
              makingVideoUrl: formData.making_video_url.trim() || undefined,
              isVeg: Boolean(formData.is_veg),
              isSpicy: Boolean(formData.is_spicy),
              isAvailable: Boolean(formData.is_available)
            });
          } catch (convexErr) {
            console.warn('[MenuManager] Convex update failed:', convexErr.message);
          }
        } else if (!targetConvexId && createConvexItem) {
          // If dish was previously only in SQLite, insert into Convex
          try {
            await createConvexItem({
              categorySlug,
              name: trimmedName,
              description: formData.description.trim(),
              price: Math.round(parsedPrice * 100) / 100,
              imageUrl: formData.image_url.trim(),
              images: [formData.image_url.trim()].filter(Boolean),
              makingVideoUrl: formData.making_video_url.trim() || undefined,
              isVeg: Boolean(formData.is_veg),
              isSpicy: Boolean(formData.is_spicy),
              isAvailable: Boolean(formData.is_available)
            });
          } catch (cErr) {
            console.warn('[MenuManager] Convex push failed:', cErr.message);
          }
        }

        // 2. Update in SQLite Local Server
        try {
          await fetch(`${serverUrl}/api/menu/${editingDishId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              making_video_url: formData.making_video_url.trim()
            })
          });
        } catch (putErr) {
          console.warn('[MenuManager] Server PUT failed, saving locally:', putErr.message);
        }

        updatedList = updatedList.map((d) => 
          d.id === editingDishId ? normalizeDish({ ...d, ...payload, id: editingDishId, convexId: targetConvexId }) : d
        );
        triggerSuccess(`"${trimmedName}" updated! ✨`);
      }

      setDishes(updatedList);
      await cacheMenu(updatedList);
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Error saving dish. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm and Execute Deletion (Convex + SQLite + IndexedDB)
  const handleDeleteDish = async () => {
    if (!dishToDelete) return;
    const { id, convexId, name } = dishToDelete;

    const updatedList = dishes.filter(d => d.id !== id);
    setDishes(updatedList);
    await cacheMenu(updatedList);

    // 1. Delete in Convex
    if (deleteConvexItem && convexId) {
      try {
        await deleteConvexItem({ id: convexId });
      } catch (convexErr) {
        console.warn('[MenuManager] Convex delete failed:', convexErr.message);
      }
    }

    // 2. Send DELETE to SQLite server
    try {
      const serverUrl = resolveServerUrl();
      await fetch(`${serverUrl}/api/menu/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[MenuManager] Server delete failed, deleted from local cache:', err.message);
    }

    setDishToDelete(null);
    triggerSuccess(`"${name}" was deleted from the menu.`);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Top Banner / Actions Bar */}
      <div className="admin-enter bg-[#111827] rounded-2xl border border-[#334155] p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-[#f8fafc]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#f8fafc] tracking-tight">
              Menu Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Admin
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
              <Send className="w-3 h-3 -rotate-45" /> Telegram CDN
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Convex Cloud DB
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#94a3b8] mt-1">
            Media hosted on Telegram Channel (@Restaurant Media) • Structured text records stored in Convex Cloud Database.
          </p>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadMenu}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] transition active:scale-95 cursor-pointer shadow-xs"
            title="Refresh menu items"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setNewCategoryData({ name: '', icon: '🍽️', description: '' });
              setCategoryError('');
              setIsCategoryModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-[#1e293b] hover:bg-amber-500/15 hover:border-amber-500 text-amber-300 font-semibold text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-xs"
            title="Create a new menu category"
          >
            <FolderPlus className="w-4 h-4 stroke-[2.2]" />
            <span>+ Add Category</span>
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
      <div className="admin-enter grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4" style={{ '--i': 1 }}>
        <div className="bg-[#111827] p-4 rounded-xl border border-[#334155] shadow-xs">
          <span className="text-xs font-medium text-[#94a3b8]">Total Items</span>
          <div className="text-xl sm:text-2xl font-bold text-[#f8fafc] mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-[#111827] p-4 rounded-xl border border-[#334155] shadow-xs">
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> In Stock
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
            {stats.inStock}
          </div>
        </div>
        <div className="bg-[#111827] p-4 rounded-xl border border-[#334155] shadow-xs">
          <span className="text-xs font-medium text-rose-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Sold Out
          </span>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 mt-1">
            {stats.outOfStock}
          </div>
        </div>
        <div className="bg-[#111827] p-4 rounded-xl border border-[#334155] shadow-xs">
          <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Vegetarian
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#f8fafc] mt-1">
            {stats.vegCount}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-[#111827] p-4 rounded-xl border border-[#334155] shadow-xs">
          <span className="text-xs font-medium text-sky-400 flex items-center gap-1">
            <Send className="w-3.5 h-3.5 -rotate-45" /> Telegram CDN
          </span>
          <div className="text-xl sm:text-2xl font-bold text-sky-400 mt-1 flex items-baseline gap-1">
            <span>{stats.tgMediaCount || 0}</span>
            <span className="text-[10px] text-[#94a3b8] font-normal">hosted</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-[#111827] p-4 rounded-2xl border border-[#334155] space-y-3 shadow-md text-[#f8fafc]">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name, description, or ingredients..."
              className="admin-dark-input w-full placeholder-[#64748b]"
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '10px 14px',
                paddingLeft: '38px',
                paddingRight: '32px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc] text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Dietary / Stock / Media Filter Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'video', label: '🎥 Has Video' },
              { id: 'available', label: 'In Stock' },
              { id: 'unavailable', label: 'Sold Out' },
              { id: 'veg', label: '🌱 Veg Only' },
              { id: 'spicy', label: '🌶️ Spicy' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer border ${
                  filterType === f.id
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] border-[#334155]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#334155] no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-[#1e293b] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155] border border-[#334155]'
            }`}
          >
            All Categories ({dishes.length})
          </button>
          {availableCategories.map((cat) => {
            const count = dishes.filter(d => d.category.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-[#1e293b] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155] border border-[#334155]'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-amber-600 text-white' : 'bg-[#0f172a] text-[#94a3b8]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Prominent + Add Category Button right on toolbar */}
          <button
            type="button"
            onClick={() => {
              setNewCategoryData({ name: '', icon: '🍽️', description: '' });
              setCategoryError('');
              setIsCategoryModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-amber-500/60 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Create a new category"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Dishes Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-[#94a3b8]">Loading restaurant dishes...</p>
        </div>
      ) : filteredDishes.length === 0 ? (
        <div className="admin-empty bg-[#111827] rounded-2xl border border-dashed border-[#334155] p-12 px-4 text-center">
          <UtensilsCrossed className="w-10 h-10 text-[#94a3b8] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#f8fafc]">No dishes found</h3>
          <p className="text-xs text-[#94a3b8] max-w-sm mx-auto mt-1 mb-4">
            No menu items match your current search and category filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setFilterType('all');
            }}
            className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] border border-[#334155] text-xs font-semibold transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {filteredDishes.map((dish) => {
            const isAvailable = Boolean(dish.is_available);
            return (
              <div
                key={dish.id}
                className={`group flex flex-col justify-between h-full bg-[#111827] rounded-2xl border transition-all duration-200 overflow-hidden shadow-md hover:border-slate-500 hover:shadow-xl ${
                  !isAvailable ? 'border-rose-900/60 bg-[#111827]/90' : 'border-[#334155]'
                }`}
              >
                <div className="flex flex-col flex-1">
                  {/* Dish Header Image & Tags - strictly uniform height and aspect ratio */}
                  <div className="relative w-full h-48 bg-[#1e293b] overflow-hidden shrink-0">
                    {dish.image_url ? (
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
                      className={`w-full h-full flex flex-col items-center justify-center bg-[#1e293b] text-[#94a3b8] ${
                        dish.image_url ? 'hidden' : 'flex'
                      }`}
                    >
                      <ImageIcon className="w-8 h-8 mb-1 opacity-60" />
                      <span className="text-[11px] font-medium text-zinc-400">No Image Provided</span>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10 max-w-[70%]">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0f172a]/90 backdrop-blur-xs text-[#f8fafc] border border-white/10 shadow-xs">
                        {dish.category}
                      </span>
                      {Boolean(dish.is_veg) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                          <Leaf className="w-2.5 h-2.5 fill-current" />
                          Veg
                        </span>
                      )}
                      {Boolean(dish.is_spicy) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                          <Flame className="w-2.5 h-2.5 fill-current" />
                          Spicy
                        </span>
                      )}
                      {Boolean(dish.image_url && (dish.image_url.includes('telegram') || dish.image_url.includes('api.telegram.org'))) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-600 text-white shadow-xs" title="Photo hosted on Telegram Channel CDN">
                          <Send className="w-2.5 h-2.5 -rotate-45" />
                          TG Media
                        </span>
                      )}
                      {Boolean(dish.making_video_url || dish.makingVideoUrl) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white shadow-xs border border-rose-400/40" title="Profile video active: plays on customer view">
                          <Video className="w-2.5 h-2.5 fill-current" />
                          Video Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(dish);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 cursor-pointer transition"
                          title="Click to add a profile video to this dish"
                        >
                          <Video className="w-2.5 h-2.5 text-purple-400" />
                          + Video
                        </button>
                      )}
                    </div>

                    {/* Stock Status Badge Overlay */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight shadow-xs uppercase ${
                          isAvailable
                            ? 'bg-emerald-500 text-white'
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
                        <h3 className="font-bold text-[#f8fafc] text-base leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors" title={dish.name}>
                          {dish.name}
                        </h3>
                        <span className="text-base font-extrabold text-[#f8fafc] tracking-tight shrink-0">
                          ${(Number(dish.price) || 0).toFixed(2)}
                        </span>
                      </div>

                      <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed h-9 overflow-hidden">
                        {dish.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls: Availability Switch + Edit + Delete */}
                <div className="p-3.5 bg-[#1e293b] border-t border-[#334155] flex items-center justify-between gap-2 shrink-0 mt-auto">
                  
                  {/* Availability Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={(e) => handleToggleAvailability(dish.id, dish.is_available, e)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                    <span className="text-[11px] font-semibold text-[#94a3b8]">
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>

                  {/* Edit and Delete Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(dish)}
                      className="p-1.5 rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-[#334155] text-[#f8fafc] transition active:scale-95 cursor-pointer"
                      title="Edit dish details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDishToDelete(dish)}
                      className="p-1.5 rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-rose-950/60 hover:border-rose-700 text-[#94a3b8] hover:text-rose-400 transition active:scale-95 cursor-pointer"
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
      )}

      {/* =========================================================================
          ADD / EDIT DISH MODAL
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#111827] rounded-2xl shadow-2xl border border-[#334155] overflow-hidden transform transition-all animate-scaleUp max-h-[90vh] flex flex-col text-[#f8fafc]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#334155] flex items-center justify-between bg-[#1e293b]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  {modalMode === 'add' ? <Plus className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-[#f8fafc] text-base leading-tight">
                    {modalMode === 'add' ? 'Add New Dish' : 'Edit Dish Details'}
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    {modalMode === 'add' ? 'Fill out the details to introduce a new menu item' : 'Update pricing, images, or dish information'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#94a3b8] hover:text-[#f8fafc] p-1 rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <form onSubmit={handleSaveDish} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Dish Name */}
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Signature Truffle Ribeye"
                  className="admin-dark-input w-full placeholder-[#64748b]"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
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
                    <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
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
                        backgroundColor: '#0f172a',
                        color: '#f8fafc',
                        border: '1px solid #334155',
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
                      <option value="__new__" className="text-amber-400 font-bold bg-[#1e293b]">
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
                          className="admin-dark-input flex-1 placeholder-[#64748b]"
                          style={{
                            backgroundColor: '#0f172a',
                            color: '#f8fafc',
                            border: '1px solid #f59e0b',
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
                          className="px-2.5 py-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] text-xs font-semibold transition cursor-pointer border border-[#334155] shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-[10px] text-[#94a3b8]">
                        Press Enter or click Add to create and select category.
                      </p>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                    Price ($ USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="14.99"
                      className="admin-dark-input w-full placeholder-[#64748b]"
                      style={{
                        backgroundColor: '#0f172a',
                        color: '#f8fafc',
                        border: '1px solid #334155',
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
                <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ingredients, cooking style, portion notes..."
                  className="admin-dark-input w-full placeholder-[#64748b] resize-none"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
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
              <div className="p-4 bg-[#1e293b] rounded-2xl border border-[#334155] space-y-4">
                
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-xs">
                      <Send className="w-3.5 h-3.5 -rotate-45" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#f8fafc] uppercase tracking-wider flex items-center gap-1.5">
                        <span>Telegram Media Storage & CDN</span>
                        <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/80 px-1.5 py-0.2 rounded-full border border-sky-800">
                          Free Cloud CDN
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#94a3b8]">
                        Photos & kitchen reels host on <strong className="text-[#f8fafc]">@Restaurant Media</strong>; records in <strong className="text-[#f8fafc]">Convex</strong>.
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

                {/* 1. FOOD PHOTO SECTION */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-xs font-bold text-[#f8fafc] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>Food Dish Photo</span>
                    </label>

                    {(formData.image_url?.includes('telegram') || formData.image_url?.includes('api.telegram.org')) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700 animate-fadeIn">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>✅ Hosted on Telegram Channel</span>
                      </span>
                    )}
                  </div>

                  {/* Hidden photo file input */}
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {/* Upload button and URL field */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {uploadingPhoto ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 -rotate-45" />
                      )}
                      <span>{uploadingPhoto ? 'Uploading to Telegram Channel...' : 'Upload Photo to Telegram'}</span>
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="Telegram CDN URL or external photo link..."
                        className="admin-dark-input w-full font-mono placeholder-[#64748b] truncate"
                        style={{
                          backgroundColor: '#0f172a',
                          color: '#f8fafc',
                          border: '1px solid #334155',
                          padding: '10px 14px',
                          paddingRight: '32px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      />
                      {formData.image_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc] text-xs p-1 cursor-pointer"
                          title="Clear photo"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Photo Preview Box */}
                  {formData.image_url && (
                    <div className="flex items-center gap-3 p-2.5 bg-[#0f172a] rounded-xl border border-[#334155]">
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#334155] bg-[#1e293b] shrink-0">
                        <img
                          src={formData.image_url}
                          alt="Dish Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-[#f8fafc] truncate">
                          {formData.name || 'Dish Photo Preview'}
                        </p>
                        <p className="text-[10px] text-[#94a3b8] truncate font-mono mt-0.5">
                          {formData.image_url}
                        </p>
                        {(formData.image_url.includes('telegram') || formData.image_url.includes('api.telegram.org')) && (
                          <span className="text-[10px] text-sky-400 font-medium flex items-center gap-1 mt-0.5">
                            <Send className="w-2.5 h-2.5 -rotate-45" /> Channel: @Restaurant Media (Telegram CDN)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. KITCHEN REEL VIDEO SECTION */}
                <div className="space-y-2.5 pt-3 border-t border-[#334155]">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div>
                      <label className="text-xs font-bold text-[#f8fafc] flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-rose-400" />
                        <span>Food Profile Video Reel <span className="text-[10px] text-amber-300 font-semibold">(Plays on Customer View at First Glance)</span></span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        MP4, WebM or video link. When set, customers see a realistic looping video right on this dish card!
                      </p>
                    </div>

                    {(formData.making_video_url?.includes('telegram') || formData.making_video_url?.includes('api.telegram.org')) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700 animate-fadeIn">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Hosted on Telegram Channel</span>
                      </span>
                    )}
                  </div>

                  {/* Quick Food Video Preset Chips */}
                  <div className="bg-[#0b0f19] p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Quick Sample Food Reels (1-Click Apply):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '👨‍🍳 Chef Wok Fire Reel', url: '/videos/reel-chef.mp4' },
                        { label: '🥩 Sizzling Ribeye Sizzle', url: '/videos/reel-chef.mp4' },
                        { label: '🍔 Gourmet Wagyu Burger', url: '/videos/reel-chef.mp4' },
                        { label: '🍝 Truffle Pasta Plating', url: '/videos/reel-chef.mp4' },
                        { label: '🍰 Lava Dessert Reveal', url: '/videos/reel-chef.mp4' }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, making_video_url: preset.url }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                            formData.making_video_url === preset.url
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-xs'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hidden video file input */}
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />

                  {/* Upload button and URL field */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {uploadingVideo ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Video className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingVideo ? 'Uploading Video...' : 'Upload Video File'}</span>
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="url"
                        value={formData.making_video_url}
                        onChange={(e) => setFormData({ ...formData, making_video_url: e.target.value })}
                        placeholder="Paste MP4 / WebM video link or select sample clip above..."
                        className="admin-dark-input w-full font-mono placeholder-[#64748b] truncate"
                        style={{
                          backgroundColor: '#0f172a',
                          color: '#f8fafc',
                          border: '1px solid #334155',
                          padding: '10px 14px',
                          paddingRight: '32px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      />
                      {formData.making_video_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, making_video_url: '' })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc] text-xs p-1 cursor-pointer"
                          title="Clear video"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Video Player Preview */}
                  {formData.making_video_url && (
                    <div className="p-3 bg-[#0b0f19] rounded-xl border border-rose-500/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#f8fafc]">
                        <span className="flex items-center gap-1.5 text-rose-400">
                          <Play className="w-3.5 h-3.5 fill-current" /> Live Profile Video Preview (Customer View)
                        </span>
                        <span className="text-[10px] text-[#94a3b8] font-mono truncate max-w-xs">
                          {formData.making_video_url}
                        </span>
                      </div>
                      <video
                        src={formData.making_video_url}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full max-h-48 rounded-lg bg-black object-contain border border-slate-800 shadow-md"
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* Dietary Flags & Stock Switch */}
              <div className="pt-2 border-t border-[#334155] space-y-2.5">
                <span className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                  Dish Attributes
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Vegetarian Toggle */}
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                    formData.is_veg ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.is_veg}
                      onChange={(e) => setFormData({ ...formData, is_veg: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      formData.is_veg ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-[#334155] bg-[#0f172a]'
                    }`}>
                      {formData.is_veg && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold">Vegetarian</span>
                  </label>

                  {/* Spicy Toggle */}
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                    formData.is_spicy ? 'bg-rose-950/60 border-rose-500 text-rose-300' : 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.is_spicy}
                      onChange={(e) => setFormData({ ...formData, is_spicy: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      formData.is_spicy ? 'bg-rose-600 border-rose-600 text-white' : 'border-[#334155] bg-[#0f172a]'
                    }`}>
                      {formData.is_spicy && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-xs font-semibold">Spicy</span>
                  </label>

                  {/* Available In Stock Toggle */}
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                    formData.is_available ? 'bg-amber-950/60 border-amber-500 text-amber-300' : 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      formData.is_available ? 'bg-amber-500 border-amber-500 text-white' : 'border-[#334155] bg-[#0f172a]'
                    }`}>
                      {formData.is_available && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold">In Stock</span>
                  </label>
                </div>
              </div>

              {/* Form Bottom Actions */}
              <div className="pt-4 border-t border-[#334155] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] text-xs sm:text-sm font-semibold transition cursor-pointer"
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
          <div className="w-full max-w-md bg-[#111827] rounded-2xl shadow-2xl border border-[#334155] overflow-hidden transform transition-all animate-scaleUp text-[#f8fafc]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#334155] flex items-center justify-between bg-[#1e293b]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#f8fafc] text-base leading-tight">
                    Add New Category
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Create a menu section to group your dishes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[#94a3b8] hover:text-[#f8fafc] p-1 rounded-lg cursor-pointer transition"
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
                <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryData.name}
                  onChange={(e) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                  placeholder="e.g. Mocktails, Artisan Pizzas, Chef Specials"
                  className="admin-dark-input w-full placeholder-[#64748b]"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                />
              </div>

              {/* Category Icon / Emoji Quick Selector */}
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Icon / Emoji <span className="text-[10px] text-[#94a3b8] font-normal">(Optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryData.icon}
                    onChange={(e) => setNewCategoryData({ ...newCategoryData, icon: e.target.value })}
                    placeholder="🍽️"
                    className="admin-dark-input w-16 text-center text-lg placeholder-[#64748b]"
                    style={{
                      backgroundColor: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #334155',
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
                            : 'bg-[#1e293b] border-[#334155] hover:bg-[#334155]'
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
                <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Description <span className="text-[10px] text-[#94a3b8] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData({ ...newCategoryData, description: e.target.value })}
                  placeholder="e.g. Signature handcrafted mocktails & refreshments"
                  className="admin-dark-input w-full placeholder-[#64748b]"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#334155] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] text-xs sm:text-sm font-semibold transition cursor-pointer"
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
          <div className="w-full max-w-sm bg-[#111827] rounded-2xl shadow-2xl border border-[#334155] p-6 text-center transform transition-all animate-scaleUp text-[#f8fafc]">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[#f8fafc] mb-1">
              Delete Menu Dish?
            </h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed mb-5">
              Are you sure you want to delete <span className="font-semibold text-[#f8fafc]">"{dishToDelete.name}"</span>? This will remove the item immediately from the customer menu.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDishToDelete(null)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] text-xs sm:text-sm font-semibold transition cursor-pointer"
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
