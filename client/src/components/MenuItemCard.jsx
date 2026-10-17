import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  onSelectDish,
  layout = 'showcase',
  index = 0
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
  const photoCount = Array.isArray(item.images) && item.images.length > 0 ? item.images.length : 4;

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

  const renderNoteModal = () => {
    if (!isNoteModalOpen) return null;
    if (typeof document === 'undefined') return null;

    const modalContent = (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        onClick={(e) => {
          e.stopPropagation();
          setIsNoteModalOpen(false);
        }}
      >
        <div 
          className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 space-y-3 animate-scaleUp text-stone-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-1.5 text-stone-900 font-bold text-sm">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Special Note for Chef</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsNoteModalOpen(false);
              }}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
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
                onClick={(e) => {
                  e.stopPropagation();
                  handlePresetClick(preset);
                }}
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
            onClick={(e) => e.stopPropagation()}
            placeholder="e.g. Allergies, less spicy, dressing on side..."
            className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition resize-none text-stone-900 bg-white"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsNoteModalOpen(false);
              }}
              className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveNote();
              }}
              className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Note</span>
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  // 1. SHOWCASE ALTERNATING 1-BY-1 EDITORIAL LAYOUT (Requested Signature UI)
  if (layout === 'showcase') {
    const isEven = index % 2 === 0;

    return (
      <>
        <div
          onClick={() => onSelectDish && onSelectDish(item)}
          className={`group relative flex flex-col md:flex-row ${
            isEven ? 'md:flex-row' : 'md:flex-row-reverse'
          } bg-[#131024]/85 hover:bg-[#18142e]/95 backdrop-blur-2xl border border-purple-500/25 hover:border-purple-400/60 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-purple-500/15 transition-all duration-400 cursor-pointer ${
            !isAvailable ? 'opacity-65' : 'hover:-translate-y-1'
          }`}
        >
          {/* Subtle Ambient Violet Card Glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

          {/* Media Panel (Left for Even, Right for Odd on Desktop) */}
          <div className="relative w-full md:w-[46%] lg:w-[48%] aspect-[16/10] md:aspect-auto md:min-h-[290px] overflow-hidden bg-stone-900 shrink-0">
            {item.image && !imageError ? (
              <img
                src={item.image}
                alt={dishTitle}
                onError={() => setImageError(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-106"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-950/60 to-neutral-900 text-purple-300 p-4 select-none">
                <UtensilsCrossed className="w-8 h-8 stroke-[1.8] text-purple-400 mb-1" />
                <span className="text-xs font-bold text-stone-200 text-center line-clamp-1">
                  {dishTitle}
                </span>
              </div>
            )}

            {/* Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0c1b]/80 via-transparent to-black/30 pointer-events-none" />

            {/* Top-Left Dietary Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
              {isVeg && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-xs">
                  <Leaf className="w-3 h-3 fill-current" />
                  Veg
                </span>
              )}
              {isSpicy && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-500/40 backdrop-blur-md shadow-xs">
                  <Flame className="w-3 h-3 fill-current" />
                  Spicy
                </span>
              )}
              {item.isPopular && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-950/90 text-purple-200 border border-purple-400/50 backdrop-blur-md shadow-xs">
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  Chef's Pick
                </span>
              )}
            </div>

            {/* Top-Right Media Badges */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/80 text-purple-200 border border-purple-500/30 backdrop-blur-md shadow-xs"
                title={`Photo Gallery (${photoCount} Photos)`}
              >
                <ImageIcon className="w-3 h-3 text-purple-300" />
                <span>{photoCount}</span>
              </span>
              {(hasVideo || item.makingVideoUrl !== undefined) && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-900/95 text-white border border-purple-400/60 backdrop-blur-md shadow-xs animate-purple-pulse"
                  title="Kitchen Making Video Reel"
                >
                  <Video className="w-3 h-3 fill-current text-purple-200" />
                  <span>Reel</span>
                </span>
              )}
            </div>

            {/* Bottom-Left: Rating & Prep Time */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-black/85 text-amber-300 backdrop-blur-md border border-amber-500/30 shadow-xs">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{item.rating || '4.9'}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-black/80 text-stone-200 backdrop-blur-md border border-white/10 shadow-xs">
                <Clock className="w-3 h-3 text-purple-300" />
                <span>{item.prepTime || '12 min'}</span>
              </span>
            </div>

            {/* Sold Out Overlay */}
            {!isAvailable && (
              <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center z-20">
                <span className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          {/* Details Panel (Beside Media: Right for Even, Left for Odd on Desktop) */}
          <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between text-stone-100">
            <div>
              {/* Category & Tags header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-purple-400 bg-purple-950/70 border border-purple-500/30 px-2.5 py-0.5 rounded-lg">
                  {item.category || 'Specialty'}
                </span>
                <span className="text-[10px] text-stone-400 font-medium">
                  Dish #{index + 1}
                </span>
              </div>

              {/* Dish Title */}
              <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white group-hover:text-purple-300 transition-colors tracking-tight leading-snug">
                {dishTitle}
              </h3>

              {/* Dish Description */}
              {dishDesc && (
                <p className="text-xs sm:text-sm text-stone-300/80 leading-relaxed font-normal mt-2 line-clamp-3">
                  {dishDesc}
                </p>
              )}

              {/* Key Ingredients Pills */}
              {Array.isArray(item.ingredients) && item.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2">
                  {item.ingredients.slice(0, 4).map((ing, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-stone-300"
                    >
                      {ing}
                    </span>
                  ))}
                  {item.ingredients.length > 4 && (
                    <span className="text-[10px] text-purple-400 font-medium self-center">
                      +{item.ingredients.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Chef Custom Note Tag (if user added one) */}
              {itemNote && (
                <div
                  onClick={openNoteModal}
                  className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-medium cursor-pointer transition max-w-full"
                  title="Edit note for chef"
                >
                  <MessageSquare className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="truncate">Chef Note: "{itemNote}"</span>
                </div>
              )}
            </div>

            {/* Bottom Actions Row: Price & Tactile Buttons */}
            <div className="pt-4 sm:pt-6 mt-4 border-t border-purple-500/20 flex items-center justify-between gap-3">
              <div>
                <span className="block text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Price
                </span>
                <span className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight font-sans">
                  {formattedPrice}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Chef Note Button */}
                {isAvailable && (
                  <button
                    type="button"
                    onClick={openNoteModal}
                    className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                      itemNote
                        ? 'bg-purple-900/80 border-purple-400 text-purple-200'
                        : 'bg-white/5 hover:bg-white/10 border-white/15 text-stone-300 hover:text-white'
                    }`}
                    title="Add special note for chef"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}

                {/* Tactile ADD / Stepper */}
                {!isAvailable ? (
                  <span className="text-xs font-bold text-stone-500 uppercase px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800">
                    Sold Out
                  </span>
                ) : cartQuantity > 0 ? (
                  <div className="inline-flex items-center bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 rounded-2xl shadow-lg p-1 ring-2 ring-amber-300/40">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <span className="w-6 text-center font-black text-sm select-none">
                      {cartQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-neutral-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all cursor-pointer ring-1 ring-amber-300/50"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>ADD TO ORDER</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {renderNoteModal()}
      </>
    );
  }

  // 2. COMPACT LIST VIEW
  if (layout === 'list') {
    return (
      <>
        <div
          onClick={() => onSelectDish && onSelectDish(item)}
          className={`group relative flex items-center justify-between bg-[#131024]/85 hover:bg-[#18142e]/95 backdrop-blur-xl rounded-2xl border border-purple-500/25 hover:border-purple-400/50 p-2.5 sm:p-3 gap-2.5 sm:gap-3.5 shadow-md hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer ${
            !isAvailable ? 'opacity-65' : 'hover:-translate-y-0.5'
          }`}
        >
          {/* Left: Compact Image with Aspect-[16/10] */}
          <div className="relative w-24 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden shrink-0 bg-stone-900">
            {item.image && !imageError ? (
              <img
                src={item.image}
                alt={dishTitle}
                onError={() => setImageError(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-purple-950/50 text-purple-300 p-1 select-none">
                <UtensilsCrossed className="w-4 h-4 stroke-[1.8] text-purple-400 mb-0.5" />
                <span className="text-[10px] font-bold text-stone-200 text-center line-clamp-1">
                  {dishTitle}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />

            <div className="absolute bottom-1 left-1 flex items-center gap-1 z-10">
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-extrabold bg-black/80 text-amber-300 backdrop-blur-md">
                <Star className="w-2 h-2 fill-amber-400 text-amber-400" />
                <span>{item.rating || '4.9'}</span>
              </span>
            </div>

            {!isAvailable && (
              <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center z-20">
                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[8px] uppercase tracking-wider shadow-md">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          {/* Middle: Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isVeg && (
                <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                  Veg
                </span>
              )}
              {isSpicy && (
                <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                  Spicy
                </span>
              )}
              <h3 className="font-extrabold text-white text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-purple-300 transition-colors tracking-tight">
                {dishTitle}
              </h3>
            </div>

            {dishDesc && (
              <p className="text-[10px] sm:text-xs text-stone-400 line-clamp-1 leading-relaxed font-normal mt-0.5">
                {dishDesc}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400 font-medium">
              <span className="inline-flex items-center gap-0.5 text-stone-300">
                <Clock className="w-2.5 h-2.5 text-purple-400" />
                <span>{item.prepTime || '10 min'}</span>
              </span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-0.5 text-purple-300 font-bold">
                <ImageIcon className="w-2.5 h-2.5 text-purple-400" />
                <span>{photoCount} photos</span>
              </span>
              {(hasVideo || item.makingVideoUrl !== undefined) && (
                <>
                  <span>&bull;</span>
                  <span className="inline-flex items-center gap-0.5 text-purple-300 font-bold">
                    <Video className="w-2.5 h-2.5 text-purple-400" />
                    <span>Reel</span>
                  </span>
                </>
              )}
            </div>

            {itemNote && (
              <div
                onClick={openNoteModal}
                className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-200 text-[9px] font-medium cursor-pointer truncate max-w-full"
                title="Edit note"
              >
                <MessageSquare className="w-2 h-2 text-purple-400 shrink-0" />
                <span className="truncate">"{itemNote}"</span>
              </div>
            )}
          </div>

          {/* Right: Price & ADD Button */}
          <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
            <span className="text-xs sm:text-sm md:text-base font-black text-white tracking-tight font-sans">
              {formattedPrice}
            </span>

            <div className="flex items-center gap-1">
              {isAvailable && (
                <button
                  type="button"
                  onClick={openNoteModal}
                  className={`p-1 rounded-lg border text-xs transition cursor-pointer ${
                    itemNote
                      ? 'bg-purple-900/80 border-purple-400 text-purple-200'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-stone-300 hover:text-white'
                  }`}
                  title="Add chef note"
                >
                  <MessageSquare className="w-3 h-3" />
                </button>
              )}

              {!isAvailable ? (
                <span className="text-[10px] font-bold text-stone-400 uppercase">
                  Sold Out
                </span>
              ) : cartQuantity > 0 ? (
                <div className="inline-flex items-center bg-amber-500 text-stone-950 rounded-xl shadow-xs p-0.5 ring-1 ring-amber-400">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="w-5 h-5 rounded-lg flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                  >
                    <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
                  </button>
                  <span className="w-4 text-center font-black text-xs select-none">
                    {cartQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="w-5 h-5 rounded-lg flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                  >
                    <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer ring-1 ring-amber-400/50"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>ADD</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {renderNoteModal()}
      </>
    );
  }

  // 3. COMPACT 2-COLUMN GRID VIEW
  return (
    <>
      <div
        onClick={() => onSelectDish && onSelectDish(item)}
        className={`group relative flex flex-col justify-between bg-[#131024]/85 hover:bg-[#18142e]/95 backdrop-blur-xl rounded-2xl border border-purple-500/25 hover:border-purple-400/50 overflow-hidden shadow-md hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer ${
          !isAvailable ? 'opacity-65' : 'hover:-translate-y-0.5'
        }`}
      >
        <div>
          {/* Compact Image Container with 16/10 Aspect Ratio */}
          <div className="relative aspect-[16/10] w-full bg-stone-900 overflow-hidden">
            {item.image && !imageError ? (
              <img
                src={item.image}
                alt={dishTitle}
                onError={() => setImageError(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-purple-950/50 text-purple-300 p-2 select-none">
                <UtensilsCrossed className="w-5 h-5 stroke-[1.8] text-purple-400 mb-1" />
                <span className="text-[11px] font-bold text-stone-200 text-center line-clamp-1">
                  {dishTitle}
                </span>
              </div>
            )}

            {/* Subtle Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />

            {/* Top-Left Dietary Badges */}
            <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex flex-wrap gap-1 z-10">
              {isVeg && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-emerald-950/85 text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-2xs">
                  <Leaf className="w-2.5 h-2.5 fill-current" />
                  Veg
                </span>
              )}
              {isSpicy && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-rose-950/85 text-rose-300 border border-rose-500/40 backdrop-blur-md shadow-2xs">
                  <Flame className="w-2.5 h-2.5 fill-current" />
                  Spicy
                </span>
              )}
              {item.isPopular && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-purple-950/85 text-purple-200 border border-purple-400/50 backdrop-blur-md shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                  Popular
                </span>
              )}
            </div>

            {/* Top-Right Media Badges (📸 {photoCount}, 🎥 Reel) */}
            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex items-center gap-1 z-10">
              <span 
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-black/75 text-purple-200 border border-purple-500/30 backdrop-blur-md shadow-2xs" 
                title={`Photo Gallery (${photoCount} Photos)`}
              >
                <ImageIcon className="w-2.5 h-2.5 text-purple-300" />
                <span>{photoCount}</span>
              </span>
              {(hasVideo || item.makingVideoUrl !== undefined) && (
                <span 
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-purple-950/90 text-purple-200 border border-purple-400/50 backdrop-blur-md shadow-2xs" 
                  title="Kitchen Making Video Reel"
                >
                  <Video className="w-2.5 h-2.5 fill-current text-purple-300" />
                  <span>Reel</span>
                </span>
              )}
            </div>

            {/* Bottom-Left: Rating Badge (⭐ 4.9) & Prep Time */}
            <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 flex items-center gap-1 z-10">
              <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold bg-black/80 text-amber-300 backdrop-blur-md border border-white/15 shadow-2xs">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
                <span>{item.rating || '4.9'}</span>
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-medium bg-black/75 text-stone-200 backdrop-blur-md border border-white/10 shadow-2xs">
                <Clock className="w-2.5 h-2.5 text-purple-300" />
                <span>{item.prepTime || '10 min'}</span>
              </span>
            </div>

            {/* Out of Stock Overlay */}
            {!isAvailable && (
              <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center z-20">
                <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider shadow-md">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          {/* Compact Dish Details */}
          <div className="p-2.5 sm:p-3">
            <h3 className="font-extrabold text-white text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-purple-300 transition-colors tracking-tight mb-0.5">
              {dishTitle}
            </h3>

            {dishDesc && (
              <p className="text-[10px] sm:text-xs text-stone-400 line-clamp-1 sm:line-clamp-2 leading-relaxed font-normal mb-1">
                {dishDesc}
              </p>
            )}

            {/* Existing custom note tag */}
            {itemNote && (
              <div
                onClick={openNoteModal}
                className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/30 text-purple-200 text-[10px] font-medium cursor-pointer transition truncate max-w-full"
                title="Edit note"
              >
                <MessageSquare className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                <span className="truncate">"{itemNote}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Footer: High-Contrast Price & Tactile ADD Action */}
        <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1.5 flex items-center justify-between gap-1 border-t border-purple-500/20 mt-auto">
          <span className="text-xs sm:text-sm md:text-base font-black text-white tracking-tight font-sans">
            {formattedPrice}
          </span>

          <div className="flex items-center gap-1">
            {/* Note Button */}
            {isAvailable && (
              <button
                type="button"
                onClick={openNoteModal}
                className={`p-1 sm:p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                  itemNote
                    ? 'bg-purple-900/80 border-purple-400 text-purple-200'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-stone-300 hover:text-white'
                }`}
                title="Add chef note"
              >
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            )}

            {/* Tactile ADD Button OR Quantity Stepper */}
            {!isAvailable ? (
              <span className="text-[10px] font-bold text-stone-400 uppercase">
                Unavailable
              </span>
            ) : cartQuantity > 0 ? (
              <div className="inline-flex items-center bg-amber-500 text-stone-950 rounded-xl shadow-xs p-0.5 ring-1 ring-amber-400">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                </button>
                <span className="w-4 sm:w-5 text-center font-black text-[11px] sm:text-xs select-none">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-[10px] sm:text-xs shadow-xs hover:shadow transition-all cursor-pointer ring-1 ring-amber-400/50"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                <span>ADD</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Special Note Modal */}
      {renderNoteModal()}
    </>
  );
}
