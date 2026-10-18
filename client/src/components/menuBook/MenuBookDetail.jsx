import React, { useEffect, useState } from 'react';

/**
 * One dish rendered as a "page" of the 3D open menu book.
 * Missing fields are tolerated: every access is guarded.
 */
export default function MenuBookDetail({ dish, cartQuantity = 0, onAddToCart, onBack }) {
  const item = dish || {};
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [item.image]);

  const name = item.name || item.title || 'Untitled dish';
  const category = item.category || 'Menu';
  const description = typeof item.description === 'string' ? item.description : '';
  const priceNum = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
  const formattedPrice = `$${priceNum.toFixed(2)}`;
  const isVeg = item.isVeg === true || item.veg === true || (Array.isArray(item.tags) && item.tags.some((t) => /veg/i.test(t)));
  const isSpicy = item.isSpicy === true || item.spicy === true || (Array.isArray(item.tags) && item.tags.some((t) => /spic/i.test(t)));
  const qty = Number(cartQuantity) || 0;
  const showImage = typeof item.image === 'string' && item.image && !imageError;

  const handleAdd = () => {
    if (typeof onAddToCart === 'function') onAddToCart(dish, 1);
  };
  const handleBack = () => {
    if (typeof onBack === 'function') onBack();
  };

  return (
    <article
      className={`mx-auto w-full max-w-md rounded-2xl bg-[#0f2f22] p-5 text-[#f5efe0] shadow-2xl ring-1 ring-[#d4af37]/30 transition-all duration-700 ease-out motion-reduce:transition-none ${
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } motion-reduce:translate-y-0 motion-reduce:opacity-100`}
    >
      {showImage ? (
        <div className="rounded-xl bg-[#06140e] p-1 ring-1 ring-[#d4af37]/60">
          <img
            src={item.image}
            alt={name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="max-h-[40vh] w-full rounded-lg object-cover"
          />
        </div>
      ) : null}

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#f0d27a]">{category}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-3xl font-bold leading-tight text-[#d4af37]">{name}</h2>
      </div>

      {(isVeg || isSpicy) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {isVeg && (
            <span className="rounded-full border border-[#d4af37]/60 px-3 py-1 text-xs font-medium text-[#f0d27a]">Veg</span>
          )}
          {isSpicy && (
            <span className="rounded-full border border-[#d4af37]/60 px-3 py-1 text-xs font-medium text-[#f0d27a]">Spicy</span>
          )}
        </div>
      )}

      {description && <p className="mt-4 text-base leading-relaxed text-[#f5efe0]/85">{description}</p>}

      <p className="mt-4 font-display text-2xl text-[#f0d27a]">{formattedPrice}</p>

      {qty > 0 && (
        <p className="mt-3 text-sm font-medium text-[#f0d27a]">In your order: {qty}</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleAdd}
          className="min-h-12 w-full rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f0d27a] px-6 py-3 text-base font-semibold text-[#06140e] shadow-lg transition hover:brightness-105 active:scale-[0.99] motion-reduce:transition-none motion-reduce:transform-none"
        >
          Order Now
        </button>

        <button
          type="button"
          onClick={handleBack}
          className="mx-auto h-11 rounded-lg border border-[#d4af37] px-5 text-sm font-medium text-[#f0d27a] transition hover:bg-[#d4af37]/10 motion-reduce:transition-none"
        >
          Back to menu
        </button>
      </div>
    </article>
  );
}
