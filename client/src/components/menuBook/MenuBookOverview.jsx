import React, { useMemo } from 'react';
import '../../styles/menu-book-overview.css';
import { getSectionPageNumber, partitionOverviewSections } from './buildSpreads.js';

const RESTAURANT_NAME = 'WORLDPLATE';
const TAGLINE = 'Taste the Tradition, Served Fresh Daily';

// Format price like '$15' for whole numbers or '$14.50' for decimals
const formatPrice = (value, currency = '$') => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(num)) return '';
  return num % 1 === 0 ? `${currency}${num}` : `${currency}${num.toFixed(2)}`;
};

const dishName = (dish) => dish?.title || dish?.name || 'Dish';

// Sections come from the menu page as { categoryKey, ... }; older callers pass
// { key, ... }. Accept both so the page-jump keeps working either way.
const sectionKeyOf = (section) => section?.key ?? section?.categoryKey;

/** Decorative corner filigree for classic vintage fine dining */
const VintageCornerAccents = () => (
  <>
    <span className="mbo-corner mbo-corner--tl" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#d4af37]" fill="currentColor">
        <path d="M2 2h9v2H4v7H2V2z" />
        <circle cx="8" cy="8" r="1.5" />
      </svg>
    </span>
    <span className="mbo-corner mbo-corner--tr" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#d4af37]" fill="currentColor">
        <path d="M22 2h-9v2h7v7h2V2z" />
        <circle cx="16" cy="8" r="1.5" />
      </svg>
    </span>
    <span className="mbo-corner mbo-corner--bl" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#d4af37]" fill="currentColor">
        <path d="M2 22h9v-2H4v-7H2v9z" />
        <circle cx="8" cy="16" r="1.5" />
      </svg>
    </span>
    <span className="mbo-corner mbo-corner--br" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#d4af37]" fill="currentColor">
        <path d="M22 22h-9v-2h7v-7h2v9z" />
        <circle cx="16" cy="16" r="1.5" />
      </svg>
    </span>
  </>
);

/** Small decorative gold divider above and below category headers */
const DecorativeGoldDivider = ({ position = 'above' }) => (
  <div className={`mbo-cat-divider mbo-cat-divider--${position}`} aria-hidden="true">
    <span className="mbo-cat-divider__flourish">✦</span>
    <span className="mbo-cat-divider__line" />
    <span className="mbo-cat-divider__mark">◆</span>
    <span className="mbo-cat-divider__line" />
    <span className="mbo-cat-divider__flourish">✦</span>
  </div>
);

/**
 * Two-Page Fine Dining Menu Layout for 'WORLDPLATE'
 *
 * Implements:
 * 1. Zig-Zag / Alternating Layout:
 *    - Category 1 at top-left (e.g. APPETIZERS)
 *    - Category 2 slightly lower on the right side (e.g. SPECIAL STEAK)
 *    - Category 3 at middle-left (e.g. DESSERTS)
 *    - Category 4 at lower-right (e.g. BEVERAGES)
 * 2. Content Structure:
 *    - 'Food Item Name ................. $15'
 * 3. Visual Style & Aesthetic:
 *    - Vintage parchment page with dark green borders and gold corner accents
 *    - Prominent category headers with decorative gold dividers above & below
 *    - Clean serif typography (Playfair Display)
 *
 * Props:
 *  - page: 1 | 2 | ...
 *  - sections: [{ key|categoryKey, title, items: [{ id, title|name, price }] }]
 *  - pageSections: optional slice of sections assigned to this overview page
 *  - totalPages: total number of overview directory pages (default 2)
 *  - spreads: [{ left, right }] (optional spread model for exact page numbering)
 *  - onGoToSection(sectionKey, pageNumber)
 *  - onGoToDish(dish, sectionKey)
 *  - onSelectItem(dish) / onSelectDish(dish)
 *  - onDishHover(dish, rect)
 *  - onDishHoverEnd()
 */
