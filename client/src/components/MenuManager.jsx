import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  UtensilsCrossed
} from 'lucide-react';
import { resolveServerUrl } from '../context/SocketContext';
import { getCachedMenu, cacheMenu } from '../db/indexedDb';

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
    is_veg: false,
    is_spicy: false,
    is_available: true
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Normalizes dish object to handle both snake_case and camelCase
  const normalizeDish = useCallback((item) => {
    return {
      id: item.id || item._id,
      name: item.name || item.title || 'Untitled Dish',
      category: item.category || item.category_name || item.categoryName || 'Mains',
      category_id: item.category_id || item.categoryId || null,
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
      description: item.description || '',
      image_url: item.image_url || item.image || '',
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

    setDishes(loadedDishes);
    setLoading(false);
  }, [normalizeDish]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // Extract all unique category names
  const availableCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    dishes.forEach(d => {
      if (d.category && typeof d.category === 'string') {
        set.add(d.category.trim());
      }
    });
    return Array.from(set);
  }, [dishes]);

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
      // Dietary / Availability filters
      if (filterType === 'veg' && !dish.is_veg) return false;
      if (filterType === 'spicy' && !dish.is_spicy) return false;
      if (filterType === 'available' && !dish.is_available) return false;
      if (filterType === 'unavailable' && dish.is_available) return false;

      return true;
    });
  }, [dishes, selectedCategory, searchQuery, filterType]);

  // Overall quick stats
  const stats = useMemo(() => {
    const total = dishes.length;
    const inStock = dishes.filter(d => d.is_available).length;
    const outOfStock = total - inStock;
    const vegCount = dishes.filter(d => d.is_veg).length;
    return { total, inStock, outOfStock, vegCount };
  }, [dishes]);

  // Toggle item availability immediately
  const handleToggleAvailability = async (dishId, currentStatus, e) => {
    if (e) e.stopPropagation();

    const newStatus = currentStatus === 1 ? 0 : 1;
    const updatedDishes = dishes.map((d) => 
      d.id === dishId ? { ...d, is_available: newStatus } : d
    );
    setDishes(updatedDishes);

    // Save to IndexedDB
    await cacheMenu(updatedDishes);

    // Sync with Server API
    try {
      const serverUrl = resolveServerUrl();
      const res = await fetch(`${serverUrl}/api/menu/${dishId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: newStatus })
      });

      if (!res.ok) {
        // Fallback try standard PUT if PATCH endpoint not configured
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

  // Open modal for Adding a new dish
  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingDishId(null);
    setFormData({
      name: '',
      category: availableCategories[0] || 'Mains',
      price: '',
      description: '',
      image_url: '',
      is_veg: false,
      is_spicy: false,
      is_available: true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for Editing an existing dish
  const handleOpenEditModal = (dish) => {
    setModalMode('edit');
    setEditingDishId(dish.id);
    setFormData({
      name: dish.name || '',
      category: dish.category || 'Mains',
      price: dish.price !== undefined ? String(dish.price) : '',
      description: dish.description || '',
      image_url: dish.image_url || '',
      is_veg: Boolean(dish.is_veg),
      is_spicy: Boolean(dish.is_spicy),
      is_available: Boolean(dish.is_available)
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Dish (Add or Edit)
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

    const payload = {
      name: trimmedName,
      category: formData.category.trim() || 'Mains',
      category_name: formData.category.trim() || 'Mains',
      price: Math.round(parsedPrice * 100) / 100,
      description: formData.description.trim(),
      image_url: formData.image_url.trim(),
      image: formData.image_url.trim(),
      is_veg: formData.is_veg ? 1 : 0,
      is_spicy: formData.is_spicy ? 1 : 0,
      is_available: formData.is_available ? 1 : 0
    };

    let updatedList = [...dishes];

    try {
      if (modalMode === 'add') {
        // Try server POST
        let newDishObj = null;
        try {
          const res = await fetch(`${serverUrl}/api/menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const result = await res.json();
            newDishObj = result.data || result;
          }
        } catch (postErr) {
          console.warn('[MenuManager] Server POST failed, saving locally:', postErr.message);
        }

        // If server failed or gave no id, generate local unique id
        if (!newDishObj || !newDishObj.id) {
          const maxId = dishes.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0);
          newDishObj = {
            ...payload,
            id: maxId + 1
          };
        }

        updatedList = [normalizeDish(newDishObj), ...updatedList];
        triggerSuccess(`"${trimmedName}" added to menu!`);
      } else {
        // Edit existing dish
        try {
          await fetch(`${serverUrl}/api/menu/${editingDishId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (putErr) {
          console.warn('[MenuManager] Server PUT failed, saving locally:', putErr.message);
        }

        updatedList = updatedList.map((d) => 
          d.id === editingDishId ? normalizeDish({ ...d, ...payload, id: editingDishId }) : d
        );
        triggerSuccess(`"${trimmedName}" updated!`);
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

  // Confirm and Execute Deletion
  const handleDeleteDish = async () => {
    if (!dishToDelete) return;
    const { id, name } = dishToDelete;

    const updatedList = dishes.filter(d => d.id !== id);
    setDishes(updatedList);
    await cacheMenu(updatedList);

    // Send DELETE to server
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
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              Menu Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Create, update dish pricing, and toggle instant item availability in real-time.
          </p>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadMenu}
            disabled={loading}
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition active:scale-95 cursor-pointer shadow-2xs"
            title="Refresh menu items"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
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
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-2 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast('')}
            className="text-emerald-500 hover:text-emerald-800 text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs">
          <span className="text-xs font-medium text-neutral-500">Total Items</span>
          <div className="text-xl sm:text-2xl font-bold text-neutral-900 mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs">
          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> In Stock
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
            {stats.inStock}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs">
          <span className="text-xs font-medium text-rose-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Sold Out
          </span>
          <div className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">
            {stats.outOfStock}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs">
          <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Vegetarian
          </span>
          <div className="text-xl sm:text-2xl font-bold text-neutral-900 mt-1">
            {stats.vegCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name, description, or ingredients..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Dietary / Stock Filter Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Items' },
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
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-neutral-100 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80'
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
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-amber-600 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dishes Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-neutral-600">Loading restaurant dishes...</p>
        </div>
      ) : filteredDishes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-neutral-300 p-12 text-center">
          <UtensilsCrossed className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-800">No dishes found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
            No menu items match your current search and category filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setFilterType('all');
            }}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredDishes.map((dish) => {
            const isAvailable = Boolean(dish.is_available);
            return (
              <div
                key={dish.id}
                className={`group flex flex-col justify-between bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                  !isAvailable ? 'border-rose-200/80 bg-neutral-50/70' : 'border-neutral-200/80'
                }`}
              >
                <div>
                  {/* Dish Header Image & Tags */}
                  <div className="relative aspect-16/9 w-full bg-neutral-100 overflow-hidden">
                    {dish.image_url ? (
                      <img
                        src={dish.image_url}
                        alt={dish.name}
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-102 ${
                          !isAvailable ? 'grayscale-40 opacity-70' : ''
                        }`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50/50 text-amber-700/50">
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-[11px] font-medium">No Image Provided</span>
                      </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-900/85 backdrop-blur-xs text-white">
                        {dish.category}
                      </span>
                      {Boolean(dish.is_veg) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                          <Leaf className="w-2.5 h-2.5 fill-current" />
                          Veg
                        </span>
                      )}
                      {Boolean(dish.is_spicy) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white shadow-2xs">
                          <Flame className="w-2.5 h-2.5 fill-current" />
                          Spicy
                        </span>
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
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-bold text-neutral-900 text-base leading-snug line-clamp-1 group-hover:text-amber-600 transition-colors">
                        {dish.name}
                      </h3>
                      <span className="text-base font-extrabold text-neutral-900 tracking-tight shrink-0">
                        ${dish.price.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed min-h-[32px]">
                      {dish.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Footer Controls: Availability Switch + Edit + Delete */}
                <div className="p-3.5 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between gap-2">
                  
                  {/* Availability Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={(e) => handleToggleAvailability(dish.id, dish.is_available, e)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                    <span className="text-[11px] font-semibold text-neutral-600">
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>

                  {/* Edit and Delete Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(dish)}
                      className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 transition active:scale-95 cursor-pointer"
                      title="Edit dish details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDishToDelete(dish)}
                      className="p-1.5 rounded-lg border border-neutral-200 hover:bg-rose-50 text-neutral-500 hover:text-rose-600 hover:border-rose-200 transition active:scale-95 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden transform transition-all animate-scaleUp max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                  {modalMode === 'add' ? <Plus className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-base leading-tight">
                    {modalMode === 'add' ? 'Add New Dish' : 'Edit Dish Details'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {modalMode === 'add' ? 'Fill out the details to introduce a new menu item' : 'Update pricing, images, or dish information'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <form onSubmit={handleSaveDish} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Dish Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Signature Truffle Ribeye"
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
              </div>

              {/* Category & Price Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Selection / Input */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                    Price ($ USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="14.99"
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ingredients, cooking style, portion notes..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-none"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                  Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                  {formData.image_url && (
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Paste a direct link to an image. (Supports Unsplash, CDN, or uploaded images)
                </p>
              </div>

              {/* Dietary Flags & Stock Switch */}
              <div className="pt-2 border-t border-neutral-100 space-y-2.5">
                <span className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Dish Attributes
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Vegetarian Toggle */}
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                    formData.is_veg ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.is_veg}
                      onChange={(e) => setFormData({ ...formData, is_veg: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      formData.is_veg ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-neutral-300 bg-white'
                    }`}>
                      {formData.is_veg && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold">Vegetarian</span>
                  </label>

                  {/* Spicy Toggle */}
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                    formData.is_spicy ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.is_spicy}
                      onChange={(e) => setFormData({ ...formData, is_spicy: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      formData.is_spicy ? 'bg-rose-600 border-rose-600 text-white' : 'border-neutral-300 bg-white'
                    }`}>
                      {formData.is_spicy && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="text-xs font-semibold">Spicy</span>
                  </label>

                  {/* Available In Stock Toggle */}
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                    formData.is_available ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-neutral-50 border-neutral-200 text-neutral-500'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      formData.is_available ? 'bg-amber-500 border-amber-500 text-white' : 'border-neutral-300 bg-white'
                    }`}>
                      {formData.is_available && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs font-semibold">In Stock</span>
                  </label>
                </div>
              </div>

              {/* Form Bottom Actions */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-600 text-xs sm:text-sm font-semibold transition cursor-pointer"
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
          DELETE CONFIRMATION MODAL
          ========================================================================= */}
      {dishToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6 text-center transform transition-all animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-neutral-900 mb-1">
              Delete Menu Dish?
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed mb-5">
              Are you sure you want to delete <span className="font-semibold text-neutral-800">"{dishToDelete.name}"</span>? This will remove the item immediately from the customer menu.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDishToDelete(null)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-600 text-xs sm:text-sm font-semibold transition cursor-pointer"
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
