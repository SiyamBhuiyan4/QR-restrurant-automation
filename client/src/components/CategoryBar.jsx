import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CategoryBar Component for SmartDine Customer Menu
 * 
 * Features:
 * - Horizontal smooth-scrolling chip/pill bar
 * - Active pill auto-centering on selection
 * - Dynamic count badges per category
 * - Optional category icons / emojis
 * - Left/right desktop quick navigation controls
 */
export default function CategoryBar({
  categories = ['All', 'Starters', 'Mains', 'Burgers', 'Beverages', 'Desserts'],
  selectedCategory = 'All',
  onSelectCategory,
  categoryCounts = {},
  className = ''
}) {
  const scrollContainerRef = useRef(null);
  const pillRefs = useRef({});

  // Auto-scroll the active pill into view
  useEffect(() => {
    const activeKey = typeof selectedCategory === 'object' && selectedCategory !== null 
      ? (selectedCategory.id || selectedCategory.name) 
      : selectedCategory;

    const activeEl = pillRefs.current[activeKey];
    if (activeEl && scrollContainerRef.current) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [selectedCategory]);

  const scrollByAmount = (offset) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: offset,
        behavior: 'smooth'
      });
    }
  };

  // Michelin-grade Bistro category icons
  const defaultCategoryIcons = {
    all: '✨',
    starters: '🥗',
    appetizers: '🫒',
    mains: '🥩',
    entrees: '🍽️',
    burgers: '🍔',
    pizza: '🍕',
    pasta: '🍝',
    seafood: '🐟',
    fish: '🦞',
    grill: '🔥',
    salads: '🥗',
    soups: '🍲',
    beverages: '🥂',
    drinks: '🍹',
    cocktails: '🍸',
    wine: '🍷',
    coffee: '☕',
    desserts: '🍰',
    sweets: '🍨',
    specials: '⭐',
    combos: '🍱',
    sides: '🍟',
    vegan: '🌱',
    vegetarian: '🥑'
  };

  return (
    <div className={`relative w-full bg-white/90 backdrop-blur-md py-2.5 border-b border-stone-200/70 transition-all ${className}`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 relative flex items-center">
        
        {/* Left Scroll Button (Desktop / larger screens) */}
        <button
          type="button"
          onClick={() => scrollByAmount(-220)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs border border-stone-200/90 shadow-sm text-stone-600 hover:text-neutral-900 hover:bg-stone-50 hover:shadow-md active:scale-95 transition-all shrink-0 mr-1.5 z-10 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 w-full"
        >
          {categories.map((category) => {
            const isObject = typeof category === 'object' && category !== null;
            const categoryId = isObject ? (category.id || category.name) : category;
            const categoryName = isObject ? category.name : category;
            const customIcon = isObject ? category.icon : null;
            
            const activeKey = typeof selectedCategory === 'object' && selectedCategory !== null
              ? (selectedCategory.id || selectedCategory.name)
              : selectedCategory;
            
            const isSelected = String(activeKey).toLowerCase() === String(categoryId).toLowerCase();

            // Resolve count: from category object, or categoryCounts prop
            const count = isObject && category.count !== undefined 
              ? category.count 
              : categoryCounts[categoryName] ?? categoryCounts[categoryId];

            // Resolve icon: explicit icon > default map > fallback
            const lowerName = String(categoryName).toLowerCase();
            const icon = customIcon || defaultCategoryIcons[lowerName] || '🍽️';

            return (
              <button
                key={categoryId}
                ref={(el) => { pillRefs.current[categoryId] = el; }}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(categoryId)}
                className={`group inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all duration-200 shrink-0 select-none cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-950 text-white shadow-lg shadow-neutral-950/25 ring-1 ring-amber-500/50 scale-[1.02]'
                    : 'bg-stone-100/90 hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 border border-stone-200/70 hover:border-stone-300 shadow-2xs hover:scale-[1.01]'
                }`}
              >
                <span className="text-base leading-none transition-transform duration-200 group-hover:scale-115">
                  {icon}
                </span>
                <span className="whitespace-nowrap font-medium tracking-tight">
                  {categoryName}
                </span>
                
                {count !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold font-mono leading-none transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-xs'
                        : 'bg-stone-200/90 text-stone-600 group-hover:bg-stone-300 group-hover:text-stone-800'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button (Desktop / larger screens) */}
        <button
          type="button"
          onClick={() => scrollByAmount(220)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs border border-stone-200/90 shadow-sm text-stone-600 hover:text-neutral-900 hover:bg-stone-50 hover:shadow-md active:scale-95 transition-all shrink-0 ml-1.5 z-10 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
