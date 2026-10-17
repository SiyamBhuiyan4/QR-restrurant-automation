import React, { useState, useEffect, useMemo } from 'react';
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
  Image as ImageIcon,
  ShoppingBag,
  ArrowRight,
  Compass
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

  const safeDishImage = (item.image && typeof item.image === 'string' && item.image.includes('photo-1604909052743'))
    ? 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80'
    : item.image;

  // 360° Multi-Angle Orbital Camera Photography Array
  const angleImages = useMemo(() => {
    let imgs = Array.isArray(item.images) && item.images.length > 0 ? [...item.images] : [];
    if (safeDishImage && !imgs.includes(safeDishImage)) {
      imgs.unshift(safeDishImage);
    }
    imgs = imgs.map((u) => (typeof u === 'string' && u.includes('photo-1604909052743') ? 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80' : u));
    return imgs.length > 0 ? imgs : [safeDishImage];
  }, [item.images, safeDishImage]);

  const ANGLE_LABELS = ['Front (0°)', 'Right (90°)', 'Top/Back (180°)', 'Left Profile (270°)'];
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [isOrbitalHovered, setIsOrbitalHovered] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({ rotateX: 0, rotateY: 0, sheenX: 50, sheenY: 50 });

  // Camera orbits smoothly around stationary dish (Front, Right, Back, Left)
  useEffect(() => {
    if (layout !== 'showcase' || angleImages.length <= 1 || isOrbitalHovered) return;
    const interval = setInterval(() => {
      setCurrentAngleIndex((prev) => (prev + 1) % angleImages.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [layout, angleImages.length, isOrbitalHovered]);

  const handleOrbitalMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Interactive 3D orbital camera tilt (product stays stationary, camera orbits around)
    const rotateY = (x - 0.5) * 22; // left/right yaw
    const rotateX = -(y - 0.5) * 18; // up/down pitch
    setTiltStyle({
      rotateX,
      rotateY,
      sheenX: x * 100,
      sheenY: y * 100,
    });
  };

  const handleOrbitalMouseLeave = () => {
    setIsOrbitalHovered(false);
    setTiltStyle({ rotateX: 0, rotateY: 0, sheenX: 50, sheenY: 50 });
  };

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
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        onClick={(e) => {
          e.stopPropagation();
          setIsNoteModalOpen(false);
        }}
      >
        <div 
          className="w-full max-w-sm bg-[#161619] rounded-2xl shadow-2xl border border-zinc-800 p-5 space-y-3.5 animate-scaleUp text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <MessageSquare className="w-4 h-4 text-[#FF5A26]" />
              <span>Special Note for Chef</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsNoteModalOpen(false);
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-400 font-medium">
            Dish: <strong className="text-white">{dishTitle}</strong>
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
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                  tempNote.includes(preset)
                    ? 'bg-[#FF5A26]/20 border-[#FF5A26] text-[#FF7A45] font-bold shadow-xs'
                    : 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
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
            className="w-full px-3 py-2 text-xs border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF5A26] focus:border-[#FF5A26] transition resize-none text-white bg-zinc-900/90 placeholder-zinc-500"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsNoteModalOpen(false);
              }}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveNote();
              }}
              className="px-4 py-1.5 text-xs font-bold flame-gradient-btn text-white rounded-xl shadow-md shadow-[#FF5A26]/30 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
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

  // 1. UNBOXED FLOATING CIRCULAR DISH ZIG-ZAG LAYOUT (User Requested Signature UI)
  if (layout === 'showcase') {
    // Alternating zig-zag: Even index has Text Left / Plate Right (like in screenshot 2), Odd has Plate Left / Text Right!
    const isEven = index % 2 === 0;

    return (
      <>
        <div
          onClick={() => onSelectDish && onSelectDish(item)}
          className={`group relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-14 py-10 md:py-20 transition-all duration-500 border-b border-white/5 last:border-b-0 cursor-pointer ${
            isEven ? 'md:flex-row' : 'md:flex-row-reverse'
          } ${!isAvailable ? 'opacity-60' : ''}`}
        >
          {/* Subtle Ambient Culinary Glow Behind Floating Dish */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#FF5A26]/8 rounded-full blur-3xl pointer-events-none group-hover:bg-[#FF5A26]/15 transition-all duration-700" />

          {/* Unboxed Floating Circular Plate (360° Orbital Camera & ~40% Page Width Occupation on Zoom) */}
          <div 
            className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 lg:w-[430px] lg:h-[430px] xl:w-[490px] xl:h-[490px] shrink-0 flex items-center justify-center select-none group-hover:scale-110 md:group-hover:scale-120 transition-all duration-700 ease-out [perspective:1400px]"
            onMouseMove={handleOrbitalMouseMove}
            onMouseEnter={() => setIsOrbitalHovered(true)}
            onMouseLeave={handleOrbitalMouseLeave}
          >
            {/* Soft Ambient Depth Shadow */}
            <div className="absolute inset-6 rounded-full bg-black/75 blur-2xl pointer-events-none group-hover:bg-[#FF5A26]/15 transition-all duration-700" />

            {/* Circular Plate with 3D Orbital Perspective & Specular Sheen (Product stays upright & constant) */}
            <div 
              className="relative w-64 h-64 sm:w-76 sm:h-76 md:w-88 md:h-88 lg:w-[390px] lg:h-[390px] xl:w-[450px] xl:h-[450px] rounded-full overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)] drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)] border border-white/10 bg-zinc-950 transition-transform duration-300 ease-out"
              style={{
                transform: `rotateX(${tiltStyle.rotateX}deg) rotateY(${tiltStyle.rotateY}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Dynamic Specular Light Sheen That Reacts to Camera Angle */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-full transition-opacity duration-300 z-10 opacity-30 group-hover:opacity-60"
                style={{
                  background: `radial-gradient(circle at ${tiltStyle.sheenX}% ${tiltStyle.sheenY}%, rgba(255,255,255,0.4) 0%, rgba(255,90,38,0.12) 40%, transparent 70%)`
                }}
              />

              {/* Multi-Angle Photography Showcase: Camera walks around the stationary product */}
              {safeDishImage && !imageError ? (
                <div className="w-full h-full relative">
                  {angleImages.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`${dishTitle} - Angle ${idx + 1}`}
                      onError={() => setImageError(true)}
                      loading="lazy"
                      className={`absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-all duration-1000 ease-in-out ${
                        idx === currentAngleIndex 
                          ? 'opacity-100 scale-100' 
                          : 'opacity-0 scale-104'
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-stone-300 p-4">
                  <UtensilsCrossed className="w-10 h-10 text-[#FF5A26] mb-1" />
                  <span className="text-xs font-bold text-center">{dishTitle}</span>
                </div>
              )}

              {/* Sold Out Badge Overlay */}
              {!isAvailable && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-20">
                  <span className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg">
                    Sold Out
                  </span>
                </div>
              )}
            </div>

            {/* Floating 360° Orbital Camera HUD Pill (Allows viewing from all angles) */}
            <div className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 bg-[#121216]/95 backdrop-blur-md border border-zinc-700/80 px-3 sm:px-4 py-1.5 rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-2.5 z-20">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF5A26] animate-ping" />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#FF7A45] flex items-center gap-1">
                  <Compass className="w-3 h-3 text-[#FF5A26]" />
                  <span>360° Orbit</span>
                </span>
              </div>
              <span className="text-zinc-600">|</span>
              {/* Angle selector dots */}
              <div className="flex items-center gap-1">
                {angleImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentAngleIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentAngleIndex 
                        ? 'w-5 bg-[#FF5A26] shadow-xs shadow-[#FF5A26]/80' 
                        : 'w-1.5 bg-zinc-600 hover:bg-zinc-400'
                    }`}
                    title={`Angle ${idx + 1}: ${ANGLE_LABELS[idx] || `Perspective ${idx + 1}`}`}
                  />
                ))}
              </div>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 font-medium hidden sm:inline">
                {ANGLE_LABELS[currentAngleIndex] || 'Perspective'}
              </span>
            </div>

            {/* Floating Review & Time Pill */}
            <div className="absolute top-2 right-4 sm:right-6 bg-[#161619]/95 backdrop-blur-md border border-zinc-800/80 px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 z-10">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {item.rating || '4.9'}
              </span>
              <span className="text-[10px] text-zinc-400">&bull; {item.prepTime || '12 min'}</span>
            </div>

            {/* Reel Badge if video available */}
            {(hasVideo || item.makingVideoUrl !== undefined) && (
              <div className="absolute top-2 left-4 sm:left-6 bg-[#FF5A26] text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-[#FF5A26]/40 flex items-center gap-1 z-10 animate-flame-pulse">
                <Video className="w-3 h-3 fill-current" />
                <span>Video Reel</span>
              </div>
            )}
          </div>

          {/* Details Panel (Beside the Plate, No Card Box!) */}
          <div className="flex-1 w-full md:w-[56%] lg:w-[54%] max-w-xl text-left select-none">
            {/* Category tag */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-extrabold text-[#FF7A45] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5A26]" />
                {item.category || 'Specialty'}
              </span>
              {isVeg && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                  <Leaf className="w-2.5 h-2.5 fill-current" /> Veg
                </span>
              )}
              {isSpicy && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/30">
                  <Flame className="w-2.5 h-2.5 fill-current" /> Spicy
                </span>
              )}
            </div>

            {/* Food Name (Bold Headline like in screenshot 2) */}
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white group-hover:text-[#FF7A45] transition-colors tracking-tight leading-snug">
              {dishTitle}
            </h3>

            {/* Slight 1-2 line details */}
            {dishDesc && (
              <p className="text-sm sm:text-base text-zinc-400 font-normal mt-2.5 leading-relaxed line-clamp-2">
                {dishDesc}
              </p>
            )}

            {/* Ingredients pills hint */}
            {Array.isArray(item.ingredients) && item.ingredients.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-1">
                <span className="text-[11px] text-zinc-500 font-semibold mr-1">Ingredients:</span>
                {item.ingredients.slice(0, 4).map((ing, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-800 text-zinc-300"
                  >
                    {ing}
                  </span>
                ))}
                {item.ingredients.length > 4 && (
                  <span className="text-[10px] text-[#FF7A45] font-semibold">
                    +{item.ingredients.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Chef Custom Note Pill (if attached) */}
            {itemNote && (
              <div
                onClick={openNoteModal}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[#FF7A45] text-xs font-medium cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Chef Note: "{itemNote}"</span>
              </div>
            )}

            {/* Price & Action Buttons (Screenshot 2: "Order Now" + "Book A Menu" style) */}
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-2">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formattedPrice}
              </span>

              {isAvailable && (
                <>
                  {cartQuantity > 0 ? (
                    <div className="inline-flex items-center bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white rounded-2xl shadow-lg p-1 ring-2 ring-[#FF7A45]/40">
                      <button
                        type="button"
                        onClick={handleDecrement}
                        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <span className="w-7 text-center font-black text-sm select-none">
                        {cartQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={handleIncrement}
                        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/15 active:scale-90 transition cursor-pointer font-bold"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="px-6 py-2.5 rounded-2xl flame-gradient-btn text-white text-xs sm:text-sm font-black shadow-lg shadow-[#FF5A26]/30 flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Order Now</span>
                    </button>
                  )}
                </>
              )}

              {/* View Full Details Button */}
              <button
                type="button"
                onClick={() => onSelectDish && onSelectDish(item)}
                className="px-5 py-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FF7A45]" />
              </button>

              {/* Chef note button */}
              {isAvailable && (
                <button
                  type="button"
                  onClick={openNoteModal}
                  className={`p-2.5 rounded-2xl border text-xs transition cursor-pointer ${
                    itemNote
                      ? 'bg-[#FF5A26]/20 border-[#FF5A26] text-[#FF7A45]'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                  title="Add special instructions for chef"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              )}
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
          className={`group relative flex items-center justify-between bg-[#141418]/90 hover:bg-[#18181f] backdrop-blur-xl rounded-2xl border border-zinc-800 hover:border-[#FF5A26]/40 p-2.5 sm:p-3 gap-2.5 sm:gap-3.5 shadow-md hover:shadow-xl hover:shadow-black/50 transition-all duration-300 cursor-pointer ${
            !isAvailable ? 'opacity-65' : 'hover:-translate-y-0.5'
          }`}
        >
          {/* Left: Compact Image with Aspect-[16/10] */}
          <div className="relative w-24 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden shrink-0 bg-zinc-900">
            {item.image && !imageError ? (
              <img
                src={item.image}
                alt={dishTitle}
                onError={() => setImageError(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 p-1 select-none">
                <UtensilsCrossed className="w-4 h-4 stroke-[1.8] text-[#FF5A26] mb-0.5" />
                <span className="text-[10px] font-bold text-zinc-300 text-center line-clamp-1">
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
              <h3 className="font-extrabold text-white text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-[#FF7A45] transition-colors tracking-tight">
                {dishTitle}
              </h3>
            </div>

            {dishDesc && (
              <p className="text-[10px] sm:text-xs text-zinc-400 line-clamp-1 leading-relaxed font-normal mt-0.5">
                {dishDesc}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 font-medium">
              <span className="inline-flex items-center gap-0.5 text-zinc-300">
                <Clock className="w-2.5 h-2.5 text-[#FF7A45]" />
                <span>{item.prepTime || '10 min'}</span>
              </span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-0.5 text-zinc-300 font-bold">
                <ImageIcon className="w-2.5 h-2.5 text-[#FF7A45]" />
                <span>{photoCount} photos</span>
              </span>
              {(hasVideo || item.makingVideoUrl !== undefined) && (
                <>
                  <span>&bull;</span>
                  <span className="inline-flex items-center gap-0.5 text-[#FF7A45] font-bold">
                    <Video className="w-2.5 h-2.5 text-[#FF5A26]" />
                    <span>Reel</span>
                  </span>
                </>
              )}
            </div>

            {itemNote && (
              <div
                onClick={openNoteModal}
                className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[#FF7A45] text-[9px] font-medium cursor-pointer truncate max-w-full"
                title="Edit note"
              >
                <MessageSquare className="w-2 h-2 text-[#FF5A26] shrink-0" />
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
                      ? 'bg-[#FF5A26]/20 border-[#FF5A26] text-[#FF7A45]'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                  title="Add chef note"
                >
                  <MessageSquare className="w-3 h-3" />
                </button>
              )}

              {!isAvailable ? (
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  Sold Out
                </span>
              ) : cartQuantity > 0 ? (
                <div className="inline-flex items-center flame-gradient-btn text-white rounded-xl shadow-xs p-0.5 ring-1 ring-[#FF7A45]/40">
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
                  className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-xl flame-gradient-btn text-white font-black text-xs shadow-md shadow-[#FF5A26]/30 active:scale-95 transition-all cursor-pointer"
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
        className={`group relative flex flex-col justify-between bg-[#141418]/90 hover:bg-[#18181f] backdrop-blur-xl rounded-2xl border border-zinc-800 hover:border-[#FF5A26]/40 overflow-hidden shadow-md hover:shadow-xl hover:shadow-black/50 transition-all duration-300 cursor-pointer ${
          !isAvailable ? 'opacity-65' : 'hover:-translate-y-0.5'
        }`}
      >
        <div>
          {/* Compact Image Container with 16/10 Aspect Ratio */}
          <div className="relative aspect-[16/10] w-full bg-zinc-900 overflow-hidden">
            {item.image && !imageError ? (
              <img
                src={item.image}
                alt={dishTitle}
                onError={() => setImageError(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 p-2 select-none">
                <UtensilsCrossed className="w-5 h-5 stroke-[1.8] text-[#FF5A26] mb-1" />
                <span className="text-[11px] font-bold text-zinc-300 text-center line-clamp-1">
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
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-[#FF5A26]/20 text-[#FF7A45] border border-[#FF5A26]/40 backdrop-blur-md shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5 text-[#FF5A26]" />
                  Popular
                </span>
              )}
            </div>

            {/* Top-Right Media Badges (📸 {photoCount}, 🎥 Reel) */}
            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex items-center gap-1 z-10">
              <span 
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-black/75 text-zinc-300 border border-zinc-700/60 backdrop-blur-md shadow-2xs" 
                title={`Photo Gallery (${photoCount} Photos)`}
              >
                <ImageIcon className="w-2.5 h-2.5 text-[#FF7A45]" />
                <span>{photoCount}</span>
              </span>
              {(hasVideo || item.makingVideoUrl !== undefined) && (
                <span 
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-[#FF5A26] text-white backdrop-blur-md shadow-2xs" 
                  title="Kitchen Making Video Reel"
                >
                  <Video className="w-2.5 h-2.5 fill-current" />
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
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-medium bg-black/75 text-zinc-300 backdrop-blur-md border border-white/10 shadow-2xs">
                <Clock className="w-2.5 h-2.5 text-[#FF7A45]" />
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
            <h3 className="font-extrabold text-white text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-[#FF7A45] transition-colors tracking-tight mb-0.5">
              {dishTitle}
            </h3>

            {dishDesc && (
              <p className="text-[10px] sm:text-xs text-zinc-400 line-clamp-1 sm:line-clamp-2 leading-relaxed font-normal mb-1">
                {dishDesc}
              </p>
            )}

            {/* Existing custom note tag */}
            {itemNote && (
              <div
                onClick={openNoteModal}
                className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[#FF7A45] text-[10px] font-medium cursor-pointer transition truncate max-w-full"
                title="Edit note"
              >
                <MessageSquare className="w-2.5 h-2.5 text-[#FF5A26] shrink-0" />
                <span className="truncate">"{itemNote}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Footer: High-Contrast Price & Tactile ADD Action */}
        <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1.5 flex items-center justify-between gap-1 border-t border-zinc-800 mt-auto">
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
                    ? 'bg-[#FF5A26]/20 border-[#FF5A26] text-[#FF7A45]'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
                title="Add chef note"
              >
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            )}

            {/* Tactile ADD Button OR Quantity Stepper */}
            {!isAvailable ? (
              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                Unavailable
              </span>
            ) : cartQuantity > 0 ? (
              <div className="inline-flex items-center flame-gradient-btn text-white rounded-xl shadow-xs p-0.5 ring-1 ring-[#FF7A45]/40">
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
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl flame-gradient-btn text-white font-black text-[10px] sm:text-xs shadow-md shadow-[#FF5A26]/30 active:scale-95 transition-all cursor-pointer"
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