export default function MenuBookOverview({
  page = 1,
  sections = [],
  pageSections = null,
  totalPages = 2,
  spreads = [],
  onGoToSection,
  onGoToDish,
  onSelectItem,
  onSelectDish,
  onDishHover,
  onDishHoverEnd,
}) {
  const safeSections = useMemo(
    () => (Array.isArray(sections) ? sections.filter(Boolean) : []),
    [sections]
  );

  // Determine which sections belong to this page
  const displaySections = useMemo(() => {
    if (Array.isArray(pageSections) && pageSections.length > 0) {
      return pageSections.filter(Boolean);
    }
    const partitions = partitionOverviewSections(safeSections);
    const pageIndex = Math.max(0, page - 1);
    return partitions[pageIndex] || [];
  }, [pageSections, safeSections, page]);

  // Organize categories into the Zig-Zag / Alternating pattern:
  // Top-Left (Category 1) -> Slightly Lower Right (Category 2)
  // Middle-Left (Category 3) -> Lower-Right (Category 4)
  const { leftColumnSections, rightColumnSections } = useMemo(() => {
    if (displaySections.length === 2) {
      const hasDessert = displaySections.find((s) => /dessert/i.test(s.title || s.key || ''));
      const hasBev = displaySections.find((s) => /beverag|drink|cocktail/i.test(s.title || s.key || ''));

      if (hasDessert && hasBev) {
        return {
          leftColumnSections: [hasDessert],
          rightColumnSections: [hasBev],
        };
      }

      return {
        leftColumnSections: [displaySections[0]],
        rightColumnSections: [displaySections[1]],
      };
    }

    if (displaySections.length >= 3) {
      const appetiz = displaySections.find((s) => /appetiz|starter|wing/i.test(s.title || s.key || '')) || displaySections[0];
      const steak = displaySections.find((s) => /steak|main/i.test(s.title || s.key || '')) || displaySections[1];
      const dessert = displaySections.find((s) => /dessert/i.test(s.title || s.key || '')) || displaySections[2];
      const bev = displaySections.find((s) => /beverag|drink|cocktail/i.test(s.title || s.key || '')) || displaySections[3];

      const left = [appetiz, dessert].filter(Boolean);
      const right = [steak, bev].filter(Boolean);

      // Insert any extra section (like Pizza Special) under Steak in the right column
      displaySections.forEach((s) => {
        if (!left.includes(s) && !right.includes(s)) {
          right.splice(1, 0, s);
        }
      });

      return {
        leftColumnSections: left,
        rightColumnSections: right,
      };
    }

    return {
      leftColumnSections: displaySections,
      rightColumnSections: [],
    };
  }, [displaySections]);

  const go = (key, targetPage) => {
    if (typeof onGoToSection === 'function') onGoToSection(key, targetPage);
  };

  const handleDishClick = (item, section) => {
    if (typeof onSelectItem === 'function') {
      onSelectItem(item);
    } else if (typeof onGoToDish === 'function') {
      onGoToDish(item, sectionKeyOf(section));
    } else if (typeof onSelectDish === 'function') {
      onSelectDish(item);
    } else {
      go(sectionKeyOf(section));
    }
  };

  const isFirstPage = page === 1;

  // Render a Category Group with prominent title, gold dividers above/below, and food items with dotted leaders
  const renderCategory = (section) => {
    if (!section) return null;
    const secKey = sectionKeyOf(section);
    const pageNumber = getSectionPageNumber(section, spreads, safeSections);
    const title = (section.title || 'Untitled').toUpperCase();
    const items = Array.isArray(section.items) ? section.items : [];

    return (
      <section key={secKey ?? title} className="mbo-category-group" aria-label={title}>
        {/* Prominent Category Header with Gold Dividers Above and Below */}
        <div className="mbo-category-heading-group">
          <DecorativeGoldDivider position="above" />
          <button
            type="button"
            className="mbo-category-title-btn"
            onClick={() => go(secKey, pageNumber)}
            title={`Jump to ${title} section (page ${pageNumber})`}
            aria-label={`${title}, see section on page ${pageNumber}`}
          >
            <h2 className="mbo-category-header">{title}</h2>
          </button>
          <DecorativeGoldDivider position="below" />
        </div>

        {/* Food Items with 'Food Item Name ................. $15' format */}
        {items.length === 0 ? (
          <p className="mbo-empty-text">Selections coming soon.</p>
        ) : (
          <ul className="mbo-item-list" aria-label={`Food items in ${title}`}>
            {items.map((item, idx) => {
              const name = dishName(item);
              const price = formatPrice(item?.price);

              return (
                <li key={item?.id ?? idx} className="mbo-item-wrapper">
                  <button
                    type="button"
                    className="mbo-menu-row"
                    onClick={() => handleDishClick(item, section)}
                    onMouseEnter={(e) =>
                      onDishHover?.(item, e.currentTarget.getBoundingClientRect())
                    }
                    onMouseLeave={() => onDishHoverEnd?.()}
                    onFocus={(e) =>
                      onDishHover?.(item, e.currentTarget.getBoundingClientRect())
                    }
                    onBlur={() => onDishHoverEnd?.()}
                    aria-label={`View recipe, photos & order ${name}, ${price}`}
                    title={`Click to view ${name} details & order`}
                  >
                    <span className="mbo-dish-name">{name}</span>
                    <span className="mbo-dotted-leader" aria-hidden="true" />
                    <span className="mbo-dish-price">{price}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="mb-sheet mbo-page">
      {/* Outer Fine Dining Frame with Dark Green Border and Gold Corner Accents */}
      <div className="mbo-sheet-frame">
        <VintageCornerAccents />

        {/* Vintage Restaurant Title Header */}
        {isFirstPage ? (
          <header className="mbo-title">
            <p className="mbo-title__eyebrow">EST. 1924 &bull; FINE DINING &bull; BILL OF FARE</p>
            <h1 className="mbo-title__name">{RESTAURANT_NAME}</h1>
            <div className="mbo-rule" aria-hidden="true">
              <span className="mbo-rule__mark">◆</span>
            </div>
            <p className="mbo-title__tagline">{TAGLINE}</p>
          </header>
        ) : (
          <header className="mbo-title mbo-title--subsequent">
            <p className="mbo-title__eyebrow">EST. 1924 &bull; FINE DINING &bull; BILL OF FARE</p>
            <h2 className="mbo-title__subname">{RESTAURANT_NAME}</h2>
            <div className="mbo-rule" aria-hidden="true">
              <span className="mbo-rule__mark">◆</span>
            </div>
            <p className="mbo-title__tagline">The Tasting Selections &bull; Continued</p>
          </header>
        )}

        {/* Zig-Zag / Alternating Menu Grid */}
        <main className="mbo-contents">
          {displaySections.length === 0 ? (
            <p className="mbo-empty">Menu selections coming soon.</p>
          ) : (
            <div className="mbo-zigzag-grid">
              {/* Left Column (Category 1 at top-left, Category 3 at middle-left) */}
              <div className="mbo-column mbo-column--left">
                {leftColumnSections.map((sec) => renderCategory(sec))}
              </div>

              {/* Right Column (Category 2 slightly lower on right, Category 4 at lower-right) */}
              <div className="mbo-column mbo-column--right">
                {rightColumnSections.map((sec) => renderCategory(sec))}
              </div>
            </div>
          )}
        </main>

        {/* Classic Footer */}
        <footer className="mbo-foot">
          <span className="mbo-foot__rule" aria-hidden="true" />
          <p className="mbo-foot__text">
            {page < totalPages
              ? 'Tap any dish for details \u2022 Turn page for more selections'
              : 'Tap any dish for details \u2022 Bon App\u00E9tit'}
          </p>
        </footer>
      </div>
    </div>
  );
}
