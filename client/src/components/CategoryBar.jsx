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

  // Default icons for typical restaurant categories
  const defaultCategoryIcons = {
    all: '✨',
    starters: '🥗',
    mains: '🥩',
    burgers: '🍔',
    pizza: '🍕',
    sides: '🍟',
    beverages: '🍹',
    drinks: '🥤',
    desserts: '🍰',
    specials: '⭐',
    combos: '🍱'
  };

  return (
    <div className={`relative w-full bg-white/90 backdrop-blur-xs py-2 border-b border-neutral-100 ${className}`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 relative flex items-center">
        
        {/* Left Scroll Button (Desktop / larger screens) */}
        <button
          type="button"
          onClick={() => scrollByAmount(-200)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white border border-neutral-200/80 shadow-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition shrink-0 mr-1 z-10 cursor-pointer"
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
                className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all duration-200 shrink-0 select-none cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-md shadow-neutral-900/15 scale-102 ring-2 ring-neutral-900/10'
                    : 'bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 border border-neutral-200/40 hover:scale-101'
                }`}
              >
                <span className="text-base leading-none transition-transform group-hover:scale-110">
                  {icon}
                </span>
                <span className="whitespace-nowrap">{categoryName}</span>
                
                {count !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none transition-colors ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-200/90 text-neutral-600 group-hover:bg-neutral-300'
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
          onClick={() => scrollByAmount(200)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white border border-neutral-200/80 shadow-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition shrink-0 ml-1 z-10 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
