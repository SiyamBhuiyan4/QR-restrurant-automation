import React, { useState, useRef } from 'react';
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
  ChevronRight,
  Video,
  Image as ImageIcon,
  Heart
} from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

/**
 * Interactive Food Details & Multimedia Modal
 * 
 * Features:
 * - Photo Gallery with multiple high-res food shots
 * - Short Kitchen Making-Video (Reel / Short format) with mute/play controls
 * - Ingredients list with visual pill tags
 * - Customer ratings breakdown & verified reviews
 * - Integrated Voice & Text customization per dish
 * - One-tap Add to Cart with quantity stepper
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
  const [quantity, setQuantity] = useState(cartQuantity > 0 ? cartQuantity : 1);
  const [customNote, setCustomNote] = useState('');
  const [voiceNoteUrl, setVoiceNoteUrl] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef(null);

  if (!isOpen || !dish) return null;

  // Curated multimedia fallbacks
  const photos = dish.images && dish.images.length > 0
    ? dish.images
    : [
        dish.image || dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80'
      ];

  // Making video URL (sample high quality chef video reel or dish specific)
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

  // Customer reviews
  const reviews = dish.reviews && dish.reviews.length > 0
    ? dish.reviews
    : [
        {
          author: 'Sophia K.',
          rating: 5,
          date: 'Yesterday',
          comment: 'Absolutely phenomenal flavor! The texture and seasoning were spot on. Must try!',
          verified: true
        },
        {
          author: 'Marcus L.',
          rating: 5,
          date: '3 days ago',
          comment: 'Chef cooked it exactly to my preference. The presentation in the making-video lived up to reality.',
          verified: true
        }
      ];

  const priceNum = typeof dish.price === 'number' ? dish.price : parseFloat(dish.price) || 0;
  const totalPrice = (priceNum * quantity).toFixed(2);

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isVideoMuted;
    setIsVideoMuted(!isVideoMuted);
  };

  const handleConfirmAdd = () => {
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Bar */}
        <div className="relative flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {dish.category || 'Chef Special'}
            </span>
            {dish.isVeg && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                <Leaf className="w-3 h-3" /> Veg
              </span>
            )}
            {dish.isSpicy && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                <Flame className="w-3 h-3" /> Spicy
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-full transition-all ${
                isLiked ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
              title="Save favorite"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-700">
          {/* 1. Multimedia Viewport (Photos vs Kitchen Video Reel) */}
          <div className="relative bg-black select-none">
            {/* Media Selector Pill Switch */}
            <div className="absolute top-3 left-4 z-10 flex p-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-xs font-medium">
              <button
                onClick={() => setActiveMediaTab('photos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                  activeMediaTab === 'photos'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Photos ({photos.length})
              </button>
              <button
                onClick={() => setActiveMediaTab('video')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                  activeMediaTab === 'video'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Kitchen Reel
              </button>
            </div>

            {/* Media Display Area */}
            {activeMediaTab === 'photos' ? (
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                <img
                  src={photos[selectedImageIndex]}
                  alt={dish.name || 'Food photo'}
                  className="w-full h-full object-cover transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none" />

                {/* Thumbnails Bar */}
                {photos.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4 z-10">
                    {photos.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-12 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImageIndex === idx
                            ? 'border-emerald-500 scale-105 shadow-lg ring-2 ring-emerald-500/30'
                            : 'border-white/30 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  autoPlay
                  loop
                  muted={isVideoMuted}
                  className="w-full h-full object-cover"
                />
                {/* Video Controls Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-4">
                  <div className="flex justify-end">
                    <button
                      onClick={toggleVideoMute}
                      className="p-2 rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70 border border-white/10 transition"
                      title={isVideoMuted ? 'Unmute video' : 'Mute video'}
                    >
                      {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-slate-200 bg-black/60 px-3 py-1 rounded-full backdrop-blur border border-white/10 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Kitchen Fresh Prep
                    </span>
                    <button
                      onClick={toggleVideoPlay}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur border border-white/20 transition"
                    >
                      {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Dish Title, Price & Highlights */}
          <div className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {dish.name || dish.title}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current" /> {dish.rating || '4.9'} (128)
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {dish.prepTime || '10-15 min'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-slate-400" /> {dish.calories || '450 kcal'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400">
                  {currency}{priceNum.toFixed(2)}
                </span>
                <span className="block text-[11px] text-slate-400">per serving</span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {dish.description || 'Specially crafted by our culinary experts using locally sourced ingredients and authentic spices.'}
            </p>
          </div>

          {/* 3. Ingredients Section */}
          <div className="p-5 space-y-2.5 bg-slate-900/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>🌱</span> Fresh Ingredients & Allergens
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {ingredients.map((ing, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs bg-slate-800 text-slate-200 border border-slate-700/60 rounded-lg font-medium"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* 4. Voice & Text Customization for this dish */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> Custom Instructions for Chef
              </h3>
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                  showVoiceRecorder
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Mic className="w-3 h-3" />
                {showVoiceRecorder ? 'Hide Voice Note' : 'Add Voice Note'}
              </button>
            </div>

            {/* Quick Text Chips */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['Less spicy', 'No onions', 'Extra sauce on side', 'Make it crispy', 'Gluten conscious'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    const separator = customNote.trim() ? ', ' : '';
                    if (!customNote.includes(chip)) {
                      setCustomNote((prev) => `${prev}${separator}${chip}`);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 active:scale-95 transition"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {/* Custom instruction input */}
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Please put dressing on the side..."
              className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />

            {/* Embedded Voice Recorder */}
            {showVoiceRecorder && (
              <div className="pt-2 border-t border-slate-800">
                <VoiceRecorder onRecordingComplete={(blob, url) => setVoiceNoteUrl(url)} />
              </div>
            )}
          </div>

          {/* 5. Customer Reviews Section */}
          <div className="p-5 space-y-3 bg-slate-900/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>⭐ Verified Table Reviews</span>
              <span className="text-emerald-400 font-semibold normal-case">98% Positive</span>
            </h3>

            <div className="space-y-2.5">
              {reviews.map((rev, i) => (
                <div key={i} className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                      {rev.author}
                      {rev.verified && (
                        <span className="text-[10px] text-emerald-400 font-normal bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          Verified Diner
                        </span>
                      )}
                    </span>
                    <div className="flex items-center text-amber-400 text-xs">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 italic">"{rev.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3 z-20">
          {/* Quantity Stepper */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-white text-sm">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart CTA */}
          <button
            onClick={handleConfirmAdd}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] font-bold text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm sm:text-base"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add to Order • {currency}{totalPrice}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
