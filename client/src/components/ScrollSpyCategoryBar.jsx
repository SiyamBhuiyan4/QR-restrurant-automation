import { useEffect, useRef, useState } from 'react';
import CategoryBar from './CategoryBar';

// The customer scrolling by hand (after a pill tap) hands the highlight back to the scroll spy
const RELEASE_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'];

/**
 * The menu's category bar plus its scroll spy. Kept apart from the menu page so that the
 * highlight changing while scrolling re-renders only this bar, not every dish card.
 *
 * In 'All' mode the highlighted pill follows the section under the sticky bar. Positions are
 * read live each frame (only a handful of sections), because cards drawn on demand change
 * section heights while scrolling. Tapping a pill glides to its section; the highlight moves
 * there at once and the spy waits until the customer scrolls by hand, so it doesn't hop
 * through every section on the way. Outside 'All' mode a tap is passed to onSelectCategory
 * (which filters the menu).
 *
 * sections: [{ key, id }] in page order (key = section element suffix, id = pill id)
 */
export default function ScrollSpyCategoryBar({ categories, categoryCounts, selectedCategory, sections, onSelectCategory }) {
  const [active, setActive] = useState('All');
  const pausedRef = useRef(false);

  useEffect(() => {
    if (selectedCategory !== 'All') return undefined;
    let frame = 0;
    let last = null;
    const update = () => {
      frame = 0;
      if (pausedRef.current) return;
      // A section counts once its top passes just below the sticky category bar
      const bar = document.querySelector('.menu-cat-sticky');
      const line = (bar ? bar.getBoundingClientRect().bottom : 120) + 24;
      let currentId = 'All';
      for (const s of sections) {
        const el = document.getElementById(`cat-section-${s.key}`);
        if (el && el.getBoundingClientRect().top <= line) currentId = s.id;
      }
      // At the very bottom the last sections can't reach the line: the last one counts
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && sections.length) currentId = sections[sections.length - 1].id;
      // At the top of the page nothing has been scrolled to yet
      if (window.scrollY < 40) currentId = 'All';
      if (currentId !== last) {
        last = currentId;
        setActive(currentId);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [selectedCategory, sections]);

  const handleSelect = (catId) => {
    const section = sections.find((s) => s.id === catId);
    const el = section && document.getElementById(`cat-section-${section.key}`);
    if (selectedCategory !== 'All' || catId === 'All' || !el) {
      onSelectCategory(catId);
      return;
    }
    // Glide to that section; the spy waits until the customer scrolls by hand
    setActive(catId);
    pausedRef.current = true;
    const release = () => {
      pausedRef.current = false;
      RELEASE_EVENTS.forEach((ev) => window.removeEventListener(ev, release));
    };
    RELEASE_EVENTS.forEach((ev) => window.addEventListener(ev, release, { passive: true }));
    el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <CategoryBar
      categories={categories}
      selectedCategory={selectedCategory === 'All' ? active : selectedCategory}
      onSelectCategory={handleSelect}
      categoryCounts={categoryCounts}
    />
  );
}
