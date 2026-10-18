import React from 'react';

const PAPER = '#0f2f22';
const INK = '#f5efe0';
const GOLD = '#d4af37';

const formatPrice = (value, currency = '$') => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return `${currency}${Number.isFinite(num) ? num.toFixed(2) : '0.00'}`;
};

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Open-menu-book overview. Page 1 = cover + table of contents,
 * Page 2 = "Chef's picks". Purely presentational.
 *
 * Props:
 *  - page: 1 | 2
 *  - sections: [{ key, title, items: [{ title|name, price, image }] }]
 *  - onGoToSection(sectionKey)
 */
export default function MenuBookOverview({ page = 1, sections = [], onGoToSection }) {
  const safeSections = Array.isArray(sections) ? sections.filter(Boolean) : [];
  const go = (key) => {
    if (typeof onGoToSection === 'function') onGoToSection(key);
  };

  const pageStyle = {
    backgroundColor: PAPER,
    color: INK,
    padding: '24px',
    boxSizing: 'border-box',
  };

  const hairline = { height: '1px', backgroundColor: GOLD, opacity: 0.6 };

  const shell = 'relative flex flex-col w-full h-full min-h-[560px] md:w-[360px] md:h-[560px] md:min-h-0 md:mx-auto overflow-hidden rounded-lg shadow-2xl';

  if (page === 2) {
    const picks = safeSections
      .filter((s) => Array.isArray(s.items) && s.items.length > 0)
      .slice(0, 4)
      .map((s) => ({ section: s, item: s.items[0] }));

    return (
      <div className={shell} style={pageStyle}>
        <header className="text-center">
          <p className="font-display text-xs tracking-[0.3em] uppercase" style={{ color: GOLD }}>
            Chef's picks
          </p>
          <div className="mx-auto mt-3" style={{ ...hairline, width: '48px' }} />
        </header>

        {picks.length === 0 ? (
          <p className="mt-10 text-center text-sm opacity-70">No featured dishes yet.</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 flex-1 content-start">
            {picks.map(({ section, item }, i) => {
              const name = item.title || item.name || 'Dish';
              return (
                <li key={section.key ?? i}>
                  <button
                    type="button"
                    onClick={() => go(section.key)}
                    className="flex w-full min-h-[44px] flex-col items-stretch text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={name}
                        className="aspect-square w-full rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="aspect-square w-full rounded"
                        style={{ backgroundColor: '#17402f', border: `1px solid ${GOLD}` }}
                      />
                    )}
                    <span className="mt-2 block truncate text-sm font-medium" style={{ color: INK }}>
                      {name}
                    </span>
                    <span className="block text-xs" style={{ color: GOLD }}>
                      {formatPrice(item.price)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-auto pt-4">
          <div style={hairline} />
          <p className="mt-3 text-center text-[11px] italic opacity-70">Tap a dish to see details</p>
        </div>
      </div>
    );
  }

  // Page 1: cover + table of contents
  return (
    <div className={shell} style={pageStyle}>
      <header className="text-center">
        <h1 className="font-display text-3xl font-semibold tracking-wide" style={{ color: GOLD }}>
          WorldPlate
        </h1>
        <p className="mt-2 text-sm italic opacity-80">Taste the tradition, served fresh daily</p>
        <div className="mx-auto mt-4" style={{ ...hairline, width: '64px' }} />
      </header>

      <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Table of contents">
        {safeSections.length === 0 ? (
          <p className="text-center text-sm opacity-70">Menu coming soon.</p>
        ) : (
          <ol className="divide-y" style={{ borderColor: GOLD }}>
            {safeSections.map((section, i) => {
              const count = Array.isArray(section.items) ? section.items.length : 0;
              return (
                <li key={section.key ?? i} style={{ borderColor: 'rgba(212,175,55,0.35)' }}>
                  <button
                    type="button"
                    onClick={() => go(section.key)}
                    className="flex w-full min-h-[44px] items-center gap-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                  >
                    <span className="font-display text-sm tabular-nums" style={{ color: GOLD }}>
                      {pad2(i + 1)}
                    </span>
                    <span className="flex-1 text-base" style={{ color: INK }}>
                      {section.title || 'Untitled'}
                    </span>
                    <span className="text-xs opacity-70">
                      {count} {count === 1 ? 'dish' : 'dishes'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </nav>

      <div className="mt-auto pt-4 text-center text-[11px] opacity-60">
        <div style={hairline} />
        <p className="mt-3">Contents</p>
      </div>
    </div>
  );
}
