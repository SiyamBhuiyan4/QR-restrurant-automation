import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  // Same currency and precision as the overview page and the dish page.
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : String(price);
}

// `onSelectDish` is accepted for backwards compatibility but intentionally
// unused: dish details are shown on a page inside the book (see handleSelectItem).
export default function MenuBook({ sections = [], cart = {}, onAddToCart, onSelectDish }) {
  const spreads = useMemo(() => buildSpreads(sections), [sections]);
  const spreadCount = Math.max(spreads.length, 1);
  const flip = useBookFlip(spreadCount, { initial: 0 });
  const { spreadIndex, direction, canPrev, canNext, next, prev, goTo, isFlipping, onFlipEnd } = flip;

  const [selectedDish, setSelectedDish] = useState(null);

  // Phone shows one leaf at a time, so it has to walk left page -> right page ->
  // next spread. Desktop keeps the two-page spread untouched.
  const [isPhone, setIsPhone] = useState(false);
  const [phoneSide, setPhoneSide] = useState('left');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(max-width: 767.98px)');
    const sync = (e) => setIsPhone(e.matches);
    setIsPhone(mq.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  // Flat reading order of the real (non-blank) pages, used only on phone.
  const pages = useMemo(() => {
    const list = [];
    spreads.forEach((sp, i) => {
      if (sp?.left && sp.left.type !== 'blank') list.push({ spreadIndex: i, side: 'left' });
      if (sp?.right && sp.right.type !== 'blank') list.push({ spreadIndex: i, side: 'right' });
    });
    return list;
  }, [spreads]);

  const spread = spreads[spreadIndex] || { left: null, right: null };

  let phoneIndex = pages.findIndex((p) => p.spreadIndex === spreadIndex && p.side === phoneSide);
  if (phoneIndex < 0) phoneIndex = Math.max(pages.findIndex((p) => p.spreadIndex === spreadIndex), 0);
  const phonePage = pages[phoneIndex];
  const visibleSide = phonePage ? phonePage.side : 'left';

  // Desktop (md+) always shows both halves; on phone only the current leaf.
  const leftVisibility = !isPhone || visibleSide === 'left' ? 'block' : 'hidden';
  const rightVisibility = !isPhone || visibleSide === 'right' ? 'block' : 'hidden';

  const goToPage = useCallback((index) => {
    const target = pages[index];
    if (!target) return;
    setSelectedDish(null);
    setPhoneSide(target.side);
    if (target.spreadIndex !== spreadIndex) goTo(target.spreadIndex);
  }, [pages, spreadIndex, goTo]);

  const canPrevPage = isPhone ? phoneIndex > 0 : canPrev;
  const canNextPage = isPhone ? phoneIndex < pages.length - 1 : canNext;
  const dotCount = isPhone ? Math.max(pages.length, 1) : spreadCount;
  const activeDot = isPhone ? phoneIndex : spreadIndex;

  const turnPrev = useCallback(() => {
    setSelectedDish(null);
    if (isPhone) { goToPage(phoneIndex - 1); return; }
    prev();
  }, [isPhone, goToPage, phoneIndex, prev]);

  const turnNext = useCallback(() => {
    setSelectedDish(null);
    if (isPhone) { goToPage(phoneIndex + 1); return; }
    next();
  }, [isPhone, goToPage, phoneIndex, next]);

  const jumpTo = useCallback((i) => {
    setSelectedDish(null);
    setPhoneSide('left');
    goTo(i);
  }, [goTo]);

  const goToSection = useCallback((sectionKey) => {
    const section = sections.find((s) => (s.categoryKey ?? s.key) === sectionKey);
    const firstItemId = section?.items?.[0]?.id;
    if (firstItemId === undefined) return;
    const pageIdx = findPageForItem(spreads, firstItemId);
    // findPageForItem may return a spread index or a page descriptor; accept both.
    const target = typeof pageIdx === 'number' ? pageIdx : pageIdx?.spreadIndex;
    if (typeof target !== 'number' || target < 0) return;
    if (isPhone) {
      // Land on the exact leaf that holds the dish, not just its spread.
      const sp = spreads[target];
      const onLeft = sp?.left?.type === 'items'
        && sp.left.items.some((item) => item.id === firstItemId);
      const idx = pages.findIndex((p) => p.spreadIndex === target && p.side === (onLeft ? 'left' : 'right'));
      if (idx >= 0) { goToPage(idx); return; }
    }
    jumpTo(target);
  }, [sections, spreads, jumpTo, isPhone, pages, goToPage]);

  const handleAddToCart = useCallback((dish, qty) => {
    onAddToCart?.(dish, qty);
  }, [onAddToCart]);

  // Tapping a dish opens the in-book dish page on the right-hand leaf.
  // The parent's `onSelectDish` is deliberately NOT called: in this app it opens
  // a separate full-screen dish modal, which would stack on top of the book's own
  // dish page. One tap, one view - and that view is the page inside the book.
  const handleSelectItem = useCallback((item) => {
    setSelectedDish(item);
  }, []);

  const turnClass = (side) => {
    if (!isFlipping) return '';
    if (direction === 'next' && side === 'right') return 'mb-turn-next';
    if (direction === 'prev' && side === 'left') return 'mb-turn-prev';
    return '';
  };

  const renderPage = (page, side) => {
    const turning = turnClass(side);
    // The dish page takes over the right leaf of the spread, even if that leaf is
    // the blank padding page at the end of the book. On phone only one leaf is on
    // screen, so the dish page takes over whichever leaf that is.
    const showDetail = Boolean(selectedDish) && side === (isPhone ? visibleSide : 'right');
    const pageNumber = showDetail ? null
      : page?.type === 'items' ? page.pageNumber
      : page?.type === 'overview' ? page.index : null;

    let content = null;
    if (showDetail) {
      content = (
        <MenuBookDetail
          dish={selectedDish}
          cartQuantity={cart?.[selectedDish.id]?.quantity ?? 0}
          onAddToCart={handleAddToCart}
          onBack={() => setSelectedDish(null)}
        />
      );
    } else if (!page || page.type === 'blank') {
      content = <div className="flex-1" />;
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

    // The desktop spread leans its two halves toward the spine with rotateY()
    // inside a transform-style: preserve-3d stage. Chromium then hit-tests
    // everything in that 3D subtree against the scrolling wrapper instead of the
    // real element, so dish rows and the dish page's buttons silently swallow
    // every click. Giving each page its own flattened layer restores normal hit
    // testing and is a visual no-op (translateZ(0) is the identity transform);
    // the page-turn keyframes still override this inline style mid-flip, so the
    // 3D turn is unchanged.
    const hitTestFix = { transform: 'translateZ(0)' };

    return (
      <section
        className={`mb-page mb-page-${side} ${PAPER} relative flex flex-col p-5 sm:p-6 shadow-inner ${turning}`}
        data-detail={showDetail ? 'true' : undefined}
        style={hitTestFix}
        onAnimationEnd={turning ? (e) => { if (e.target === e.currentTarget) onFlipEnd?.(); } : undefined}
      >
        {/* Keyed so switching between the list and a dish page starts at the top */}
        <div key={showDetail ? `detail-${selectedDish.id}` : 'list'} className="flex-1 overflow-y-auto">
          {content}
        </div>
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
        {/* Desktop: two pages side by side. Phone: one leaf at a time, stepping
            page 1 -> page 2 -> each dish page. */}
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
            disabled={!canPrevPage}
          />
          <button
            type="button"
            aria-label="Next page"
            className="mb-tap-zone mb-tap-next absolute right-0 top-0 h-full w-8 z-10 bg-transparent"
            onClick={turnNext}
            disabled={!canNextPage}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={turnPrev}
            disabled={!canPrevPage}
            className="min-h-[44px] min-w-[44px] px-4 rounded-full bg-[#d4af37] text-[#064e3b] font-semibold disabled:opacity-40"
          >
            Previous
          </button>

          <div className="mb-dots flex items-center gap-2 flex-wrap justify-center">
            {/* One dot per spread on desktop, one per page on phone. */}
            {Array.from({ length: dotCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={isPhone ? `Go to page ${i + 1}` : `Go to spread ${i + 1}`}
                aria-current={i === activeDot ? 'true' : undefined}
                onClick={() => (isPhone ? goToPage(i) : jumpTo(i))}
                className={`mb-dot min-h-[44px] min-w-[44px] flex items-center justify-center`}
              >
                <span
                  className={`block h-2.5 rounded-full transition-all ${
                    i === activeDot ? 'w-6 bg-[#d4af37]' : 'w-2.5 bg-[#d4af37]/40'
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={turnNext}
            disabled={!canNextPage}
            className="min-h-[44px] min-w-[44px] px-4 rounded-full bg-[#d4af37] text-[#064e3b] font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
