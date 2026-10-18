import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { buildSpreads, findPageForItem } from './buildSpreads.js';
import useBookFlip3D from './useBookFlip3D.js';
import MenuBookTurningLeaf from './MenuBookTurningLeaf.jsx';
import MenuBookOverview from './MenuBookOverview.jsx';
import MenuBookDetail from './MenuBookDetail.jsx';
import MenuBookShowcasePage from './MenuBookShowcasePage.jsx';
import MenuBookRightPage from './MenuBookRightPage.jsx';
import useBookParallax from './useBookParallax.js';
import useBookSwipe from './useBookSwipe.js';
import MenuBookDogEar from './MenuBookDogEar.jsx';
import useBookSound from './useBookSound.js';
import { Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../styles/menu-book-flip.css';
import '../../styles/menu-book-3d-flip.css';
import '../../styles/menu-book-depth.css';
import '../../styles/menu-book-responsive.css';
import '../../styles/menu-book-a11y.css';
import '../../styles/menu-book-classic.css';
import '../../styles/menu-book-3d.css';
import '../../styles/menu-book-interactive.css';
import '../../styles/menu-book-showcase.css';
import '../../styles/menu-book-drinks.css';

// The floating hover preview lives in its own component. It is picked up with a
// glob instead of a direct import so the book still builds while that component
// is being added; once the file exists this resolves to its default export.
const hoverPreviewModules = import.meta.glob('./DishHoverPreview.jsx', { eager: true });
const DishHoverPreview = Object.values(hoverPreviewModules)[0]?.default || null;

const PAPER = 'bg-[#0f2f22] text-[#f5efe0]';

// The verso (left) leaf of the spread is bare, unlit paper: no content at all.
const BLANK_PAGE = { type: 'blank' };

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
  const sourceSpreads = useMemo(() => buildSpreads(sections), [sections]);

  // Real menu books in the reference photo keep the left-hand leaf completely
  // dark and empty and print everything on the right-hand leaf. So the paired
  // spreads coming out of buildSpreads() are flattened back into their real
  // pages, and every page gets a spread of its own: blank verso + content recto.
  // The reading order is unchanged, it just advances one page per turn.
  const spreads = useMemo(() => {
    const flat = [];
    sourceSpreads.forEach((sp) => {
      if (sp?.left && sp.left.type !== 'blank') flat.push(sp.left);
      if (sp?.right && sp.right.type !== 'blank') flat.push(sp.right);
    });
    if (flat.length === 0) flat.push(BLANK_PAGE);
    return flat.map((page) => ({ left: BLANK_PAGE, right: page }));
  }, [sourceSpreads]);

  const spreadCount = Math.max(spreads.length, 1);
  const flip = useBookFlip3D(spreadCount, { initial: 0 });
  const {
    currentSpreadIndex,
    targetSpreadIndex,
    spreadIndex,
    direction,
    canPrev,
    canNext,
    next,
    prev,
    goTo,
    isFlipping,
    onFlipEnd,
  } = flip;

  const [selectedDish, setSelectedDish] = useState(null);

  // Hover preview state, reported by the content page (or by the item rows
  // rendered here) and handed to DishHoverPreview.
  const [hoverPreview, setHoverPreview] = useState({ dish: null, rect: null });

  const {
    isMuted,
    toggleMute,
    playPageFlip,
    playDogEarCue,
  } = useBookSound();

  // Phones show a single leaf. That leaf is always the content (right) page -
  // the blank verso is never the page on screen.
  const [isPhone, setIsPhone] = useState(false);

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

  const currentSpread = spreads[currentSpreadIndex] || { left: BLANK_PAGE, right: BLANK_PAGE };
  const targetSpread = targetSpreadIndex !== null && spreads[targetSpreadIndex]
    ? spreads[targetSpreadIndex]
    : currentSpread;

  // Stationary left/right pages during the 3D flip on desktop:
  const leftDisplayPage = BLANK_PAGE;

  const rightDisplayPage = !isPhone && isFlipping && direction === 'next'
    ? targetSpread.right
    : currentSpread.right;

  const turningFrontPage = isFlipping
    ? (direction === 'next' ? currentSpread.right : BLANK_PAGE)
    : null;

  const turningBackPage = isFlipping
    ? (direction === 'next' ? BLANK_PAGE : targetSpread.right)
    : null;

  // One content page per spread, and it is always the recto.
  const visibleSide = 'right';

  // Desktop (md+) always shows both halves; on phone only the content leaf.
  const leftVisibility = isPhone ? 'hidden' : 'block';
  const rightVisibility = 'block';

  const clearHover = useCallback(() => {
    setHoverPreview((prevState) => (prevState.dish === null ? prevState : { dish: null, rect: null }));
  }, []);

  const handleDishHover = useCallback((dish, rect) => {
    if (!dish) { clearHover(); return; }
    setHoverPreview({ dish, rect: rect || null });
  }, [clearHover]);

  const handleDishHoverEnd = useCallback(() => {
    clearHover();
  }, [clearHover]);

  const canPrevPage = canPrev;
  const canNextPage = canNext;
  const dotCount = spreadCount;
  const activeDot = spreadIndex;

  const turnPrev = useCallback(() => {
    setSelectedDish(null);
    clearHover();
    playPageFlip('prev');
    prev();
  }, [prev, playPageFlip, clearHover]);

  const turnNext = useCallback(() => {
    setSelectedDish(null);
    clearHover();
    playPageFlip('next');
    next();
  }, [next, playPageFlip, clearHover]);

  const viewMode = 'flat';
  const { containerRef } = useBookParallax({ enabled: false });

  const swipeHandlers = useBookSwipe({
    onSwipeLeft: turnNext,
    onSwipeRight: turnPrev,
    enabled: !isFlipping,
  });

  const jumpTo = useCallback((i) => {
    if (i === spreadIndex) return;
    setSelectedDish(null);
    clearHover();
    playPageFlip(i > spreadIndex ? 'next' : 'prev');
    goTo(i);
  }, [goTo, spreadIndex, playPageFlip, clearHover]);

  const goToSection = useCallback((sectionKey, targetPageNumber) => {
    const section = sections.find((s) => (s.categoryKey ?? s.key) === sectionKey || s.title === sectionKey);
    const key = section ? (section.categoryKey ?? section.key) : sectionKey;
    const normKey = String(key || sectionKey || '').toLowerCase();

    const matchesPage = (page) => {
      if (!page) return false;
      if (page.type === 'items') {
        return page.sectionKey === key || page.sectionTitle === section?.title;
      }
      if (page.type === 'showcase') {
        return page.sectionKey === key ||
          normKey.includes('starter') || normKey.includes('appetiz') ||
          normKey.includes('chicken') || normKey.includes('wing');
      }
      if (page.type === 'drinksDessert') {
        return page.sectionKey === key ||
          normKey.includes('beverag') || normKey.includes('drink') ||
          normKey.includes('cocktail') || normKey.includes('mocktail') ||
          normKey.includes('dessert');
      }
      return false;
    };

    let target = spreads.findIndex((sp) => matchesPage(sp.right));

    if (target < 0) {
      const firstItemId = section?.items?.[0]?.id;
      if (firstItemId !== undefined) {
        const pageIdx = findPageForItem(spreads, firstItemId);
        target = typeof pageIdx === 'number' ? pageIdx : pageIdx?.spreadIndex;
      }
    }

    if ((typeof target !== 'number' || target < 0) && typeof targetPageNumber === 'number') {
      target = spreads.findIndex((sp) => sp.right?.pageNumber === targetPageNumber);
      // Pages and spreads are now 1:1, so page N is simply spread N - 1.
      if (target < 0) target = Math.max(0, targetPageNumber - 1);
    }

    if (typeof target !== 'number' || target < 0 || target >= spreads.length) return;
    jumpTo(target);
  }, [sections, spreads, jumpTo]);

  const goToDish = useCallback((item) => {
    if (!item) return;
    const pageIdx = findPageForItem(spreads, item.id);
    const target = typeof pageIdx === 'number' ? pageIdx : pageIdx?.spreadIndex;

    if (typeof target === 'number' && target >= 0 && target < spreads.length) {
      jumpTo(target);
    }
    clearHover();
    setSelectedDish(item);
  }, [spreads, jumpTo, clearHover]);

  const handleAddToCart = useCallback((dish, qty) => {
    onAddToCart?.(dish, qty);
  }, [onAddToCart]);

  // Tapping a dish opens the in-book dish page on the right-hand leaf.
  // The parent's `onSelectDish` is deliberately NOT called: in this app it opens
  // a separate full-screen dish modal, which would stack on top of the book's own
  // dish page. One tap, one view - and that view is the page inside the book.
  const handleSelectItem = useCallback((item) => {
    clearHover();
    setSelectedDish(item);
  }, [clearHover]);

  // The verso leaf: dark, bare paper. No frame, no folio, no dog-ears, nothing
  // focusable - just unlit paper with a little light rolling off the spine.
  // The verso leaf: bare paper without content. No frame, no folio, no dog-ears.
  // In dark mode it appears as deep emerald-noir unlit paper; in light mode it
  // appears as warm cream parchment paper matching the recto page.
  // Styling is defined cleanly via .mb-page--blank and .mb-blank-verso-overlay
  // in menu-book-classic.css.
  const renderBlankLeftPage = () => (
    <section
      className="mb-page mb-page-left mb-page--blank relative flex flex-col"
      aria-hidden="true"
      style={{
        transform: 'translateZ(0)',
        minHeight: '100%',
      }}
    >
      <div className="mb-blank-verso-overlay" aria-hidden="true" />
    </section>
  );

  const renderPage = (page, side, { isLeaf = false } = {}) => {
    if (side === 'left') return renderBlankLeftPage();

    // The dish page takes over the content leaf of the spread.
    const showDetail = Boolean(selectedDish);
    const pageNumber = showDetail ? null
      : typeof page?.pageNumber === 'number' ? page.pageNumber
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
        <MenuBookOverview
          page={page.index}
          sections={sections}
          pageSections={page.sections}
          totalPages={page.totalOverviewPages || 2}
          spreads={spreads}
          onGoToSection={goToSection}
          onGoToDish={goToDish}
          onSelectItem={handleSelectItem}
          onSelectDish={handleSelectItem}
          onDishHover={handleDishHover}
          onDishHoverEnd={handleDishHoverEnd}
        />
      );
    } else if (page.type === 'showcase') {
      content = (
        <MenuBookShowcasePage
          titleUpper={page.titleUpper || 'CHICKEN'}
          titleLower={page.titleLower || 'Wings'}
          titleScript={page.titleScript || 'Wings'}
          dishTop={page.dishTop}
          dishBottom={page.dishBottom}
          dishes={page.dishes}
          onSelectDish={handleSelectItem}
          onSelectItem={handleSelectItem}
          onDishHover={handleDishHover}
          onDishHoverEnd={handleDishHoverEnd}
          pageNumber={page.pageNumber}
        />
      );
    } else if (page.type === 'drinksDessert') {
      content = (
        <MenuBookRightPage
          cart={cart}
          onSelectDish={handleSelectItem}
          onSelectItem={handleSelectItem}
          onAddToCart={handleAddToCart}
          onDishHover={handleDishHover}
          onDishHoverEnd={handleDishHoverEnd}
          cocktails={page.cocktails}
          mocktails={page.mocktails}
          desserts={page.desserts}
          pageNumber={page.pageNumber}
        />
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

          <ul className="flex flex-col gap-1.5">
            {page.items.map((item) => {
              const inCart = cart?.[item.id]?.quantity ?? 0;
              const img = dishImage(item);
              const isSelected = selectedDish?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={(e) => handleDishHover(item, e.currentTarget.getBoundingClientRect())}
                    onMouseLeave={handleDishHoverEnd}
                    onFocus={(e) => handleDishHover(item, e.currentTarget.getBoundingClientRect())}
                    onBlur={handleDishHoverEnd}
                    className={`mb-entry${isSelected ? ' is-selected' : ''}`}
                  >
                    <span className="mb-entry__thumb">
                      {img ? (
                        <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <span className="mb-entry__initial" aria-hidden="true">
                          {(item.name || 'D').charAt(0).toUpperCase()}
                        </span>
                      )}
                      {inCart > 0 && <span className="mb-entry__count">{inCart}</span>}
                    </span>
                    <span className="mb-entry__content">
                      <span className="mb-entry__header">
                        <span className="mb-entry__name">{item.name}</span>
                        {/* Dotted leader linking the dish to its price, as on a classic printed menu */}
                        <span className="mb-entry__leader" aria-hidden="true" />
                        <span className="mb-entry__price">{formatPrice(item.price)}</span>
                      </span>
                    </span>
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

    // Only the outer (right-hand) corners carry dog-ears now: the inner corners
    // sit on the spine, and the blank verso stays untouched. Previous-page
    // navigation lives in the toolbar arrow, the left tap zone, swipe and keys.
    const showRightDogEars = !isLeaf && !showDetail && canNextPage;

    const isSpecialLayout = (page?.type === 'showcase' || page?.type === 'drinksDessert') && !showDetail;
    const pagePadding = isSpecialLayout ? 'p-0' : 'p-4 sm:p-5 md:p-6';
    const pageBg = isSpecialLayout ? 'bg-[#0c120f] text-[#f5efe0]' : `${PAPER}`;

    return (
      <section
        className={`mb-page mb-page-${side} ${pageBg} relative flex flex-col ${pagePadding} shadow-inner`}
        data-detail={showDetail ? 'true' : undefined}
        style={hitTestFix}
      >
        {/* Mobile Binding Spine Crease with Stitch Perforations */}
        {isPhone && !isLeaf && (
          <div className={`mb-spine-crease-mobile mb-spine-crease-mobile--${side}`} aria-hidden="true">
            <span className="mb-spine-crease-line" />
            <span className="mb-spine-crease-stitches" />
          </div>
        )}

        {/* Interactive 3D Corner Dog-Ears for Page Turning */}
        {showRightDogEars && (
          <>
            <MenuBookDogEar
              corner="top-right"
              onClick={turnNext}
              onHover={playDogEarCue}
              disabled={isFlipping || !canNextPage}
              ariaLabel="Turn to next page"
            />
            <MenuBookDogEar
              corner="bottom-right"
              onClick={turnNext}
              onHover={playDogEarCue}
              disabled={isFlipping || !canNextPage}
              ariaLabel="Turn to next page"
            />
          </>
        )}

        {/* Keyed so switching between the list and a dish page starts at the top */}
        <div key={showDetail ? `detail-${selectedDish.id}` : (page?.type || 'list')} className="flex-1 overflow-y-auto">
          {content}
        </div>
        {pageNumber !== null && !isSpecialLayout && (
          <div className="mt-4 text-center text-xs tracking-widest text-[#8a6d1d]">
            {pageNumber}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="mb-root w-full flex flex-col items-center gap-4 py-4 select-none">
      {/* Top Navigation & 3D Perspective Controls */}
      <div className="mb-toolbar flex items-center justify-between w-full max-w-5xl px-2 sm:px-4">
        {/* Previous page button with icon sign (no text) */}
        <button
          type="button"
          onClick={turnPrev}
          disabled={!canPrevPage}
          aria-label="Previous page"
          title="Previous page"
          className="mb-top-arrow-btn mb-top-arrow--prev min-h-[44px] min-w-[44px] w-11 h-11 rounded-full bg-[#d4af37] text-[#064e3b] flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
        </button>

        {/* Center controls: Page Counter and Sound Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          {/* Page Counter Badge */}
          <div className="flex items-center px-3.5 py-1.5 rounded-full bg-[#03231a]/85 border border-[#d4af37]/35 text-[#d4af37] text-xs font-semibold tracking-wider uppercase shadow-md">
            <span>{`Page ${activeDot + 1} of ${dotCount}`}</span>
          </div>

          {/* Sound Effect Mute/Unmute Toggle */}
          <div className="mb-sound-toggle">
            <button
              type="button"
              onClick={toggleMute}
              className={`mb-sound-btn ${!isMuted ? 'mb-sound-btn--active' : ''}`}
              title={isMuted ? 'Unmute paper turn sound effects' : 'Mute paper turn sound effects'}
              aria-label={isMuted ? 'Turn page sound effects on' : 'Turn page sound effects off'}
              aria-pressed={!isMuted}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#d4af37]" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound'}</span>
            </button>
          </div>
        </div>

        {/* Next page button with icon sign (no text) */}
        <button
          type="button"
          onClick={turnNext}
          disabled={!canNextPage}
          aria-label="Next page"
          title="Next page"
          className="mb-top-arrow-btn mb-top-arrow--next min-h-[44px] min-w-[44px] w-11 h-11 rounded-full bg-[#d4af37] text-[#064e3b] flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
        </button>
      </div>

      <div className="mb-3d-stage-wrapper w-full flex justify-center">
        <div
          ref={containerRef}
          data-view={viewMode}
          className="mb-book mb-3d-book relative w-full max-w-5xl rounded-2xl p-2 sm:p-4 border border-[#d4af37]/50"
        >
          {/* Perimeter stitched seam with gold thread accent */}
          <div className="mb-stitched-seam" aria-hidden="true" />

          {/* Ornate gold metallic corner brackets with rivets */}
          <div className="mb-gold-corner mb-gold-corner--tl" aria-hidden="true"><span className="mb-gold-rivet" /></div>
          <div className="mb-gold-corner mb-gold-corner--tr" aria-hidden="true"><span className="mb-gold-rivet" /></div>
          <div className="mb-gold-corner mb-gold-corner--bl" aria-hidden="true"><span className="mb-gold-rivet" /></div>
          <div className="mb-gold-corner mb-gold-corner--br" aria-hidden="true"><span className="mb-gold-rivet" /></div>

          {/* Desktop: blank verso on the left, the menu page on the right.
              Phone: only the menu page. One page per turn either way. */}
          <div className="mb-stage mb-3d-stage relative" data-side={visibleSide} {...swipeHandlers}>
            {/* Hardcover squares / backing boards */}
            <div className="mb-3d-cover-left" aria-hidden="true" />
            <div className="mb-3d-cover-right" aria-hidden="true" />

            {/* 3D stacked paper page edges */}
            <div className="mb-paper-stack-left" aria-hidden="true" />
            <div className="mb-paper-stack-right" aria-hidden="true" />
            <div className="mb-paper-stack-bottom" aria-hidden="true" />

            <div className={`mb-spread mb-spread-left mb-spread--blank ${leftVisibility} md:block`}>
              {renderPage(leftDisplayPage, 'left')}
              {!isPhone && isFlipping && direction === 'next' && (
                <div className="mb-cast-shadow mb-cast-next" aria-hidden="true" />
              )}
            </div>
            <div className={`mb-spread mb-spread-right ${rightVisibility} md:block`}>
              {renderPage(rightDisplayPage, 'right')}
              {!isPhone && isFlipping && direction === 'prev' && (
                <div className="mb-cast-shadow mb-cast-prev" aria-hidden="true" />
              )}
            </div>

            {/* 3D Dual-Sided Turning Leaf */}
            {!isPhone && isFlipping && direction && (
              <MenuBookTurningLeaf
                direction={direction}
                frontPage={turningFrontPage}
                backPage={turningBackPage}
                renderPage={(pg, s) => renderPage(pg, s, { isLeaf: true })}
                onAnimationEnd={onFlipEnd}
              />
            )}

            {/* Center leather spine hinge with gold debossed ribs and deep crease */}
            <div className="mb-spine mb-3d-spine" aria-hidden="true">
              <span className="mb-spine-headband" />
              <span className="mb-spine-rib mb-spine-rib--1" />
              <span className="mb-spine-rib mb-spine-rib--2" />
              <span className="mb-spine-rib mb-spine-rib--3" />
              <span className="mb-spine-rib mb-spine-rib--4" />
              <span className="mb-spine-rib mb-spine-rib--5" />
              <span className="mb-spine-tailband" />
            </div>

            {/* Non-obtrusive mobile edge tap zones */}
            <button
              type="button"
              aria-label="Previous page"
              className="mb-tap-zone mb-tap-prev"
              onClick={turnPrev}
              disabled={!canPrevPage}
            />
            <button
              type="button"
              aria-label="Next page"
              className="mb-tap-zone mb-tap-next"
              onClick={turnNext}
              disabled={!canNextPage}
            />
          </div>

          <div className="mb-controls mt-4 flex items-center justify-center gap-3">
            <div className="mb-dots flex items-center gap-2 flex-wrap justify-center">
              {/* One dot per page: pages and spreads are 1:1 now. */}
              {Array.from({ length: dotCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to page ${i + 1}`}
                  aria-current={i === activeDot ? 'true' : undefined}
                  onClick={() => jumpTo(i)}
                  className="mb-dot min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <span
                    className={`block h-2.5 rounded-full transition-all ${
                      i === activeDot ? 'w-6 bg-[#d4af37]' : 'w-2.5 bg-[#d4af37]/40'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Floating hover preview, fed by whichever content page reports a hover */}
          {DishHoverPreview && (
            <DishHoverPreview dish={hoverPreview.dish} anchorRect={hoverPreview.rect} />
          )}
        </div>
      </div>
    </div>
  );
}
