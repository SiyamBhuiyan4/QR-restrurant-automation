/**
 * Pure helpers that turn menu sections into the page/spread model of the
 * open-menu-book view. No React, no side effects; dish objects are passed
 * through by reference and never modified.
 *
 * Page model:
 *   { type: 'overview', index }                                    (pages 1-2)
 *   { type: 'showcase', ... }                                      (chicken wings showcase left page)
 *   { type: 'drinksDessert', ... }                                 (drinks & dessert right page)
 *   { type: 'items', sectionKey, sectionTitle, items, pageNumber } (item pages)
 *   { type: 'blank' }                                              (end padding)
 */

/**
 * Build the spreads (left/right page pairs) for the menu book.
 * @param {{key: string, title: string, items: object[]}[]} sections
 * @param {{itemsPerPage?: number, includeShowcaseSpread?: boolean}} [opts]
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

  const safeSections = Array.isArray(sections) ? sections : [];

  // Flatten all items to discover showcase wings, cocktails, mocktails, desserts
  const allItems = [];
  for (const s of safeSections) {
    if (Array.isArray(s.items)) {
      allItems.push(...s.items);
    }
  }

  // Find balado and lemonade dishes
  const baladoDish = allItems.find((d) => /balado/i.test(d?.name || d?.title || ''));
  const lemonadeDish = allItems.find((d) => /lemonade/i.test(d?.name || d?.title || ''));

  // Separate cocktails, mocktails, desserts
  const cocktails = allItems.filter(
    (d) =>
      d?.subType === 'cocktail' ||
      /(cocktail)/i.test(d?.category || '') ||
      /(mojito|old fashioned|espresso martini|gin tonic|negroni|whiskey sour)/i.test(d?.name || d?.title || '')
  );
  const mocktails = allItems.filter(
    (d) =>
      d?.subType === 'mocktail' ||
      /(mocktail)/i.test(d?.category || '') ||
      /(virgin mojito|citrus cooler|berry fizz)/i.test(d?.name || d?.title || '')
  );
  const desserts = allItems.filter(
    (d) =>
      /dessert/i.test(d?.category || '') ||
      /(souffl|lava cake|tiramisu|cake|churros|panna cotta)/i.test(d?.name || d?.title || '')
  );

  // Check if we should insert the signature showcase spread (reference image layout)
  const isMultiSection = safeSections.length >= 2;
  const hasAppetizerOrWings = safeSections.some((s) => {
    const k = (s.key ?? s.categoryKey ?? s.canonicalId ?? '').toLowerCase();
    const t = (s.title ?? '').toLowerCase();
    return k.includes('starter') || k.includes('appetiz') || k.includes('wing') || t.includes('appetiz') || t.includes('wing');
  });
  const hasDrinksOrDessert = safeSections.some((s) => {
    const k = (s.key ?? s.categoryKey ?? s.canonicalId ?? '').toLowerCase();
    const t = (s.title ?? '').toLowerCase();
    return k.includes('beverag') || k.includes('drink') || k.includes('dessert') || t.includes('drink') || t.includes('dessert');
  });

  const shouldIncludeShowcase =
    opts.includeShowcaseSpread !== false && (isMultiSection || hasAppetizerOrWings || hasDrinksOrDessert || safeSections.length === 0);

  if (shouldIncludeShowcase) {
    // Spread 1: Left page = Showcase (Chicken Wings), Right page = Drinks & Dessert
    pages.push({
      type: 'showcase',
      pageNumber: pages.length + 1,
      sectionKey: 'starters',
      sectionTitle: 'CHICKEN Wings',
      titleUpper: 'CHICKEN',
      titleLower: 'Wings',
      titleScript: 'Wings',
      dishTop: baladoDish,
      dishBottom: lemonadeDish,
      dishes: [baladoDish, lemonadeDish].filter(Boolean),
    });

    pages.push({
      type: 'drinksDessert',
      pageNumber: pages.length + 1,
      sectionKey: 'beverages',
      sectionTitle: 'DRINKS & DESSERT',
      cocktails: cocktails.length > 0 ? cocktails : undefined,
      mocktails: mocktails.length > 0 ? mocktails : undefined,
      desserts: desserts.length > 0 ? desserts : undefined,
    });
  }

  // Subsequent item pages are numbered by physical position in the book.
  // Chunk per section so no page mixes two sections.
  for (const section of safeSections) {
    const sKey = (section.key ?? section.categoryKey ?? '').toLowerCase();
    let items = Array.isArray(section.items) ? section.items : [];

    // If showcase spread is included, filter out the two showcase dishes from the starter section so we don't duplicate them
    if (shouldIncludeShowcase && (sKey.includes('starter') || sKey.includes('appetiz'))) {
      items = items.filter(
        (it) => it.id !== baladoDish?.id && it.id !== lemonadeDish?.id
      );
    }

    // If showcase spread is included and section is beverages/desserts, check if items were all consumed on page 4
    if (shouldIncludeShowcase && (sKey.includes('beverag') || sKey.includes('drink') || sKey.includes('dessert'))) {
      items = items.filter((it) => {
        const isCoveredCocktail = cocktails.some((c) => c.id === it.id);
        const isCoveredMocktail = mocktails.some((m) => m.id === it.id);
        const isCoveredDessert = desserts.some((d) => d.id === it.id);
        return !isCoveredCocktail && !isCoveredMocktail && !isCoveredDessert;
      });
    }

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
  if (!itemId) return -1;
  const hasItem = (page) => {
    if (!page) return false;
    if (page.type === 'items' && Array.isArray(page.items)) {
      return page.items.some((item) => item.id === itemId);
    }
    if (page.type === 'showcase') {
      if (page.dishTop?.id === itemId || page.bottomDish?.id === itemId || page.dishBottom?.id === itemId) return true;
      if (Array.isArray(page.dishes) && page.dishes.some((d) => d.id === itemId)) return true;
      if (typeof itemId === 'string') {
        const idLower = itemId.toLowerCase();
        if (idLower.includes('balado') && (page.dishTop?.name?.toLowerCase().includes('balado') || page.dishTop?.id?.includes('balado'))) return true;
        if (idLower.includes('lemonade') && (page.dishBottom?.name?.toLowerCase().includes('lemonade') || page.dishBottom?.id?.includes('lemonade'))) return true;
      }
    }
    if (page.type === 'drinksDessert') {
      if (Array.isArray(page.cocktails) && page.cocktails.some((c) => c.id === itemId)) return true;
      if (Array.isArray(page.mocktails) && page.mocktails.some((m) => m.id === itemId)) return true;
      if (Array.isArray(page.desserts) && page.desserts.some((d) => d.id === itemId)) return true;
      if (Array.isArray(page.items) && page.items.some((it) => it.id === itemId)) return true;
      if (typeof itemId === 'string') {
        const idLower = itemId.toLowerCase();
        if (page.cocktails?.some((c) => c.id?.toLowerCase().includes(idLower) || c.name?.toLowerCase().includes(idLower))) return true;
        if (page.mocktails?.some((m) => m.id?.toLowerCase().includes(idLower) || m.name?.toLowerCase().includes(idLower))) return true;
        if (page.desserts?.some((d) => d.id?.toLowerCase().includes(idLower) || d.name?.toLowerCase().includes(idLower))) return true;
      }
    }
    return false;
  };
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
  const key = section?.key ?? section?.categoryKey ?? section?.canonicalId;
  const normKey = String(key || section?.title || '').toLowerCase();

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
      if (
        spread.left?.type === 'showcase' &&
        (spread.left.sectionKey === key || normKey.includes('starter') || normKey.includes('appetiz') || normKey.includes('chicken') || normKey.includes('wing'))
      ) {
        return spread.left.pageNumber;
      }
      if (
        spread.right?.type === 'drinksDessert' &&
        (spread.right.sectionKey === key || normKey.includes('beverag') || normKey.includes('drink') || normKey.includes('cocktail') || normKey.includes('mocktail') || normKey.includes('dessert'))
      ) {
        return spread.right.pageNumber;
      }
    }
  }

  if (Array.isArray(sections)) {
    let pg = 3;
    for (const s of sections) {
      const sKey = (s.key ?? s.categoryKey ?? '').toLowerCase();
      if ((s.key ?? s.categoryKey) === key) return pg;
      if (sKey.includes('starter') || sKey.includes('appetiz')) {
        pg += 2;
      } else {
        const count = Array.isArray(s.items) ? s.items.length : 0;
        pg += Math.max(1, Math.ceil(count / 4));
      }
    }
    return pg;
  }

  return 3;
}
