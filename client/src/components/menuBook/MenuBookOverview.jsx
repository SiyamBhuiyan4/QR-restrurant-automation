import React, { useMemo } from 'react';
import '../../styles/menu-book-overview.css';
import { getSectionPageNumber } from './buildSpreads.js';

const RESTAURANT_NAME = 'WORLDPLATE';
const TAGLINE = 'Taste the Tradition, Served Fresh Daily';

// Same currency and precision as the dish pages and the dish detail page.
const formatPrice = (value, currency = '$') => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? `${currency}${num.toFixed(2)}` : '';
};

const pad2 = (n) => String(n).padStart(2, '0');

const dishImage = (dish) => dish?.image || dish?.imageUrl || dish?.img || null;

const dishName = (dish) => dish?.title || dish?.name || 'Dish';

// Sections come from the menu page as { categoryKey, ... }; older callers pass
// { key, ... }. Accept both so the page-jump keeps working either way.
const sectionKeyOf = (section) => section?.key ?? section?.categoryKey;

/** Ornamental vintage rule: hairline, gold lozenge with subtle flourishes. */
const DecorativeVintageDivider = () => (
  <div className="mbo-rule" aria-hidden="true">
    <span className="mbo-rule__flourish">✦</span>
    <span className="mbo-rule__mark" />
    <span className="mbo-rule__flourish">✦</span>
  </div>
);

/** Centred, uppercase serif heading flanked by decorative rules. */
const Heading = ({ children, className = '' }) => (
  <header className={`mb-heading ${className}`.trim()}>
    <span className="mb-heading__rule" aria-hidden="true" />
    <h2 className="mb-heading__title">{children}</h2>
    <span className="mb-heading__rule" aria-hidden="true" />
  </header>
);

/**
 * Open-menu-book overview:
 * Page 1 = Elegant vintage title "WORLDPLATE", subtitle "Taste the Tradition, Served Fresh Daily",
 *          decorative vintage divider, and Table of Contents with page numbers and dotted leader lines.
 * Page 2 = "Chef's Specials" showcase with appetizing photo previews and direct dish links.
 *
 * Props:
 *  - page: 1 | 2
 *  - sections: [{ key|categoryKey, title, items: [{ id, title|name, price, image }] }]
 *  - spreads: [{ left, right }] (optional spread model for exact page numbering)
 *  - onGoToSection(sectionKey, pageNumber)
 *  - onGoToDish(dish, sectionKey)
 *  - onSelectItem(dish) / onSelectDish(dish)
 */
