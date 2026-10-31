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
  // Which way the pill row can still scroll: drives the arrows and the soft edge fades
  const [overflow, setOverflow] = useState({ left: false, right: false });

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

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return undefined;
    const check = () => {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setOverflow((o) => (o.left === left && o.right === right ? o : { left, right }));
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [categories.length]);

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

  return (
    <div
      className={`relative w-full rounded-2xl bg-gradient-to-b from-[#0d2219]/95 to-[#06140e]/95 border border-white/[0.08] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] py-1.5 ${className}`}
    >
      <div className="px-1.5 relative flex items-center min-w-0">

        {/* Left Scroll Button (Desktop / larger screens) */}
        <button
          type="button"
          onClick={() => scrollByAmount(-220)}
          className={`hidden md:flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 transition-all duration-200 shrink-0 mr-1 z-10 cursor-pointer ${overflow.left ? '' : 'md:hidden'}`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            maskImage: `linear-gradient(to right, ${overflow.left ? 'transparent' : '#000'}, #000 28px, #000 calc(100% - 28px), ${overflow.right ? 'transparent' : '#000'})`,
            WebkitMaskImage: `linear-gradient(to right, ${overflow.left ? 'transparent' : '#000'}, #000 28px, #000 calc(100% - 28px), ${overflow.right ? 'transparent' : '#000'})`
          }}
          className="flex items-center overflow-x-auto no-scrollbar scroll-smooth motion-reduce:scroll-auto py-1 px-1 w-full min-w-0"
        >
          {/* Centred while everything fits; scrolls from the left edge once it doesn't */}
          <div className="relative flex items-center gap-1.5 w-max mx-auto">
          {/* Sliding indicator (sits behind the pills) */}
          {indicator && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_6px_18px_-6px_rgba(16,185,129,0.75),inset_0_1px_0_rgba(255,255,255,0.3)] transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
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

            const isSelected = String(activeKey).toLowerCase() === String(categoryId).toLowerCase();

            // Resolve count: from category object, or categoryCounts prop
            const count = isObject && category.count !== undefined
              ? category.count
              : categoryCounts[categoryName] ?? categoryCounts[categoryId];

            // 'SPECIAL STEAK' -> 'Special Steak'
            const displayName = String(categoryName).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <button
                key={categoryId}
                ref={(el) => { pillRefs.current[categoryId] = el; }}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectCategory && onSelectCategory(categoryId)}
                className={`group relative z-10 inline-flex items-center gap-1.5 h-9 pl-3.5 pr-2.5 rounded-full text-[13.5px] tracking-tight transition-[color,background-color] duration-200 ease-out shrink-0 select-none cursor-pointer active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  isSelected
                    ? 'text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06] font-medium'
                }`}
              >
                <span className="whitespace-nowrap">{displayName}</span>
                {count !== undefined && (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10.5px] font-semibold tabular-nums transition-colors duration-200 ${isSelected ? 'bg-black/20 text-white' : 'bg-white/[0.07] text-slate-400 group-hover:text-slate-200'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>

        {/* Right Scroll Button (Desktop / larger screens) */}
        <button
          type="button"
          onClick={() => scrollByAmount(220)}
          className={`hidden md:flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 transition-all duration-200 shrink-0 ml-1 z-10 cursor-pointer ${overflow.right ? '' : 'md:hidden'}`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
