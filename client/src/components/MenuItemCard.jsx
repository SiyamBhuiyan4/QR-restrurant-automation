import React, { useState } from 'react';
import { 
  Plus, 
  Minus, 
  Leaf, 
  Flame, 
  MessageSquare, 
  UtensilsCrossed, 
  Clock, 
  Check, 
  X,
  Sparkles
} from 'lucide-react';

/**
 * MenuItemCard Component for SmartDine Customer Menu
 * 
 * Features:
 * - Dish image with elegant SVG fallback placeholder
 * - Formatted title, description, and currency price
 * - Dietary badges: Vegetarian (Leaf), Spicy (Flame), Out of stock
 * - Add to Cart / Interactive Quantity Stepper (+ / -)
 * - Dish Customization / Special Note Modal with quick presets
 */
export default function MenuItemCard({
  item,
  cartQuantity = 0,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  itemNote = '',
  onUpdateNote,
  currency = '$',
  onSelectDish
}) {
  const [imageError, setImageError] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [tempNote, setTempNote] = useState(itemNote);

  if (!item) return null;

  const dishTitle = item.title || item.name || 'Delicious Dish';
  const dishDesc = item.description || '';
  const priceNum = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
  const formattedPrice = `${currency}${priceNum.toFixed(2)}`;

  // Determine dietary & availability flags
  const isVeg = item.isVeg === true || item.veg === true || (Array.isArray(item.tags) && item.tags.some(t => /veg/i.test(t)));
  const isSpicy = item.isSpicy === true || item.spicy === true || (Array.isArray(item.tags) && item.tags.some(t => /spic/i.test(t)));
  const isAvailable = item.isAvailable !== false && item.outOfStock !== true && item.available !== false;

  const handleAdd = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    if (onAddToCart) {
      onAddToCart(item);
    } else if (onUpdateQuantity) {
      onUpdateQuantity(item.id, 1);
    }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    if (onUpdateQuantity) {
      onUpdateQuantity(item.id, cartQuantity + 1);
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (cartQuantity <= 1) {
      if (onRemoveFromCart) {
        onRemoveFromCart(item.id);
      } else if (onUpdateQuantity) {
        onUpdateQuantity(item.id, 0);
      }
    } else if (onUpdateQuantity) {
      onUpdateQuantity(item.id, cartQuantity - 1);
    }
  };

  const openNoteModal = (e) => {
    e.stopPropagation();
    setTempNote(itemNote || '');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = () => {
    if (onUpdateNote) {
      onUpdateNote(item.id, tempNote.trim());
    }
    setIsNoteModalOpen(false);
  };

  const quickPresets = [
    'Less spicy',
    'Extra spicy',
    'No onions',
    'No garlic',
    'Sauce on the side',
    'Extra crispy',
    'Allergy alert'
  ];

  const handlePresetClick = (preset) => {
    if (!tempNote) {
      setTempNote(preset);
    } else if (tempNote.includes(preset)) {
      // Remove if already clicked
      setTempNote(tempNote.replace(preset, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim());
    } else {
      setTempNote(`${tempNote}, ${preset}`);
    }
  };

  return (
    <>
      <div
        onClick={() => onSelectDish && onSelectDish(item)}
        className={`group relative flex flex-col justify-between bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 hover:border-amber-500/40 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer ${
          !isAvailable ? 'opacity-65 bg-stone-50/70' : 'hover:-translate-y-1'
        }`}
      >
        <div>
          {/* Dish Image Container with Smooth Hover Zoom */}
          <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
            {item.image && !imageError ? (
              <img
                src={item.image}
                alt={dishTitle}
                onError={() => setImageError(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/40 to-stone-100 text-stone-600 p-4 select-none">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/90 text-amber-700 flex items-center justify-center shadow-xs mb-2">
                  <UtensilsCrossed className="w-6 h-6 stroke-[1.8]" />
                </div>
                <span className="text-xs font-bold text-stone-600 text-center line-clamp-1 tracking-tight">
                  {dishTitle}
                </span>
                <span className="text-[10px] text-amber-700/70 uppercase tracking-widest mt-0.5 font-semibold">
                  Chef Selection
                </span>
              </div>
            )}

            {/* Subtle Gradient Vignette Over Image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none opacity-80 group-hover:opacity-60 transition-opacity duration-500" />

            {/* Glassmorphic Badges Over Image (Top-Left) */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
              {/* Veg Badge */}
              {isVeg && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-xs">
                  <Leaf className="w-3 h-3 fill-current" />
                  Veg
                </span>
              )}

              {/* Spicy Badge */}
              {isSpicy && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 backdrop-blur-md shadow-xs">
                  <Flame className="w-3 h-3 fill-current" />
                  Spicy
                </span>
              )}

              {/* Popular / Chef Special Tag */}
              {item.isPopular && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/85 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-xs">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Popular
                </span>
              )}
            </div>

            {/* Out of Stock Overlay Badge */}
            {!isAvailable && (
              <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center z-20">
                <span className="px-3.5 py-1.5 rounded-xl bg-rose-600/95 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg border border-rose-400/40">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Preparation time badge */}
            {item.prepTime && (
              <div className="absolute bottom-2.5 right-2.5 bg-neutral-950/75 backdrop-blur-md text-stone-200 text-[10px] font-medium px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1 shadow-sm">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{item.prepTime}</span>
              </div>
            )}
          </div>

          {/* Dish Details */}
          <div className="p-4 sm:p-4.5">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="font-extrabold text-stone-900 text-[15px] sm:text-base leading-snug line-clamp-1 group-hover:text-amber-800 transition-colors tracking-tight">
                {dishTitle}
              </h3>
            </div>

            {dishDesc && (
              <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-3.5 font-normal">
                {dishDesc}
              </p>
            )}

            {/* Existing custom note pill */}
            {itemNote && (
              <div
                onClick={openNoteModal}
                className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/90 hover:bg-amber-100 border border-amber-200/90 text-amber-900 text-[11px] font-medium cursor-pointer transition shadow-2xs"
                title="Click to edit special note"
              >
                <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate max-w-[170px]">"{itemNote}"</span>
                <span className="text-amber-600 underline font-semibold text-[10px] ml-0.5">Edit</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions & Price */}
        <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2 border-t border-stone-100/90">
          <div>
            <span className="text-lg sm:text-xl font-black text-stone-900 tracking-tight font-sans">
              {formattedPrice}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Customize / Note Button */}
            {isAvailable && (
              <button
                type="button"
                onClick={openNoteModal}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  itemNote
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-200/80 text-stone-600 hover:text-stone-900'
                }`}
                title="Add special instructions / customize dish"
              >
                <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Note</span>
              </button>
            )}

            {/* Add to Cart OR Quantity Stepper */}
            {!isAvailable ? (
              <button
                disabled
                className="px-3.5 py-1.5 rounded-xl bg-stone-200 text-stone-400 text-xs font-semibold cursor-not-allowed"
              >
                Unavailable
              </button>
            ) : cartQuantity > 0 ? (
              <div className="inline-flex items-center bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 rounded-xl shadow-md shadow-amber-500/25 p-0.5 transition-all ring-1 ring-amber-400/50">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center hover:bg-black/15 active:scale-90 transition-all cursor-pointer font-bold text-neutral-950"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="w-6 sm:w-7 text-center text-xs sm:text-sm font-black text-neutral-950 select-none">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center hover:bg-black/15 active:scale-90 transition-all cursor-pointer font-bold text-neutral-950"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer border border-neutral-900"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dish Customization Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200/90 p-5 sm:p-6 transform transition-all animate-scaleUp">
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center shadow-2xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-stone-900 text-sm leading-tight tracking-tight">
                    Kitchen Instructions
                  </h4>
                  <p className="text-xs text-stone-500 truncate max-w-[200px] mt-0.5">
                    {dishTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="my-3.5">
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-2">
                Quick Preferences:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickPresets.map((preset) => {
                  const isSelected = tempNote.toLowerCase().includes(preset.toLowerCase());
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                          : 'bg-stone-100/80 hover:bg-stone-200/70 text-stone-700 border-stone-200/60'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Note Input */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                Special Dietary or Preparation Note:
              </label>
              <textarea
                rows={3}
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="e.g. Extra spicy, dressing on side, allergy notes..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none transition"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-1">
              {tempNote && (
                <button
                  type="button"
                  onClick={() => setTempNote('')}
                  className="py-2.5 px-3 rounded-xl border border-stone-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
