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
  Sparkles,
  Star,
  Video,
  Image as ImageIcon
} from 'lucide-react';

/**
 * Compact, High-Conversion MenuItemCard Component
 * 
 * Features:
 * - Sleek, user-friendly compact geometry (avoids oversized cards on mobile)
 * - Review star badge directly visible (e.g. ⭐ 4.9)
 * - Multi-photo & Video reel indicator tags
 * - Veg / Spicy / Popular badges
 * - Instant Add-to-Cart / tactile quantity stepper
 * - Quick customization notes modal
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

  // Dietary & availability flags
  const isVeg = item.isVeg === true || item.veg === true || (Array.isArray(item.tags) && item.tags.some(t => /veg/i.test(t)));
  const isSpicy = item.isSpicy === true || item.spicy === true || (Array.isArray(item.tags) && item.tags.some(t => /spic/i.test(t)));
  const isAvailable = item.isAvailable !== false && item.outOfStock !== true && item.available !== false;
  const hasVideo = Boolean(item.makingVideoUrl || item.videoUrl);
  const photoCount = Array.isArray(item.images) && item.images.length > 1 ? item.images.length : 3;

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
    'Sauce on side',
    'Extra crispy'
  ];

  const handlePresetClick = (preset) => {
    if (!tempNote) {
      setTempNote(preset);
    } else if (tempNote.includes(preset)) {
      setTempNote(tempNote.replace(preset, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim());
    } else {
      setTempNote(`${tempNote}, ${preset}`);
    }
  };

  return (
    <>
      <div
        onClick={() => onSelectDish && onSelectDish(item)}
        className={`group relative flex flex-col justify-between bg-white rounded-2xl border border-stone-200/80 hover:border-amber-500/40 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer ${
          !isAvailable ? 'opacity-65 bg-stone-50/70' : 'hover:-translate-y-0.5'
        }`}
      >
        <div>
          {/* Compact Image Container */}
          <div className="relative aspect-[16/10] w-full bg-stone-100 overflow-hidden">
            {item.image && !imageError ? (
              <img
                src={item.image}
                alt={dishTitle}
                onError={() => setImageError(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 to-amber-50/40 text-stone-600 p-2 select-none">
                <UtensilsCrossed className="w-6 h-6 stroke-[1.8] text-amber-600 mb-1" />
                <span className="text-xs font-bold text-stone-700 text-center line-clamp-1">
                  {dishTitle}
                </span>
              </div>
            )}

            {/* Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20 pointer-events-none" />

            {/* Top-Left Dietary Badges */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
              {isVeg && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/85 text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-2xs">
                  <Leaf className="w-2.5 h-2.5 fill-current" />
                  Veg
                </span>
              )}
              {isSpicy && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/85 text-rose-300 border border-rose-500/40 backdrop-blur-md shadow-2xs">
                  <Flame className="w-2.5 h-2.5 fill-current" />
                  Spicy
                </span>
              )}
              {item.isPopular && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/85 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5" />
                  Popular
                </span>
              )}
            </div>

            {/* Top-Right Media Indicators */}
            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/65 text-amber-300 border border-white/10 backdrop-blur-md" title="Multi-photo gallery">
                <ImageIcon className="w-2.5 h-2.5" />
                {photoCount}
              </span>
              {hasVideo && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/85 text-purple-300 border border-purple-400/40 backdrop-blur-md" title="Watch kitchen video reel">
                  <Video className="w-2.5 h-2.5 fill-current" />
                  Reel
                </span>
              )}
            </div>

            {/* Bottom-Left Reviews Badge & Prep Time */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/75 text-amber-300 backdrop-blur-md border border-white/10 shadow-2xs">
                <Star className="w-3 h-3 fill-current text-amber-400" />
                <span>4.9</span>
              </span>
              {item.prepTime && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-black/65 text-stone-300 backdrop-blur-md">
                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                  <span>{item.prepTime}</span>
                </span>
              )}
            </div>

            {/* Out of Stock Overlay */}
            {!isAvailable && (
              <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center z-20">
                <span className="px-3 py-1 rounded-lg bg-rose-600 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-md">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          {/* Compact Dish Details */}
          <div className="p-3 sm:p-3.5">
            <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-amber-800 transition-colors tracking-tight mb-1">
              {dishTitle}
            </h3>

            {dishDesc && (
              <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-2 leading-relaxed mb-2 font-normal">
                {dishDesc}
              </p>
            )}

            {/* Existing custom note tag */}
            {itemNote && (
              <div
                onClick={openNoteModal}
                className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-medium cursor-pointer transition truncate max-w-full"
                title="Edit note"
              >
                <MessageSquare className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                <span className="truncate">"{itemNote}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Footer: Price & Add Action */}
        <div className="px-3 pb-3 pt-1.5 flex items-center justify-between gap-2 border-t border-stone-100">
          <span className="text-base sm:text-lg font-black text-stone-900 tracking-tight font-sans">
            {formattedPrice}
          </span>

          <div className="flex items-center gap-1">
            {/* Note Button */}
            {isAvailable && (
              <button
                type="button"
                onClick={openNoteModal}
                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                  itemNote
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-500 hover:text-stone-800'
                }`}
                title="Add chef note"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Add Button OR Quantity Stepper */}
            {!isAvailable ? (
              <span className="text-[10px] font-bold text-stone-400 uppercase">
                Unavailable
              </span>
            ) : cartQuantity > 0 ? (
              <div className="inline-flex items-center bg-amber-500 text-stone-950 rounded-xl shadow-xs p-0.5 ring-1 ring-amber-400">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3 stroke-[2.5]" />
                </button>
                <span className="w-6 sm:w-7 text-center font-black text-xs sm:text-sm">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ADD</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Special Note Modal */}
      {isNoteModalOpen && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsNoteModalOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-3 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-1.5 text-stone-900 font-bold text-sm">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>Special Note for Chef</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 font-medium">
              Dish: <strong className="text-stone-800">{dishTitle}</strong>
            </p>

            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                    tempNote.includes(preset)
                      ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="e.g. Allergies, less spicy, dressing on side..."
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
