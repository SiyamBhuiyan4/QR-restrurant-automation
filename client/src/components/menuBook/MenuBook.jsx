import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { buildSpreads, pageCountOf, findPageForItem } from './buildSpreads.js';
import useBookFlip3D from './useBookFlip3D.js';
import MenuBookTurningLeaf from './MenuBookTurningLeaf.jsx';
import MenuBookOverview from './MenuBookOverview.jsx';
import MenuBookDetail from './MenuBookDetail.jsx';
import useBookParallax from './useBookParallax.js';
import useBookSwipe from './useBookSwipe.js';
import MenuBookDogEar from './MenuBookDogEar.jsx';
import useBookSound from './useBookSound.js';
import { Box, BookOpen, Sparkles, Volume2, VolumeX } from 'lucide-react';
import '../../styles/menu-book-flip.css';
import '../../styles/menu-book-3d-flip.css';
import '../../styles/menu-book-depth.css';
import '../../styles/menu-book-responsive.css';
import '../../styles/menu-book-a11y.css';
import '../../styles/menu-book-classic.css';
import '../../styles/menu-book-3d.css';
import '../../styles/menu-book-interactive.css';

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

  const {
    isMuted,
    volume,
    toggleMute,
    setVolume,
    playPageFlip,
    playDogEarCue,
  } = useBookSound();

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

  const currentSpread = spreads[currentSpreadIndex] || { left: null, right: null };
  const targetSpread = targetSpreadIndex !== null && spreads[targetSpreadIndex]
    ? spreads[targetSpreadIndex]
    : currentSpread;

  const spread = currentSpread;

  // Stationary left/right pages during 3D flip on desktop:
  const leftDisplayPage = !isPhone && isFlipping && direction === 'prev'
    ? targetSpread.left
    : currentSpread.left;

  const rightDisplayPage = !isPhone && isFlipping && direction === 'next'
    ? targetSpread.right
    : currentSpread.right;

  const turningFrontPage = isFlipping
    ? (direction === 'next' ? currentSpread.right : currentSpread.left)
    : null;

  const turningBackPage = isFlipping
    ? (direction === 'next' ? targetSpread.left : targetSpread.right)
    : null;

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
    if (index !== phoneIndex) {
      playPageFlip(index > phoneIndex ? 'next' : 'prev');
    }
    if (target.spreadIndex !== spreadIndex) goTo(target.spreadIndex);
  }, [pages, spreadIndex, goTo, phoneIndex, playPageFlip]);

  const canPrevPage = isPhone ? phoneIndex > 0 : canPrev;
  const canNextPage = isPhone ? phoneIndex < pages.length - 1 : canNext;
  const dotCount = isPhone ? Math.max(pages.length, 1) : spreadCount;
  const activeDot = isPhone ? phoneIndex : spreadIndex;

  const turnPrev = useCallback(() => {
    setSelectedDish(null);
    playPageFlip('prev');
    if (isPhone) { goToPage(phoneIndex - 1); return; }
    prev();
  }, [isPhone, goToPage, phoneIndex, prev, playPageFlip]);

  const turnNext = useCallback(() => {
    setSelectedDish(null);
    playPageFlip('next');
    if (isPhone) { goToPage(phoneIndex + 1); return; }
    next();
  }, [isPhone, goToPage, phoneIndex, next, playPageFlip]);

  const { containerRef, viewMode, setViewMode } = useBookParallax({ enabled: true });

  const swipeHandlers = useBookSwipe({
    onSwipeLeft: turnNext,
    onSwipeRight: turnPrev,
    enabled: !isFlipping,
  });

  const jumpTo = useCallback((i) => {
    if (i === spreadIndex) return;
    setSelectedDish(null);
    setPhoneSide('left');
    playPageFlip(i > spreadIndex ? 'next' : 'prev');
    goTo(i);
  }, [goTo, spreadIndex, playPageFlip]);

  const goToSection = useCallback((sectionKey, targetPageNumber) => {
    const section = sections.find((s) => (s.categoryKey ?? s.key) === sectionKey || s.title === sectionKey);
    const key = section ? (section.categoryKey ?? section.key) : sectionKey;

    let target = spreads.findIndex((sp) =>
      (sp.left?.type === 'items' && (sp.left.sectionKey === key || sp.left.sectionTitle === section?.title)) ||
      (sp.right?.type === 'items' && (sp.right.sectionKey === key || sp.right.sectionTitle === section?.title))
    );

    if (target < 0) {
      const firstItemId = section?.items?.[0]?.id;
      if (firstItemId !== undefined) {
        const pageIdx = findPageForItem(spreads, firstItemId);
        target = typeof pageIdx === 'number' ? pageIdx : pageIdx?.spreadIndex;
      }
    }

    if ((typeof target !== 'number' || target < 0) && typeof targetPageNumber === 'number') {
      target = spreads.findIndex((sp) =>
        sp.left?.pageNumber === targetPageNumber || sp.right?.pageNumber === targetPageNumber
      );
      if (target < 0) {
        target = Math.max(0, Math.floor((targetPageNumber - 1) / 2));
      }
    }

    if (typeof target !== 'number' || target < 0 || target >= spreads.length) return;

    if (isPhone) {
      const sp = spreads[target];
      const onLeft = sp?.left?.type === 'items'
        && (sp.left.sectionKey === key || (section?.items?.[0]?.id && sp.left.items?.some((item) => item.id === section.items[0].id)));
      const idx = pages.findIndex((p) => p.spreadIndex === target && p.side === (onLeft ? 'left' : 'right'));
      if (idx >= 0) { goToPage(idx); return; }
    }
    jumpTo(target);
  }, [sections, spreads, jumpTo, isPhone, pages, goToPage]);

  const goToDish = useCallback((item, sectionKey) => {
    if (!item) return;
    const pageIdx = findPageForItem(spreads, item.id);
    const target = typeof pageIdx === 'number' ? pageIdx : pageIdx?.spreadIndex;

    if (typeof target === 'number' && target >= 0 && target < spreads.length) {
      if (isPhone) {
        const sp = spreads[target];
        const onLeft = sp?.left?.type === 'items'
          && sp.left.items?.some((it) => it.id === item.id);
        const idx = pages.findIndex((p) => p.spreadIndex === target && p.side === (onLeft ? 'left' : 'right'));
        if (idx >= 0) {
          goToPage(idx);
          setSelectedDish(item);
          return;
        }
      }
      jumpTo(target);
      setSelectedDish(item);
    } else {
      setSelectedDish(item);
    }
  }, [spreads, isPhone, pages, goToPage, jumpTo]);

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

  const renderPage = (page, side, { isLeaf = false } = {}) => {
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
        <MenuBookOverview
          page={page.index}
          sections={sections}
          spreads={spreads}
          onGoToSection={goToSection}
          onGoToDish={goToDish}
          onSelectItem={handleSelectItem}
          onSelectDish={handleSelectItem}
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
              const isVeg = item.isVeg === true || item.veg === true;
              const isSpicy = item.isSpicy === true || item.spicy === true;
              const isPopular = item.isPopular === true || item.popular === true;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectItem(item)}
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
                      {isVeg && !isSpicy && (
                        <span className="mb-entry__thumb-badge mb-entry__thumb-badge--veg" title="Vegetarian">V</span>
                      )}
                      {isSpicy && (
                        <span className="mb-entry__thumb-badge mb-entry__thumb-badge--spicy" title="Spicy">🌶</span>
                      )}
                    </span>
                    <span className="mb-entry__content">
                      <span className="mb-entry__header">
                        <span className="mb-entry__name">{item.name}</span>
                        {(isVeg || isSpicy || isPopular) && (
                          <span className="mb-entry__badges">
                            {isVeg && <span className="mb-badge mb-badge--veg" title="Vegetarian">Veg</span>}
                            {isSpicy && <span className="mb-badge mb-badge--spicy" title="Spicy">Spicy</span>}
                            {isPopular && <span className="mb-badge mb-badge--popular" title="Chef's Pick">Chef&apos;s Pick</span>}
                          </span>
                        )}
                        {/* Dotted leader linking the dish to its price, as on a printed menu */}
                        <span className="mb-entry__leader" aria-hidden="true" />
                        <span className="mb-entry__price">{formatPrice(item.price)}</span>
                      </span>
                      {item.description ? (
                        <span className="mb-entry__desc">{item.description}</span>
                      ) : null}
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

    const showLeftDogEars = !isLeaf && !showDetail && (isPhone
      ? visibleSide === side && canPrevPage
      : side === 'left' && canPrevPage);

    const showRightDogEars = !isLeaf && !showDetail && (isPhone
      ? visibleSide === side && canNextPage
      : side === 'right' && canNextPage);

    return (
      <section
        className={`mb-page mb-page-${side} ${PAPER} relative flex flex-col p-4 sm:p-5 md:p-6 shadow-inner`}
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
        {showLeftDogEars && (
          <>
            <MenuBookDogEar
              corner="top-left"
              onClick={turnPrev}
              onHover={playDogEarCue}
              disabled={isFlipping || !canPrevPage}
              ariaLabel="Turn to previous page"
            />
            <MenuBookDogEar
              corner="bottom-left"
              onClick={turnPrev}
              onHover={playDogEarCue}
              disabled={isFlipping || !canPrevPage}
              ariaLabel="Turn to previous page"
            />
          </>
        )}

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
      {/* 3D Perspective View Toggle Toolbar */}
      <div className="mb-toolbar">
        <div className="flex items-center gap-2">
          <div
            className="mb-view-toggle"
            role="radiogroup"
            aria-label="Book perspective viewing angle"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === '3d'}
              onClick={() => setViewMode('3d')}
              className="mb-view-btn"
              title="3D realistic tabletop perspective with smooth depth"
            >
              <Box className="w-3.5 h-3.5" aria-hidden="true" />
              <span>3D Realistic</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'flat'}
              onClick={() => setViewMode('flat')}
              className="mb-view-btn"
              title="Flat straight-on reading perspective"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Flat Reading</span>
            </button>
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

        <div className="mb-toolbar__hint hidden sm:flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" aria-hidden="true" />
          <span>Click dog-ears or swipe to turn</span>
        </div>
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

          {/* Desktop: two pages side by side. Phone: one leaf at a time, stepping
              page 1 -> page 2 -> each dish page. */}
          <div className="mb-stage mb-3d-stage relative" data-side={visibleSide} {...swipeHandlers}>
            {/* Hardcover squares / backing boards */}
            <div className="mb-3d-cover-left" aria-hidden="true" />
            <div className="mb-3d-cover-right" aria-hidden="true" />

            {/* 3D stacked paper page edges */}
            <div className="mb-paper-stack-left" aria-hidden="true" />
            <div className="mb-paper-stack-right" aria-hidden="true" />
            <div className="mb-paper-stack-bottom" aria-hidden="true" />

            <div className={`mb-spread mb-spread-left ${leftVisibility} md:block`}>
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

            {/* Silk ribbon bookmark hanging from the spine gutter */}
            <div className="mb-ribbon-bookmark" aria-hidden="true" />

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

          <div className="mb-controls mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={turnPrev}
              disabled={!canPrevPage}
              className="mb-btn-turn min-h-[44px] min-w-[80px] px-4 rounded-full bg-[#d4af37] text-[#064e3b] font-semibold disabled:opacity-40 shadow-md hover:brightness-105 active:scale-95 transition-all"
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

            <button
              type="button"
              onClick={turnNext}
              disabled={!canNextPage}
              className="mb-btn-turn min-h-[44px] min-w-[80px] px-4 rounded-full bg-[#d4af37] text-[#064e3b] font-semibold disabled:opacity-40 shadow-md hover:brightness-105 active:scale-95 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
