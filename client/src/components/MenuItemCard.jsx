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
        className={`group flex flex-col justify-between bg-white rounded-2xl border border-neutral-200/70 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer ${
          !isAvailable ? 'opacity-70 bg-neutral-50/70' : 'hover:-translate-y-0.5'
        }`}
      >
        <div>
          {/* Dish Image Container */}
          <div className="relative aspect-4/3 w-full bg-neutral-100 overflow-hidden">
            {item.image && !imageError ? (
              <img
                src={item.image}
                alt={dishTitle}
                onError={() => setImageError(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700/60 p-4 select-none">
                <div className="w-12 h-12 rounded-full bg-amber-100/80 flex items-center justify-center text-amber-600 mb-2">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-neutral-500 text-center line-clamp-1">
                  {dishTitle}
                </span>
              </div>
            )}

            {/* Badges Over Image */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
              {/* Veg Badge */}
              {isVeg && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-xs backdrop-blur-xs">
                  <Leaf className="w-3 h-3 fill-current" />
                  Veg
                </span>
              )}

              {/* Spicy Badge */}
              {isSpicy && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-xs backdrop-blur-xs">
                  <Flame className="w-3 h-3 fill-current" />
                  Spicy
                </span>
              )}

              {/* Chef Special / Popular tag */}
              {item.isPopular && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-xs backdrop-blur-xs">
                  <Sparkles className="w-3 h-3" />
                  Popular
                </span>
              )}
            </div>

            {/* Out of Stock Overlay Badge */}
            {!isAvailable && (
              <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-2xs flex items-center justify-center z-20">
                <span className="px-3 py-1 rounded-xl bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-md">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Preparation time if available */}
            {item.prepTime && (
              <div className="absolute bottom-2 right-2 bg-neutral-900/75 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {item.prepTime}
              </div>
            )}
          </div>

          {/* Dish Details */}
          <div className="p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-bold text-neutral-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-amber-600 transition-colors">
                {dishTitle}
              </h3>
            </div>

            {dishDesc && (
              <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-3">
                {dishDesc}
              </p>
            )}

            {/* Existing custom note pill */}
            {itemNote && (
              <div
                onClick={openNoteModal}
                className="mb-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 text-[11px] font-medium cursor-pointer transition"
                title="Click to edit special note"
              >
                <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate max-w-[170px]">"{itemNote}"</span>
                <span className="text-amber-500 underline text-[10px] ml-0.5">Edit</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions & Price */}
        <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 flex items-center justify-between gap-2 border-t border-neutral-100/70">
          <div>
            <span className="text-base sm:text-lg font-extrabold text-neutral-900 tracking-tight">
              {formattedPrice}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Customize / Note Button */}
            {isAvailable && (
              <button
                type="button"
                onClick={openNoteModal}
                className={`p-1.5 sm:px-2 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  itemNote
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                }`}
                title="Add special instructions / customize dish"
              >
                <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">Note</span>
              </button>
            )}

            {/* Add to Cart OR Quantity Stepper */}
            {!isAvailable ? (
              <button
                disabled
                className="px-3 py-1.5 rounded-xl bg-neutral-200 text-neutral-400 text-xs font-semibold cursor-not-allowed"
              >
                Unavailable
              </button>
            ) : cartQuantity > 0 ? (
              <div className="inline-flex items-center bg-amber-500 text-white rounded-xl shadow-xs p-0.5 transition-all">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center hover:bg-amber-600 active:scale-95 transition-all cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-xs sm:text-sm font-bold select-none">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center hover:bg-amber-600 active:scale-95 transition-all cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dish Customization Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-neutral-100 p-5 transform transition-all animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 text-sm leading-tight">
                    Customize Dish
                  </h4>
                  <p className="text-xs text-neutral-500 truncate max-w-[200px]">
                    {dishTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="my-3">
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                          : 'bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 border-neutral-200/60'
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
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Special Instructions:
              </label>
              <textarea
                rows={3}
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="e.g. Extra spicy, dressing on side, allergy notes..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2">
              {tempNote && (
                <button
                  type="button"
                  onClick={() => setTempNote('')}
                  className="py-2 px-3 rounded-xl border border-neutral-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
