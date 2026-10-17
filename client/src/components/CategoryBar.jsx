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
    <div className={`relative w-full bg-[#0a0a0c]/90 backdrop-blur-xl py-2.5 border-b border-zinc-800/80 transition-all ${className}`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 relative flex items-center">
        
        {/* Left Scroll Button (Desktop / larger screens) */}
        <button
          type="button"
          onClick={() => scrollByAmount(-220)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-[#18181c]/90 backdrop-blur-xs border border-zinc-800 shadow-md text-zinc-400 hover:text-white hover:border-[#FF5A26]/50 active:scale-95 transition-all shrink-0 mr-1.5 z-10 cursor-pointer"
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
                className={`group relative overflow-hidden inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all duration-300 ease-out shrink-0 select-none cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-lg shadow-[#FF5A26]/30 ring-1 ring-[#FF7A45]/50 scale-[1.02]'
                    : 'bg-[#161619]/80 hover:bg-[#1f1f24] text-zinc-300 hover:text-white border border-white/5 hover:border-zinc-700 shadow-xs hover:-translate-y-px'
                }`}
              >
                <span className="text-base leading-none transition-transform duration-200 group-hover:scale-115">
                  {icon}
                </span>
                <span className="whitespace-nowrap font-medium tracking-tight">
                  {categoryName}
                </span>
                
                {/* Sliding highlight under the active pill */}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-white/80 transition-all duration-300 ease-out ${
                    isSelected ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                  }`}
                />

                {count !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold font-mono leading-none transition-all ${
                      isSelected
                        ? 'bg-black/25 text-white border border-white/20 shadow-xs'
                        : 'bg-zinc-800/80 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'
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
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-[#18181c]/90 backdrop-blur-xs border border-zinc-800 shadow-md text-zinc-400 hover:text-white hover:border-[#FF5A26]/50 active:scale-95 transition-all shrink-0 ml-1.5 z-10 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
