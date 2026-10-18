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
        sectionKey: section.key,
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
