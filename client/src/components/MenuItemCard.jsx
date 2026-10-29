import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { startVisibleVideos } from '../utils/visibleVideos';
import { startCardReveal } from '../utils/cardReveal';
import { cardVideoUrl } from '../utils/mediaUrl';
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
  Compass,
  Volume2,
  VolumeX,
  Camera,
  Play
} from 'lucide-react';
import '../styles/menu-orbit.css';

// Card thumbnails are small; ask Unsplash for a 480px image instead of the 800px original.
const thumb = (url) => (typeof url === 'string' && url.includes('images.unsplash.com')
  ? url.replace(/([?&])w=\d+/, '$1w=480')
  : url);

// Dish videos play only while on screen (see utils/visibleVideos.js)
startVisibleVideos();
// Cards glide in as they scroll into view (see utils/cardReveal.js)
startCardReveal();

// Reads the OS "reduce motion" preference; guarded so it is safe outside the browser
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Robust detection helper for continuous 24/7 360° product video or food profile videos
 * Detects .mp4, .webm, .mov, telegram sendVideo, cloud video storage, etc.
 */
export const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (clean.includes('mixkit.co')) return false; // Filter out broken demo placeholders
  // Video extensions (handles query parameters e.g. .mp4?token=xyz)
  if (/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(clean)) return true;
  // Common video stream or Telegram video paths
  if (
    clean.includes('/videos/') ||
    clean.includes('/video/') ||
    clean.includes('sendvideo') ||
    clean.includes('video_note') ||
    clean.includes('video/mp4') ||
    clean.includes('mime_type=video')
  ) {
    return true;
  }
  return false;
};

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
  // 1. Direct 360° Food Profile Video & Media URL Resolution
  const rawDishVideo = useMemo(() => {
    // a) Explicit video attributes
    const explicitCandidates = [
      item.videoUrl,
      item.video_url,
      item.makingVideoUrl,
      item.making_video_url,
      item.makingVideo,
      item.video,
    ];
    for (const v of explicitCandidates) {
      if (v && typeof v === 'string' && !v.includes('mixkit.co') && v.trim().length > 0) {
        return v.trim();
      }
    }

    // b) Main profile picture / profile video upload (user uploaded a 360° video directly as the image)
    const profileCandidates = [
      item.image,
      item.imageUrl,
      item.image_url,
    ];
    for (const img of profileCandidates) {
      if (img && isVideoUrl(img)) {
        return img.trim();
      }
    }

    // c) Arrays (images or videos)
    if (Array.isArray(item.images)) {
      const found = item.images.find(isVideoUrl);
      if (found) return found.trim();
    }
    if (Array.isArray(item.videos) && item.videos.length > 0) {
      const found = item.videos.find(v => typeof v === 'string' && v.trim().length > 0 && !v.includes('mixkit.co'));
      if (found) return found.trim();
    }

    return null;
  }, [
    item.videoUrl,
    item.video_url,
    item.makingVideoUrl,
    item.making_video_url,
    item.makingVideo,
    item.video,
    item.image,
    item.imageUrl,
    item.image_url,
    item.images,
    item.videos,
  ]);
  // Cards play the light 360p copy where one exists (see utils/mediaUrl.js)
  const dishVideo = useMemo(() => cardVideoUrl(rawDishVideo), [rawDishVideo]);

  const hasVideo = Boolean(dishVideo);
  const [isVideoMode, setIsVideoMode] = useState(Boolean(dishVideo));
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const showcaseVideoRef = useRef(null);

  useEffect(() => {
    if (dishVideo) {
      setIsVideoMode(true);
      setVideoError(false);
    }
  }, [dishVideo]);

  // Robust safe static image resolution: avoids putting a video URL into <img> tags
  const safeDishImage = useMemo(() => {
    const candidateImages = [
      !isVideoUrl(item.image) ? item.image : null,
      !isVideoUrl(item.imageUrl) ? item.imageUrl : null,
      !isVideoUrl(item.image_url) ? item.image_url : null,
      Array.isArray(item.images) ? item.images.find(img => !isVideoUrl(img)) : null,
      item.poster,
      item.posterUrl,
      item.thumbnail,
    ];

    let found = candidateImages.find(u => u && typeof u === 'string' && u.trim().length > 0);
    if (!found) {
      found = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80';
    }

    if (found.includes('photo-1604909052743')) {
      return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80';
    }
    return found;
  }, [item.image, item.imageUrl, item.image_url, item.images, item.poster, item.posterUrl, item.thumbnail]);

  // 360° Multi-Angle Orbital Camera Photography Array (strictly non-video photos)
  const angleImages = useMemo(() => {
    let imgs = Array.isArray(item.images) && item.images.length > 0 
      ? item.images.filter(u => !isVideoUrl(u)) 
      : [];
    if (safeDishImage && !isVideoUrl(safeDishImage) && !imgs.includes(safeDishImage)) {
      imgs.unshift(safeDishImage);
    }
    imgs = imgs.map((u) => (typeof u === 'string' && u.includes('photo-1604909052743') ? 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80' : u));
    return imgs.length > 0 ? imgs : [safeDishImage];
  }, [item.images, safeDishImage]);

  const photoCount = Array.isArray(item.images) && item.images.length > 0 
    ? item.images.filter(u => !isVideoUrl(u)).length 
    : 4;

  const ANGLE_LABELS = ['Front (0°)', 'Right (90°)', 'Top/Back (180°)', 'Left Profile (270°)'];
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [isOrbitalHovered, setIsOrbitalHovered] = useState(false);

  // Camera orbits smoothly around stationary dish (Front, Right, Back, Left)
  useEffect(() => {
    if (layout !== 'showcase' || angleImages.length <= 1 || isOrbitalHovered || prefersReducedMotion()) return;
    const interval = setInterval(() => {
      setCurrentAngleIndex((prev) => (prev + 1) % angleImages.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [layout, angleImages.length, isOrbitalHovered]);

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

  // 1. SIGNATURE SHOWCASE: alternating dish block (straight gold-framed photo, emerald/gold palette)
  if (layout === 'showcase') {
    // Even index: photo left / text right. Odd index: text left / photo right.
    const isEven = index % 2 === 0;

    return (
      <>
        <div
          onClick={() => onSelectDish && onSelectDish(item)}
          className={`menu-show group relative flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-14 py-10 md:py-16 cursor-pointer ${!isAvailable ? 'menu-show--unavailable' : ''}`}
        >
          {/* Soft emerald/gold ambient glow behind the photo (decorative, clipped by the section) */}
          <div className="menu-show__glow" aria-hidden="true" />

          {/* Photo block: straight, rounded, gold hairline frame. Nothing rotates or clips. */}
          <div
            className="menu-show__media relative w-full max-w-[20rem] sm:max-w-[22rem] md:max-w-[24rem] lg:max-w-[26rem] shrink-0 select-none"
            onMouseEnter={() => setIsOrbitalHovered(true)}
            onMouseLeave={() => setIsOrbitalHovered(false)}
          >
            <div className="menu-show__frame">
              <div className="menu-show__photo relative">
                {dishVideo && isVideoMode && !videoError ? (
                  <video
                    ref={showcaseVideoRef}
                    src={dishVideo}
                    poster={safeDishImage}
                    data-play-when-visible
                    loop
                    muted={isVideoMuted}
                    playsInline
                    preload="none"
                    referrerPolicy="no-referrer"
                    onError={() => setVideoError(true)}
                    className="menu-show__video"
                  />
                ) : safeDishImage && !imageError ? (
                  angleImages.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`${dishTitle} - Angle ${idx + 1}`}
                      onError={() => setImageError(true)}
                      loading="lazy"
                      draggable={false}
                      referrerPolicy="no-referrer"
                      className={`menu-show__img ${idx === currentAngleIndex ? 'is-active' : ''}`}
                    />
                  ))
                ) : (
                  <div className="menu-show__fallback">
                    <UtensilsCrossed className="w-10 h-10 mb-2" aria-hidden="true" />
                    <span className="text-xs font-bold text-center">{dishTitle}</span>
                  </div>
                )}

                {/* Sold out overlay */}
                {!isAvailable && (
                  <div className="menu-show__soldout">
                    <span className="menu-show__soldout-tag">Sold Out</span>
                  </div>
                )}

                {/* Sound Toggle Button (Bottom-Right) */}
                {dishVideo && !videoError && isVideoMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVideoMuted(prev => {
                        const next = !prev;
                        if (showcaseVideoRef.current) {
                          showcaseVideoRef.current.muted = next;
                        }
                        return next;
                      });
                    }}
                    className="absolute bottom-3 right-3 z-20 p-2 rounded-full bg-black/80 hover:bg-black text-white backdrop-blur-md border border-white/30 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xl"
                    title={isVideoMuted ? "Tap to unmute food audio" : "Tap to mute audio"}
                    aria-label={isVideoMuted ? "Unmute video audio" : "Mute video audio"}
                  >
                    {isVideoMuted ? (
                      <VolumeX className="w-3.5 h-3.5 text-slate-300" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    )}
                  </button>
                )}

                {/* Video vs 360° Photo Switcher (Bottom-Left) */}
                {dishVideo && angleImages.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVideoMode(prev => !prev);
                    }}
                    className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/80 hover:bg-black text-white text-[10px] font-bold backdrop-blur-md border border-white/25 transition active:scale-95 cursor-pointer shadow-xl"
                    title={isVideoMode ? "Switch to 360° Photo Orbit" : "Switch to 360° Video"}
                  >
                    {isVideoMode ? (
                      <>
                        <Camera className="w-3 h-3 text-amber-400" />
                        <span>📷 Photo Orbit</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-3 h-3 text-emerald-400" />
                        <span>🎥 360° Video</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 360° Orbit HUD: only when real multi-angle photos exist */}
            {angleImages.length > 1 && (
              <div className="menu-show__hud">
                <span className="menu-show__hud-label">
                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>360° Orbit</span>
                </span>
                <span className="menu-show__hud-sep" aria-hidden="true" />
                <div className="flex items-center">
                  {angleImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentAngleIndex(idx);
                      }}
                      className={`menu-show__dot ${idx === currentAngleIndex ? 'is-active' : ''}`}
                      title={`Angle ${idx + 1}: ${ANGLE_LABELS[idx] || `Perspective ${idx + 1}`}`}
                      aria-label={`Show angle ${idx + 1}`}
                    >
                      <span aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rating + prep time */}
            <div className="menu-show__rating">
              <Star className="w-3 h-3 fill-current" aria-hidden="true" />
              <span>{item.rating || '4.9'}</span>
              <span className="menu-show__muted">&bull; {item.prepTime || '12 min'}</span>
            </div>
          </div>

          {/* Details panel */}
          <div className="menu-show__body w-full md:flex-1 max-w-xl text-left select-none">
            {/* Category + dietary tags */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="menu-show__eyebrow">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {item.category || 'Specialty'}
              </span>
              {isVeg && (
                <span className="menu-show__chip menu-show__chip--veg">
                  <Leaf className="w-2.5 h-2.5 fill-current" aria-hidden="true" /> Veg
                </span>
              )}
              {isSpicy && (
                <span className="menu-show__chip menu-show__chip--spicy">
                  <Flame className="w-2.5 h-2.5 fill-current" aria-hidden="true" /> Spicy
                </span>
              )}
            </div>

            {/* Dish title: serif, cream, gold on hover */}
            <h3 className="menu-show__title">{dishTitle}</h3>

            {dishDesc && <p className="menu-show__desc line-clamp-2">{dishDesc}</p>}

            {Array.isArray(item.ingredients) && item.ingredients.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-4">
                <span className="menu-show__muted text-[11px] font-semibold mr-1">Ingredients:</span>
                {item.ingredients.slice(0, 4).map((ing, i) => (
                  <span key={i} className="menu-show__ingredient">
                    {ing}
                  </span>
                ))}
                {item.ingredients.length > 4 && (
                  <span className="menu-show__eyebrow text-[11px]">
                    +{item.ingredients.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Chef note (if attached) */}
            {itemNote && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  openNoteModal(e);
                }}
                className="menu-show__chefnote mt-4"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Chef Note: "{itemNote}"</span>
              </div>
            )}

            {/* Price + actions */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <span className="menu-show__price">{formattedPrice}</span>

              {isAvailable && (
                <>
                  {cartQuantity > 0 ? (
                    <div className="menu-show__stepper">
                      <button
                        type="button"
                        onClick={handleDecrement}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <span className="menu-show__count">{cartQuantity}</span>
                      <button
                        type="button"
                        onClick={handleIncrement}
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={handleAdd} className="menu-show__order">
                      <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                      <span>Order Now</span>
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => onSelectDish && onSelectDish(item)}
                className="menu-show__details"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              {isAvailable && (
                <button
                  type="button"
                  onClick={openNoteModal}
                  className={`menu-show__note ${itemNote ? 'is-active' : ''}`}
                  title="Add special instructions for chef"
                  aria-label="Add special instructions for chef"
                >
                  <MessageSquare className="w-4 h-4" aria-hidden="true" />
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
          {/* Left: Compact Image/Video with Aspect-[16/10] */}
          <div className="relative w-24 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden shrink-0 bg-zinc-900">
            {dishVideo && !videoError ? (
              <video
                src={dishVideo}
                poster={thumb(safeDishImage)}
                data-play-when-visible
                loop
                muted
                playsInline
                preload="none"
                referrerPolicy="no-referrer"
                onError={() => setVideoError(true)}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : safeDishImage && !imageError ? (
              <img
                src={thumb(safeDishImage)}
                alt={dishTitle}
                onError={() => setImageError(true)}
                loading="lazy"
                referrerPolicy="no-referrer"
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

  // 3. PLATE CARD VIEW (Matches screenshot: prominent green price at top, centered circular bowl, elegant fine dining borders)
  if (layout === 'plate') {
    const platePrice = `${priceNum.toFixed(2)} ${currency}`;

    return (
      <>
        <div
          onClick={() => onSelectDish && onSelectDish(item)}
          style={{ '--card-i': Math.min(Math.max(Number(index) || 0, 0), 10) }}
          className={`group plate-card relative flex flex-col justify-between overflow-hidden cursor-pointer ${
            !isAvailable ? 'plate-card--unavailable' : ''
          }`}
        >
          {/* Top row: Green Price on Left ($14.00 / 14.00 $) & Dietary/Rating Badges on Right */}
          <div className="plate-card__top">
            <span className="plate-card__price">
              {platePrice}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {isVeg && (
                <span className="plate-chip plate-chip--veg" title="Vegetarian">
                  <Leaf className="w-2.5 h-2.5 fill-current" />
                  <span>Veg</span>
                </span>
              )}
              {isSpicy && (
                <span className="plate-chip plate-chip--spicy" title="Spicy">
                  <Flame className="w-2.5 h-2.5 fill-current" />
                </span>
              )}
              <span className="plate-chip plate-chip--rating" title={`Rating: ${item.rating || '4.9'}`}>
                <Star className="w-2.5 h-2.5 fill-current text-amber-400" />
                <span>{item.rating || '4.9'}</span>
              </span>
            </div>
          </div>

          {/* Centered Circular Plate / Bowl Image or Video */}
          <div className="plate-card__media">
            <div className="plate-card__dish-circle">
              {dishVideo && !videoError ? (
                <video
                  src={dishVideo}
                  poster={thumb(safeDishImage)}
                  data-play-when-visible
                  loop
                  muted
                  playsInline
                  preload="none"
                  referrerPolicy="no-referrer"
                  onError={() => setVideoError(true)}
                  className="plate-card__img object-cover w-full h-full"
                />
              ) : safeDishImage && !imageError ? (
                <img
                  src={thumb(safeDishImage)}
                  alt={dishTitle}
                  onError={() => setImageError(true)}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="plate-card__img"
                />
              ) : (
                <div className="plate-card__fallback">
                  <UtensilsCrossed className="w-6 h-6 stroke-[1.8] text-[#16a34a] mb-1" />
                  <span className="text-[10px] font-bold line-clamp-1">{dishTitle}</span>
                </div>
              )}

              {!isAvailable && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] uppercase tracking-wider">
                    Sold Out
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details: Title and Short Description */}
          <div className="plate-card__body">
            <h3 className="plate-card__title line-clamp-1">
              {dishTitle}
            </h3>

            {dishDesc && (
              <p className="plate-card__desc line-clamp-2">
                {dishDesc}
              </p>
            )}

            {itemNote && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  openNoteModal(e);
                }}
                className="plate-card__note"
                title="Edit chef note"
              >
                <MessageSquare className="w-2.5 h-2.5 text-[#16a34a] shrink-0" />
                <span className="truncate">Chef Note: "{itemNote}"</span>
              </div>
            )}
          </div>

          {/* Footer: Prep Time & Ordering Controls */}
          <div className="plate-card__foot">
            <div className="flex items-center gap-1 text-[11px] text-[#f5efe0]/65 font-medium">
              <Clock className="w-3 h-3 text-[#d4af37]" />
              <span>{item.prepTime || '10 min'}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isAvailable && (
                <button
                  type="button"
                  onClick={openNoteModal}
                  className={`plate-note-btn ${itemNote ? 'plate-note-btn--active' : ''}`}
                  title="Special instructions for kitchen"
                  aria-label="Chef note"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              )}

              {!isAvailable ? (
                <span className="text-[10px] font-bold text-rose-400 uppercase">
                  Sold Out
                </span>
              ) : cartQuantity > 0 ? (
                <div className="plate-stepper">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="plate-stepper__btn"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                  <span className="plate-stepper__count">
                    {cartQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="plate-stepper__btn"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="plate-order-btn"
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

  // 4. COMPACT 2-COLUMN GRID VIEW
  return (
    <>
      <div
        onClick={() => onSelectDish && onSelectDish(item)}
        style={{ '--card-i': Math.min(Math.max(Number(index) || 0, 0), 10) }}
        className={`group menu-card relative flex flex-col justify-between overflow-hidden cursor-pointer ${
          !isAvailable ? 'menu-card--unavailable' : ''
        }`}
      >
        <div>
          {/* Top row: dietary tags (left) and media tags (right), kept clear of the circular photo */}
          <div className="menu-card__top">
            <div className="flex flex-wrap gap-1 min-w-0">
              {isVeg && (
                <span className="menu-chip menu-chip--gold">
                  <Leaf className="w-2.5 h-2.5 fill-current" />
                  Veg
                </span>
              )}
              {isSpicy && (
                <span className="menu-chip menu-chip--spicy">
                  <Flame className="w-2.5 h-2.5 fill-current" />
                  Spicy
                </span>
              )}
              {item.isPopular && (
                <span className="menu-chip menu-chip--popular">
                  <Sparkles className="w-2.5 h-2.5" />
                  Popular
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="menu-chip menu-chip--count"
                title={`Photo Gallery (${photoCount} Photos)`}
              >
                <ImageIcon className="w-2.5 h-2.5 text-[#f0d27a]" />
                <span>{photoCount}</span>
              </span>
            </div>
          </div>

          {/* Circular photo frame with a warm gold glow */}
          <div className="menu-card__media">
            <div className="menu-card__halo" aria-hidden="true" />
            <div className="menu-card__photo relative overflow-hidden rounded-full">
              {dishVideo && !videoError ? (
                <video
                  src={dishVideo}
                  poster={thumb(safeDishImage)}
                  data-play-when-visible
                  loop
                  muted
                  playsInline
                  preload="none"
                  referrerPolicy="no-referrer"
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : safeDishImage && !imageError ? (
                <img
                  src={thumb(safeDishImage)}
                  alt={dishTitle}
                  onError={() => setImageError(true)}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="menu-card__fallback select-none">
                  <UtensilsCrossed className="w-5 h-5 stroke-[1.8] text-[#f0d27a] mb-1" />
                  <span className="menu-card__fallback-name">
                    {dishTitle}
                  </span>
                </div>
              )}

              <div className="menu-card__vignette" />

              {!isAvailable && (
                <div className="absolute inset-0 bg-[#021424]/80 flex items-center justify-center">
                  <span className="px-2.5 py-1 rounded-full bg-[#c8442b] text-[#f5efe0] font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider">
                    Sold Out
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dish details */}
          <div className="menu-card__body">
            <h3 className="menu-card__title line-clamp-1 mb-0.5">
              {dishTitle}
            </h3>

            {dishDesc && (
              <p className="menu-card__desc line-clamp-2">
                {dishDesc}
              </p>
            )}

            <div className="flex items-center gap-1.5 mt-1 mb-0.5">
              <span className="menu-chip menu-chip--rating">
                <Star className="w-2.5 h-2.5 fill-[#d4af37] text-[#d4af37]" />
                <span>{item.rating || '4.9'}</span>
              </span>
              <span className="menu-chip menu-chip--time">
                <Clock className="w-2.5 h-2.5 text-[#f0d27a]" />
                <span>{item.prepTime || '10 min'}</span>
              </span>
            </div>

            {/* Existing custom note tag */}
            {itemNote && (
              <div
                onClick={openNoteModal}
                className="menu-card__note"
                title="Edit note"
              >
                <MessageSquare className="w-2.5 h-2.5 text-[#d4af37] shrink-0" />
                <span className="truncate">"{itemNote}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer: gold price, chef note and Order / quantity controls */}
        <div className="menu-card__foot">
          <span className="menu-card__price">
            {formattedPrice}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAvailable && (
              <button
                type="button"
                onClick={openNoteModal}
                className={`menu-note-btn ${itemNote ? 'menu-note-btn--active' : ''}`}
                title="Add chef note"
                aria-label="Add chef note"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}

            {!isAvailable ? (
              <span className="menu-card__unavailable">
                Unavailable
              </span>
            ) : cartQuantity > 0 ? (
              <div className="menu-stepper">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="menu-stepper__btn"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3 stroke-[2.5]" />
                </button>
                <span className="menu-card__count">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="menu-stepper__btn"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="menu-order-btn"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
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
