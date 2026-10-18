/**
 * Pure helpers that turn menu sections into the page/spread model of the
 * open-menu-book view. No React, no side effects; dish objects are passed
 * through by reference and never modified.
 *
 * Page model:
 *   { type: 'overview', index }                                    (pages 1-2)
 *   { type: 'items', sectionKey, sectionTitle, items, pageNumber } (item pages)
 *   { type: 'blank' }                                              (end padding)
 */

/**
 * Build the spreads (left/right page pairs) for the menu book.
 * @param {{key: string, title: string, items: object[]}[]} sections
 * @param {{itemsPerPage?: number}} [opts]
 * @returns {{left: object, right: object}[]}
 */
export function buildSpreads(sections, opts = {}) {
  const requested = Math.floor(Number(opts.itemsPerPage));
  const perPage = requested > 0 ? requested : 4;

  // Spread 0 is always the two overview pages (cover/index and categories).
  const pages = [
    { type: 'overview', index: 1 },
    { type: 'overview', index: 2 },
  ];

  // Item pages are numbered by their physical position in the book, so the
  // first item page is page 3.
  for (const section of sections || []) {
    const items = Array.isArray(section.items) ? section.items : [];
    // Chunk per section so no page mixes two sections.
    for (let i = 0; i < items.length; i += perPage) {
      pages.push({
        type: 'items',
        sectionKey: section.key ?? section.categoryKey,
        sectionTitle: section.title,
        items: items.slice(i, i + perPage),
        pageNumber: pages.length + 1,
      });
    }
  }

  // Pair pages into spreads; pad the final spread with a blank page if odd.
  if (pages.length % 2 === 1) pages.push({ type: 'blank' });

  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({ left: pages[i], right: pages[i + 1] });
  }
  return spreads;
}

/**
 * Count the real pages in a set of spreads (blank padding is not counted).
 * @param {{left: object, right: object}[]} spreads
 * @returns {number}
 */
export function pageCountOf(spreads) {
  let count = 0;
  for (const spread of spreads || []) {
    if (spread.left && spread.left.type !== 'blank') count++;
    if (spread.right && spread.right.type !== 'blank') count++;
  }
  return count;
}

/**
 * Find which spread contains the item with the given id.
 * @param {{left: object, right: object}[]} spreads
 * @param {*} itemId
 * @returns {number} spread index, or -1 if not found
 */
export function findPageForItem(spreads, itemId) {
  const hasItem = (page) =>
    !!page && page.type === 'items' && page.items.some((item) => item.id === itemId);
  for (let i = 0; i < (spreads || []).length; i++) {
    if (hasItem(spreads[i].left) || hasItem(spreads[i].right)) return i;
  }
  return -1;
}

/**
 * Find the starting page number for a given section.
 * @param {object} section
 * @param {{left: object, right: object}[]} [spreads]
 * @param {object[]} [sections]
 * @returns {number} 1-based page number
 */
export function getSectionPageNumber(section, spreads, sections) {
  const key = section?.key ?? section?.categoryKey;
  if (Array.isArray(spreads) && spreads.length > 0) {
    for (const spread of spreads) {
      if (
        spread.left?.type === 'items' &&
        (spread.left.sectionKey === key || spread.left.sectionTitle === section?.title)
      ) {
        return spread.left.pageNumber;
      }
      if (
        spread.right?.type === 'items' &&
        (spread.right.sectionKey === key || spread.right.sectionTitle === section?.title)
      ) {
        return spread.right.pageNumber;
      }
    }
  }

  if (Array.isArray(sections)) {
    let pg = 3;
    for (const s of sections) {
      if ((s.key ?? s.categoryKey) === key) return pg;
      const count = Array.isArray(s.items) ? s.items.length : 0;
      pg += Math.max(1, Math.ceil(count / 4));
    }
    return pg;
  }

  return 3;
}
