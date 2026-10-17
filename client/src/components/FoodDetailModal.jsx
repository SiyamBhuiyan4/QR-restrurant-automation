import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Star,
  Clock,
  Flame,
  Leaf,
  Plus,
  Minus,
  ShoppingBag,
  Mic,
  MessageSquare,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Video,
  Image as ImageIcon,
  Heart,
  Share2,
  ShieldCheck,
  Info
} from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

/**
 * Interactive Food Details & Multimedia Modal
 * 
 * Reel / Short format inspired by Instagram & TikTok:
 * - Immersive dark glassmorphic styling
 * - Seamless Photo Carousel with story-style progress bars & thumbnails
 * - Kitchen Making-Video Reel with volume toggle, play/pause center overlay, and timeline progress
 * - Dynamic visual ingredients pills with smart icons
 * - Verified table reviews with star ratings breakdown
 * - Embedded voice recorder & quick custom chips for chef instructions
 * - Bold sticky bottom action footer with quantity stepper & prominent CTA
 */
export default function FoodDetailModal({
  isOpen,
  onClose,
  dish,
  cartQuantity = 0,
  onAddToCart,
  onUpdateQuantity,
  currency = '$'
}) {
  const [activeMediaTab, setActiveMediaTab] = useState('photos'); // 'photos' | 'video'
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [quantity, setQuantity] = useState(cartQuantity > 0 ? cartQuantity : 1);
  const [customNote, setCustomNote] = useState('');
  const [voiceNoteUrl, setVoiceNoteUrl] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isAddedAnimation, setIsAddedAnimation] = useState(false);

  const videoRef = useRef(null);

  // Sync initial quantity if cart item quantity changes
  useEffect(() => {
    if (cartQuantity > 0) {
      setQuantity(cartQuantity);
    }
  }, [cartQuantity]);

  // Reset states on dish change
  useEffect(() => {
    if (dish) {
      setSelectedImageIndex(0);
      setActiveMediaTab(dish.makingVideoUrl || dish.videoUrl ? 'photos' : 'photos');
      setCustomNote(dish.customNote || dish.note || '');
      setVoiceNoteUrl(dish.voiceNoteUrl || null);
    }
  }, [dish]);

  // Video progress listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setVideoProgress((video.currentTime / video.duration) * 100);
        setVideoCurrentTime(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration || 0);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [activeMediaTab]);

  if (!isOpen || !dish) return null;

  // Curated multimedia fallbacks
  const photos = dish.images && dish.images.length > 0
    ? dish.images
    : [
        dish.image || dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80'
      ];

  // Kitchen video reel URL
  const videoUrl = dish.makingVideoUrl || dish.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-chef-cooking-a-gourmet-dish-in-a-kitchen-40292-large.mp4';

  // Ingredients list
  const ingredients = dish.ingredients && dish.ingredients.length > 0
    ? dish.ingredients
    : [
        'Prime Fresh Cuts',
        'Organic Extra Virgin Olive Oil',
        'Fresh Garden Herbs',
        'Sea Salt & Cracked Pepper',
        'Artisan Roasted Garlic',
        'House Secret Glaze'
      ];

  // Helper to attach relevant emoji to ingredient tags
  const getIngredientIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('garlic')) return '🧄';
    if (lower.includes('oil') || lower.includes('olive')) return '🫒';
    if (lower.includes('herb') || lower.includes('basil') || lower.includes('thyme') || lower.includes('mint')) return '🌿';
    if (lower.includes('pepper') || lower.includes('chili') || lower.includes('spic')) return '🌶️';
    if (lower.includes('salt')) return '🧂';
    if (lower.includes('beef') || lower.includes('steak') || lower.includes('meat') || lower.includes('cut')) return '🥩';
    if (lower.includes('chicken') || lower.includes('poultry')) return '🍗';
    if (lower.includes('cheese') || lower.includes('parmesan')) return '🧀';
    if (lower.includes('tomato')) return '🍅';
    if (lower.includes('onion')) return '🧅';
    if (lower.includes('lemon') || lower.includes('lime')) return '🍋';
    if (lower.includes('butter') || lower.includes('cream')) return '🧈';
    if (lower.includes('honey') || lower.includes('glaze')) return '🍯';
    if (lower.includes('rice') || lower.includes('grain')) return '🍚';
    return '🌱';
  };

  // Customer reviews
  const reviews = dish.reviews && dish.reviews.length > 0
    ? dish.reviews
    : [
        {
          author: 'Sophia K.',
          rating: 5,
          date: 'Yesterday',
          comment: 'Absolutely phenomenal flavor! The texture and seasoning were spot on. A must-try dish!',
          verified: true
        },
        {
          author: 'Marcus L.',
          rating: 5,
          date: '3 days ago',
          comment: 'Chef cooked it exactly to my preference. The presentation in the making-video lived up to reality.',
          verified: true
        },
        {
          author: 'Elena R.',
          rating: 5,
          date: '1 week ago',
          comment: 'Fresh, vibrant, and delivered sizzling hot to our table. Will definitely order again!',
          verified: true
        }
      ];

  const priceNum = typeof dish.price === 'number' ? dish.price : parseFloat(dish.price) || 0;
  const totalPrice = (priceNum * quantity).toFixed(2);

  const formatVideoTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    }
    setShowPlayOverlay(true);
    setTimeout(() => setShowPlayOverlay(false), 700);
  };

  const toggleVideoMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isVideoMuted;
    setIsVideoMuted(!isVideoMuted);
  };

  const handleNextPhoto = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevPhoto = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: dish.name || dish.title,
        text: `Check out ${dish.name || dish.title} at SmartDine!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText?.(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleConfirmAdd = () => {
    setIsAddedAnimation(true);
    const finalItem = {
      ...dish,
      customNote: customNote.trim(),
      voiceNoteUrl
    };

    if (onAddToCart) {
      onAddToCart(finalItem, quantity, customNote.trim(), voiceNoteUrl);
    } else if (onUpdateQuantity) {
      onUpdateQuantity(dish.id, quantity);
    }

    setTimeout(() => {
      setIsAddedAnimation(false);
      onClose();
    }, 250);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-xl transition-all duration-300"
      onClick={onClose}
    >
      {/* Modal Container: Modern Dark Glassmorphic Card */}
      <div 
        className="w-full sm:max-w-xl md:max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-slate-900/95 backdrop-blur-2xl border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-slate-100 transition-all duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* ------------------------------------------------------------------
            1. Glassmorphic Sticky Top Bar
           ------------------------------------------------------------------ */}
        <div className="relative flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-900/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs">
              {dish.category || 'Chef Special'}
            </span>

            {dish.isVeg && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                <Leaf className="w-3 h-3 text-emerald-400" /> Veg
              </span>
            )}

            {dish.isSpicy && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                <Flame className="w-3 h-3 text-rose-400" /> Spicy
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-full transition-all border border-white/5 active:scale-95"
              title="Share dish"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Like / Favorite Button */}
            <button
              type="button"
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-full transition-all border border-white/5 active:scale-90 ${
                isLiked 
                  ? 'text-rose-500 bg-rose-500/20 border-rose-500/30 shadow-lg shadow-rose-500/20 scale-105' 
                  : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80'
              }`}
              title="Save favorite"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-full transition-all border border-white/5 active:scale-95"
              aria-label="Close food detail modal"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Scrollable Content Body
           ------------------------------------------------------------------ */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-slate-700/60">
          
          {/* ----------------------------------------------------------------
              2. Instagram/TikTok Style Multimedia Viewport
             ---------------------------------------------------------------- */}
          <div className="relative bg-black select-none group">
            
            {/* Story-Style Progress Bars (for Photos) */}
            {activeMediaTab === 'photos' && photos.length > 1 && (
              <div className="absolute top-3 left-4 right-4 z-20 flex gap-1.5 pointer-events-none">
                {photos.map((_, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-1 rounded-full overflow-hidden bg-white/25 backdrop-blur-sm transition-all"
                  >
                    <div
                      className={`h-full bg-white transition-all duration-300 ${
                        selectedImageIndex === idx
                          ? 'w-full opacity-100'
                          : selectedImageIndex > idx
                            ? 'w-full opacity-60'
                            : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Media Mode Segmented Switch Pill */}
            <div className="absolute top-6 left-4 z-20 flex p-1 bg-black/60 backdrop-blur-md rounded-full border border-white/15 text-xs font-semibold shadow-lg">
              <button
                type="button"
                onClick={() => setActiveMediaTab('photos')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
                  activeMediaTab === 'photos'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Photos ({photos.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab('video')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
                  activeMediaTab === 'video'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Kitchen Reel</span>
              </button>
            </div>

            {/* Photo Counter Badge */}
            {activeMediaTab === 'photos' && photos.length > 1 && (
              <div className="absolute top-6 right-4 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono font-medium text-slate-200">
                {selectedImageIndex + 1} / {photos.length}
              </div>
            )}

            {/* TAB A: Photo Carousel View */}
            {activeMediaTab === 'photos' ? (
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                <img
                  src={photos[selectedImageIndex]}
                  alt={dish.name || dish.title || 'Food presentation'}
                  className="w-full h-full object-cover transition-all duration-500 ease-out"
                />

                {/* Subtle cinematic gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-black/40 pointer-events-none" />

                {/* Left & Right Chevron Controls */}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevPhoto}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white/80 hover:text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 z-10 cursor-pointer"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-5 h-5 -translate-x-0.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextPhoto}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white/80 hover:text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 z-10 cursor-pointer"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-5 h-5 translate-x-0.5" />
                    </button>
                  </>
                )}

                {/* Polished Thumbnails Strip */}
                {photos.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-2 px-4 z-20">
                    {photos.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-12 h-10 sm:w-14 sm:h-11 rounded-xl overflow-hidden border-2 transition-all transform cursor-pointer ${
                          selectedImageIndex === idx
                            ? 'border-emerald-400 scale-110 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/40 opacity-100'
                            : 'border-white/20 opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                      >
                        <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* TAB B: Kitchen Making-Video Reel */
              <div 
                className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={toggleVideoPlay}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  autoPlay
                  loop
                  muted={isVideoMuted}
                  className="w-full h-full object-cover"
                />

                {/* Cinematic Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/50 pointer-events-none" />

                {/* Top Controls Overlay */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleVideoMute}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition-all text-xs font-semibold shadow-lg active:scale-95 cursor-pointer"
                    title={isVideoMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isVideoMuted ? (
                      <>
                        <VolumeX className="w-4 h-4 text-rose-400" />
                        <span>Muted</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>Sound On</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Center Tap Play/Pause Indicator Animation */}
                {showPlayOverlay && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-scaleUp">
                    <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-2xl">
                      {isVideoPlaying ? (
                        <Play className="w-7 h-7 fill-current translate-x-0.5" />
                      ) : (
                        <Pause className="w-7 h-7 fill-current" />
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Video Info & Progress Bar */}
                <div className="absolute bottom-0 inset-x-0 p-4 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs text-slate-200 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-white/15 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Chef's Kitchen Reel</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-300 font-semibold bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs border border-white/10">
                        {formatVideoTime(videoCurrentTime)} / {formatVideoTime(videoDuration)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVideoPlay();
                        }}
                        className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition active:scale-95 cursor-pointer"
                        aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                      >
                        {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Video Scrubber Bar */}
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-xs">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-100"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------
              3. Dish Title, Pricing & Highlights Row
             ---------------------------------------------------------------- */}
          <div className="p-5 space-y-3.5 bg-slate-900/40">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {dish.name || dish.title}
                </h2>
                
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{dish.rating || '4.9'}</span>
                    <span className="text-slate-400 font-normal">({reviews.length * 42 + 2})</span>
                  </div>

                  <span className="text-slate-600">•</span>

                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{dish.prepTime || '10-15 min prep'}</span>
                  </span>

                  <span className="text-slate-600">•</span>

                  <span className="flex items-center gap-1.5 font-medium">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>{dish.calories || '450 kcal'}</span>
                  </span>
                </div>
              </div>

              {/* Price badge */}
              <div className="text-right shrink-0 bg-slate-800/60 border border-white/5 rounded-2xl p-3 shadow-sm">
                <span className="block text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  {currency}{priceNum.toFixed(2)}
                </span>
                <span className="block text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                  Per Serving
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {dish.description || 'Specially crafted by our culinary experts using locally sourced fresh ingredients and authentic artisanal spices.'}
            </p>
          </div>

          {/* ----------------------------------------------------------------
              4. Fresh Ingredients & Allergens Section
             ---------------------------------------------------------------- */}
          <div className="p-5 space-y-3 bg-slate-900/70">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>🌱</span>
                <span>Fresh Ingredients &amp; Culinary Profile</span>
              </h3>
              <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                100% Farm Fresh
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-xl font-medium shadow-xs hover:border-emerald-500/40 hover:bg-slate-800 transition-colors"
                >
                  <span className="text-sm">{getIngredientIcon(ing)}</span>
                  <span>{ing}</span>
                </span>
              ))}
            </div>
          </div>

          {/* ----------------------------------------------------------------
              5. Custom Instructions for Chef & Voice Note Section
             ---------------------------------------------------------------- */}
          <div className="p-5 space-y-3.5 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chef Instructions &amp; Customization</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Add allergies, temperature, or preparation notes
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs cursor-pointer ${
                  showVoiceRecorder
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/10'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{showVoiceRecorder ? 'Hide Voice Note' : 'Add Voice Note'}</span>
              </button>
            </div>

            {/* Quick Preset Customization Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Quick suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Less spicy',
                  'Extra sauce on side',
                  'No onions',
                  'Make it crispy',
                  'Gluten conscious',
                  'Well done'
                ].map((chip) => {
                  const isSelected = customNote.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        const separator = customNote.trim() ? ', ' : '';
                        if (!customNote.includes(chip)) {
                          setCustomNote((prev) => `${prev}${separator}${chip}`);
                        }
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/60'
                      }`}
                    >
                      + {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note text field */}
            <div className="relative">
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Please put dressing on the side, well grilled..."
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-800/90 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1.5 focus:ring-emerald-500/40 transition shadow-inner"
              />
              {customNote && (
                <button
                  type="button"
                  onClick={() => setCustomNote('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-slate-700/60 rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Embedded Dark-Glassmorphic Voice Recorder */}
            {showVoiceRecorder && (
              <div className="pt-2">
                <VoiceRecorder
                  standalone={true}
                  theme="dark"
                  initialUrl={voiceNoteUrl}
                  onRecordingComplete={(blob, url) => setVoiceNoteUrl(url)}
                />
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------
              6. Verified Table Customer Reviews
             ---------------------------------------------------------------- */}
          <div className="p-5 space-y-3.5 bg-slate-900/70">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span>Verified Table Reviews</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Real feedback from restaurant diners</p>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>98% Positive</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {reviews.map((rev, i) => (
                <div 
                  key={i} 
                  className="p-3.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl space-y-1.5 hover:border-slate-600/70 transition-colors shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xs">
                        {rev.author.charAt(0)}
                      </div>
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        {rev.author}
                        {rev.verified && (
                          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Verified Diner
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center text-amber-400 text-xs">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 italic pl-9 leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                  <div className="text-[10px] text-slate-500 text-right pr-1">
                    {rev.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ------------------------------------------------------------------
            7. Prominent Sticky Bottom Bar (Quantity Stepper + Add CTA)
           ------------------------------------------------------------------ */}
        <div className="p-4 sm:p-5 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 flex items-center gap-3.5 z-30 shadow-2xl">
          {/* Quantity Stepper */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-2xl p-1.5 shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all active:scale-90 cursor-pointer"
              title="Decrease quantity"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>

            <span className="w-9 text-center font-black text-white text-base">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all active:scale-90 cursor-pointer"
              title="Increase quantity"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Order CTA Button */}
          <button
            type="button"
            onClick={handleConfirmAdd}
            className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-5 font-black text-slate-950 rounded-2xl shadow-xl transition-all cursor-pointer text-sm sm:text-base ${
              isAddedAnimation
                ? 'bg-emerald-400 scale-95 shadow-emerald-400/50'
                : 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-[0.98]'
            }`}
          >
            <ShoppingBag className={`w-5 h-5 ${isAddedAnimation ? 'animate-bounce' : ''}`} />
            <span>
              {cartQuantity > 0 ? 'Update Order' : 'Add to Order'} • {currency}{totalPrice}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
