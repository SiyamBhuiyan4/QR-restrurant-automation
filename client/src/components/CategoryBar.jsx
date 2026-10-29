import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CategoryBar Component for SmartDine Customer Menu
 *
 * Features:
 * - Horizontal smooth-scrolling pill bar (scrolls only the pill row,
 *   never the page)
 * - Dark emerald pills with a single gold indicator that slides between
 *   categories
 * - Active pill auto-centering on selection
 * - Gold count badges per category
 * - Optional category icons / emojis
 * - Left/right desktop quick navigation controls
 */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function CategoryBar({
  categories = ['All', 'Starters', 'Mains', 'Burgers', 'Beverages', 'Desserts'],
  selectedCategory = 'All',
  onSelectCategory,
  categoryCounts = {},
  className = ''
}) {
  const scrollContainerRef = useRef(null);
  const pillRefs = useRef({});
  const [indicator, setIndicator] = useState(null); // { left, top, width, height }

  const activeKey =
    typeof selectedCategory === 'object' && selectedCategory !== null
      ? (selectedCategory.id || selectedCategory.name)
      : selectedCategory;

  // Measure the active pill (relative to the scroll row, which is the offsetParent)
  // and position the sliding indicator under it.
  const measureIndicator = () => {
    const activeEl = pillRefs.current[activeKey];
    if (!activeEl) {
      setIndicator(null);
      return;
    }
    setIndicator({
      left: activeEl.offsetLeft,
      top: activeEl.offsetTop,
      width: activeEl.offsetWidth,
      height: activeEl.offsetHeight
    });
  };

  useLayoutEffect(() => {
    measureIndicator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, categories.length]);

  useEffect(() => {
    window.addEventListener('resize', measureIndicator);
    return () => window.removeEventListener('resize', measureIndicator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // Auto-scroll the active pill into the centre of the pill row only.
  // Deliberately NOT scrollIntoView, which would also scroll the whole page.
  useEffect(() => {
    const activeEl = pillRefs.current[activeKey];
    const container = scrollContainerRef.current;
    if (activeEl && container) {
      const cRect = container.getBoundingClientRect();
      const eRect = activeEl.getBoundingClientRect();
      const delta = (eRect.left + eRect.width / 2) - (cRect.left + cRect.width / 2);
      container.scrollBy({
        left: delta,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    }
  }, [activeKey]);

  const scrollByAmount = (offset) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: offset,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    }
  };

  // Category icons
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
    <div
      className={`relative w-full bg-[#0b0f19]/90 border-b border-emerald-500/20 py-2.5 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 relative flex items-center min-w-0">

        {/* Left Scroll Button (Desktop / larger screens) */}
        <button
          type="button"
          onClick={() => scrollByAmount(-220)}
          className="hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-slate-800/90 border border-emerald-500/30 shadow-md text-emerald-400 hover:text-white hover:bg-emerald-600 hover:border-emerald-500 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 transition-all duration-200 shrink-0 mr-1.5 z-10 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="relative flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth motion-reduce:scroll-auto py-1 px-1 w-full min-w-0"
        >
          {/* Sliding indicator (sits behind the pills) */}
          {indicator && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 rounded-full border-[1.5px] border-emerald-400 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_0_14px_rgba(16,185,129,0.45)] transition-[transform,width,height] duration-300 ease-out motion-reduce:transition-none"
              style={{
                width: indicator.width,
                height: indicator.height,
                transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`
              }}
            />
          )}

          {categories.map((category) => {
            const isObject = typeof category === 'object' && category !== null;
            const categoryId = isObject ? (category.id || category.name) : category;
            const categoryName = isObject ? category.name : category;
            const customIcon = isObject ? category.icon : null;

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
                aria-pressed={isSelected}
                onClick={() => onSelectCategory && onSelectCategory(categoryId)}
                className={`group relative z-10 inline-flex items-center gap-2 h-11 min-h-11 px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-semibold tracking-tight text-slate-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] transition-[color,background-color,border-color,transform] duration-300 ease-out shrink-0 select-none cursor-pointer active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  isSelected
                    ? 'border border-transparent text-white font-bold'
                    : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 hover:-translate-y-px motion-reduce:hover:translate-y-0 text-slate-200'
                }`}
              >
                <span className="text-base leading-none transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                  {icon}
                </span>
                <span className="whitespace-nowrap font-medium tracking-tight">
                  {categoryName}
                </span>

                {count !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold font-mono leading-none transition-colors duration-300 ${
                      isSelected ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-700 text-slate-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-300'
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
          className="hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-slate-800/90 border border-emerald-500/30 shadow-md text-emerald-400 hover:text-white hover:bg-emerald-600 hover:border-emerald-500 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 transition-all duration-200 shrink-0 ml-1.5 z-10 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
