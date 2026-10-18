import React from 'react';
import '../../styles/menu-book-overview.css';

const RESTAURANT_NAME = 'WorldPlate';
const TAGLINE = 'Taste the tradition, served fresh daily';

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

/** Ornamental rule: hairline, gold lozenge, hairline. */
const Rule = () => (
  <div className="mbo-rule" aria-hidden="true">
    <span className="mbo-rule__mark" />
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
 * Open-menu-book overview, set like the printed dish pages: textured paper and
 * the double gold keyline come from .mb-page / .mb-sheet, headings from
 * .mb-heading, and the contents list reuses the .mb-entry dotted leader.
 *
 * Page 1 = title page + table of contents, page 2 = "Chef's picks".
 * Purely presentational.
 *
 * Props:
 *  - page: 1 | 2
 *  - sections: [{ key|categoryKey, title, items: [{ title|name, price, image }] }]
 *  - onGoToSection(sectionKey)
 */
export default function MenuBookOverview({ page = 1, sections = [], onGoToSection }) {
  const safeSections = Array.isArray(sections) ? sections.filter(Boolean) : [];
  const go = (key) => {
    if (typeof onGoToSection === 'function') onGoToSection(key);
  };

  if (page === 2) {
    const picks = safeSections
      .filter((s) => Array.isArray(s.items) && s.items.length > 0)
      .slice(0, 4)
      .map((s) => ({ section: s, item: s.items[0] }));

    return (
      <div className="mb-sheet mbo-page">
        <Heading>Chef&apos;s Picks</Heading>
        <p className="mbo-note">Dishes our kitchen is proudest of</p>

        {picks.length === 0 ? (
          <p className="mbo-empty">No featured dishes yet.</p>
        ) : (
          <ul className="mbo-picks">
            {picks.map(({ section, item }, i) => {
              const name = dishName(item);
              const img = dishImage(item);
              const price = formatPrice(item?.price);
              return (
                <li key={sectionKeyOf(section) ?? i}>
                  <button
                    type="button"
                    className="mbo-pick"
                    onClick={() => go(sectionKeyOf(section))}
                  >
                    <span className="mbo-pick__frame">
                      {img ? (
                        <img src={img} alt="" loading="lazy" className="mbo-pick__img" />
                      ) : (
                        <span className="mbo-pick__placeholder" aria-hidden="true">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="mbo-pick__kicker">{section.title || 'Menu'}</span>
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
          <p className="mbo-foot__text">Tap a dish to see details</p>
        </div>
      </div>
    );
  }

  // Page 1: title page + table of contents
  return (
    <div className="mb-sheet mbo-page">
      <header className="mbo-title">
        <p className="mbo-title__eyebrow">Bill of fare</p>
        <h1 className="mbo-title__name">{RESTAURANT_NAME}</h1>
        <Rule />
        <p className="mbo-title__tagline">{TAGLINE}</p>
      </header>

      <Heading className="mbo-heading">Contents</Heading>

      <nav className="mbo-contents" aria-label="Table of contents">
        {safeSections.length === 0 ? (
          <p className="mbo-empty">Menu coming soon.</p>
        ) : (
          <ol className="mbo-list">
            {safeSections.map((section, i) => {
              const count = Array.isArray(section.items) ? section.items.length : 0;
              return (
                <li key={sectionKeyOf(section) ?? i}>
                  <button
                    type="button"
                    className="mb-entry mbo-entry"
                    onClick={() => go(sectionKeyOf(section))}
                  >
                    <span className="mbo-entry__num" aria-hidden="true">{pad2(i + 1)}</span>
                    <span className="mb-entry__name mbo-entry__title">
                      {section.title || 'Untitled'}
                    </span>
                    <span className="mb-entry__leader" aria-hidden="true" />
                    <span className="mb-entry__price mbo-entry__count">
                      {count}
                      <span className="sr-only"> {count === 1 ? 'dish' : 'dishes'}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {safeSections.length > 0 && <Rule />}
      </nav>

      <div className="mbo-foot">
        <span className="mbo-foot__rule" aria-hidden="true" />
        <p className="mbo-foot__text">Please turn the page</p>
      </div>
    </div>
  );
}
