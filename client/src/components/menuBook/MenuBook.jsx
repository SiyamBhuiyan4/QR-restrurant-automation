import React, { useMemo, useState, useCallback } from 'react';
import { buildSpreads, pageCountOf, findPageForItem } from './buildSpreads.js';
import useBookFlip from './useBookFlip.js';
import MenuBookOverview from './MenuBookOverview.jsx';
import MenuBookDetail from './MenuBookDetail.jsx';
import '../../styles/menu-book-flip.css';
import '../../styles/menu-book-depth.css';
import '../../styles/menu-book-responsive.css';
import '../../styles/menu-book-a11y.css';
import '../../styles/menu-book-classic.css';

const PAPER = 'bg-[#0f2f22] text-[#f5efe0]';

function dishImage(dish) {
  return dish?.image || dish?.imageUrl || dish?.img || null;
}

function formatPrice(price) {
  if (price === null || price === undefined || price === '') return '';
  const n = Number(price);
  return Number.isFinite(n) ? `৳${n}` : String(price);
}

export default function MenuBook({ sections = [], cart = {}, onAddToCart, onSelectDish }) {
  const spreads = useMemo(() => buildSpreads(sections), [sections]);
  const spreadCount = Math.max(spreads.length, 1);
  const flip = useBookFlip(spreadCount, { initial: 0 });
  const { spreadIndex, direction, canPrev, canNext, next, prev, goTo, isFlipping, onFlipEnd } = flip;

  const [selectedDish, setSelectedDish] = useState(null);

  const spread = spreads[spreadIndex] || { left: null, right: null };
  // Phone shows one page: the right page when past the cover, otherwise the left.
  // Desktop (md+) always shows both pages.
  const leftVisibility = spreadIndex === 0 ? 'block' : 'hidden';
  const rightVisibility = spreadIndex > 0 ? 'block' : 'hidden';

  const turnPrev = useCallback(() => { setSelectedDish(null); prev(); }, [prev]);
  const turnNext = useCallback(() => { setSelectedDish(null); next(); }, [next]);
  const jumpTo = useCallback((i) => { setSelectedDish(null); goTo(i); }, [goTo]);

  const goToSection = useCallback((sectionKey) => {
    const section = sections.find((s) => (s.categoryKey ?? s.key) === sectionKey);
    const firstItemId = section?.items?.[0]?.id;
    if (firstItemId === undefined) return;
    const pageIdx = findPageForItem(spreads, firstItemId);
    // findPageForItem may return a spread index or a page descriptor; accept both.
    const target = typeof pageIdx === 'number' ? pageIdx : pageIdx?.spreadIndex;
    if (typeof target === 'number') jumpTo(target);
  }, [sections, spreads, jumpTo]);

  const handleAddToCart = useCallback((dish, qty) => {
    onAddToCart?.(dish, qty);
  }, [onAddToCart]);

  const handleSelectItem = useCallback((item) => {
    setSelectedDish(item);
    onSelectDish?.(item);
  }, [onSelectDish]);

  const turnClass = (side) => {
    if (!isFlipping) return '';
    if (direction === 'next' && side === 'right') return 'mb-turn-next';
    if (direction === 'prev' && side === 'left') return 'mb-turn-prev';
    return '';
  };

  const renderPage = (page, side) => {
    const turning = turnClass(side);
    const pageNumber = page?.type === 'items' ? page.pageNumber
      : page?.type === 'overview' ? page.index : null;

    let content = null;
    if (!page || page.type === 'blank') {
      content = <div className="flex-1" />;
    } else if (selectedDish && side === 'right') {
      content = (
        <MenuBookDetail
          dish={selectedDish}
          cartQuantity={cart?.[selectedDish.id]?.quantity ?? 0}
          onAddToCart={handleAddToCart}
          onBack={() => setSelectedDish(null)}
        />
      );
    } else if (page.type === 'overview') {
      content = (
        <MenuBookOverview page={page.index} sections={sections} onGoToSection={goToSection} />
      );
    } else if (page.type === 'items') {
      content = (
        <div className="mb-sheet flex flex-col gap-5">
          {/* Classic menu heading with decorative rules on either side */}
          <header className="mb-heading">
            <span className="mb-heading__rule" aria-hidden="true" />
            <h2 className="mb-heading__title">{page.sectionTitle}</h2>
            <span className="mb-heading__rule" aria-hidden="true" />
          </header>

          <ul className="flex flex-col gap-1">
            {page.items.map((item) => {
              const inCart = cart?.[item.id]?.quantity ?? 0;
              const img = dishImage(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className="mb-entry"
                  >
                    <span className="mb-entry__thumb">
                      {img ? (
                        <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : null}
                      {inCart > 0 && <span className="mb-entry__count">{inCart}</span>}
                    </span>
                    <span className="mb-entry__name">{item.name}</span>
                    {/* Dotted leader linking the dish to its price, as on a printed menu */}
                    <span className="mb-entry__leader" aria-hidden="true" />
                    <span className="mb-entry__price">{formatPrice(item.price)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    return (
      <section
        className={`mb-page mb-page-${side} ${PAPER} relative flex flex-col p-5 sm:p-6 shadow-inner ${turning}`}
        onAnimationEnd={turning ? (e) => { if (e.target === e.currentTarget) onFlipEnd?.(); } : undefined}
      >
        <div className="flex-1 overflow-y-auto">{content}</div>
        {pageNumber !== null && (
          <div className="mt-4 text-center text-xs tracking-widest text-[#8a6d1d]">
            {pageNumber}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="mb-root w-full flex flex-col items-center gap-4 py-4 select-none">
      <div className="mb-book relative w-full max-w-5xl bg-[#064e3b] rounded-2xl p-2 sm:p-4 shadow-2xl border border-[#d4af37]/60">
        {/* Desktop: two pages. Phone: one page (CSS hides the other). */}
        <div className="mb-stage relative">
          <div className={`mb-spread mb-spread-left ${leftVisibility} md:block`}>
            {renderPage(spread.left, 'left')}
          </div>
          <div className={`mb-spread mb-spread-right ${rightVisibility} md:block`}>
            {renderPage(spread.right, 'right')}
          </div>
          <div className="mb-spine" aria-hidden="true" />

          {/* Tap zones on page edges */}
          <button
            type="button"
            aria-label="Previous page"
            className="mb-tap-zone mb-tap-prev absolute left-0 top-0 h-full w-8 z-10 bg-transparent"
            onClick={turnPrev}
            disabled={!canPrev}
          />
          <button
            type="button"
            aria-label="Next page"
            className="mb-tap-zone mb-tap-next absolute right-0 top-0 h-full w-8 z-10 bg-transparent"
            onClick={turnNext}
            disabled={!canNext}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={turnPrev}
            disabled={!canPrev}
            className="min-h-[44px] min-w-[44px] px-4 rounded-full bg-[#d4af37] text-[#064e3b] font-semibold disabled:opacity-40"
          >
            Previous
          </button>

          <div className="mb-dots flex items-center gap-2 flex-wrap justify-center">
            {Array.from({ length: spreadCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to spread ${i + 1}`}
                aria-current={i === spreadIndex ? 'true' : undefined}
                onClick={() => jumpTo(i)}
                className={`mb-dot min-h-[44px] min-w-[44px] flex items-center justify-center`}
              >
                <span
                  className={`block h-2.5 rounded-full transition-all ${
                    i === spreadIndex ? 'w-6 bg-[#d4af37]' : 'w-2.5 bg-[#d4af37]/40'
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={turnNext}
            disabled={!canNext}
            className="min-h-[44px] min-w-[44px] px-4 rounded-full bg-[#d4af37] text-[#064e3b] font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