export default function MenuBookOverview({
  page = 1,
  sections = [],
  spreads = [],
  onGoToSection,
  onGoToDish,
  onSelectItem,
  onSelectDish,
}) {
  const safeSections = useMemo(
    () => (Array.isArray(sections) ? sections.filter(Boolean) : []),
    [sections]
  );

  const go = (key, targetPage) => {
    if (typeof onGoToSection === 'function') onGoToSection(key, targetPage);
  };

  const handleDishClick = (item, section) => {
    if (typeof onGoToDish === 'function') {
      onGoToDish(item, sectionKeyOf(section));
    } else if (typeof onSelectItem === 'function') {
      onSelectItem(item);
    } else if (typeof onSelectDish === 'function') {
      onSelectDish(item);
    } else {
      go(sectionKeyOf(section));
    }
  };

  // ---------------------------------------------------------------------------
  // Page 2: Chef's Specials Showcase
  // ---------------------------------------------------------------------------
  if (page === 2) {
    // Select up to 4 appetizing chef's specials across categories
    const picks = (() => {
      const list = [];
      const seenIds = new Set();

      // Priority 1: Pick marked popular/signature dish per section
      for (const s of safeSections) {
        if (list.length >= 4) break;
        const items = Array.isArray(s.items) ? s.items : [];
        const special = items.find(
          (it) => (it.isPopular || it.isSignature || it.isChefSpecial) && !seenIds.has(it.id)
        );
        if (special) {
          seenIds.add(special.id);
          list.push({ section: s, item: special });
        }
      }

      // Priority 2: Fill up to 4 from first items of remaining sections
      if (list.length < 4) {
        for (const s of safeSections) {
          if (list.length >= 4) break;
          const items = Array.isArray(s.items) ? s.items : [];
          const first = items.find((it) => !seenIds.has(it.id));
          if (first) {
            seenIds.add(first.id);
            list.push({ section: s, item: first });
          }
        }
      }

      return list;
    })();

    return (
      <div className="mb-sheet mbo-page">
        <Heading>Chef&apos;s Specials</Heading>
        <p className="mbo-note">Hand-crafted signature creations, prepared fresh daily</p>

        {picks.length === 0 ? (
          <p className="mbo-empty">No featured specials yet.</p>
        ) : (
          <ul className="mbo-picks">
            {picks.map(({ section, item }, i) => {
              const name = dishName(item);
              const img = dishImage(item);
              const price = formatPrice(item?.price);
              const kicker = (section?.title || 'SPECIAL').toUpperCase();

              return (
                <li key={item?.id ?? sectionKeyOf(section) ?? i}>
                  <button
                    type="button"
                    className="mbo-pick"
                    onClick={() => handleDishClick(item, section)}
                    aria-label={`View ${name}, ${price}`}
                  >
                    <span className="mbo-pick__frame">
                      {img ? (
                        <img src={img} alt={name} loading="lazy" className="mbo-pick__img" />
                      ) : (
                        <span className="mbo-pick__placeholder" aria-hidden="true">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="mbo-pick__badge">Chef&apos;s Special</span>
                    </span>
                    <span className="mbo-pick__kicker">{kicker}</span>
                    <span className="mbo-pick__name">{name}</span>
                    <span className="mbo-pick__row">
                      <span className="mb-entry__leader mbo-pick__leader" aria-hidden="true" />
                      <span className="mb-entry__price mbo-pick__price">{price}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mbo-foot">
          <span className="mbo-foot__rule" aria-hidden="true" />
          <p className="mbo-foot__text">Tap any special to view recipe & order</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Page 1: Elegant Vintage Cover Title & Table of Contents
  // ---------------------------------------------------------------------------
  return (
    <div className="mb-sheet mbo-page">
      <header className="mbo-title">
        <p className="mbo-title__eyebrow">EST. 1924 &bull; FINE DINING &bull; BILL OF FARE</p>
        <h1 className="mbo-title__name">{RESTAURANT_NAME}</h1>
        <DecorativeVintageDivider />
        <p className="mbo-title__tagline">{TAGLINE}</p>
      </header>

      <Heading className="mbo-heading">Table of Contents</Heading>

      <nav className="mbo-contents" aria-label="Table of contents">
        {safeSections.length === 0 ? (
          <p className="mbo-empty">Menu coming soon.</p>
        ) : (
          <ol className="mbo-list">
            {safeSections.map((section, i) => {
              const pageNumber = getSectionPageNumber(section, spreads, safeSections);
              const title = (section.title || 'Untitled').toUpperCase();

              return (
                <li key={sectionKeyOf(section) ?? i}>
                  <button
                    type="button"
                    className="mb-entry mbo-entry"
                    onClick={() => go(sectionKeyOf(section), pageNumber)}
                    aria-label={`${title}, page ${pageNumber}`}
                  >
                    <span className="mbo-entry__num" aria-hidden="true">
                      {pad2(i + 1)}
                    </span>
                    <span className="mb-entry__name mbo-entry__title">
                      {title}
                    </span>
                    <span className="mb-entry__leader" aria-hidden="true" />
                    <span className="mb-entry__price mbo-entry__page">
                      p.&nbsp;{pad2(pageNumber)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {safeSections.length > 0 && <DecorativeVintageDivider />}
      </nav>

      <div className="mbo-foot">
        <span className="mbo-foot__rule" aria-hidden="true" />
        <p className="mbo-foot__text">Please turn the page &bull; Bon App&eacute;tit</p>
      </div>
    </div>
  );
}
