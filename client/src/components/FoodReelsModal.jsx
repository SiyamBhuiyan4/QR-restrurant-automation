import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ShoppingBag,
  Sparkles,
  ChefHat,
  ChevronUp,
  ChevronDown,
  Send,
  Plus,
  Minus,
  Check,
  Flame,
  Leaf,
  Layers,
  Clock,
  ThumbsUp,
  ArrowRight,
  Smile,
  Info
} from 'lucide-react';
import '../styles/food-reels.css';

// Curated high-res streaming demo food reels if dishes don't have custom videos
export const DEMO_FOOD_REELS = [
  {
    id: 'reel-wagyu-smash',
    dishId: 1,
    name: 'Double Wagyu Smash Burger',
    category: 'Burgers',
    price: 16.50,
    videoUrl: '/videos/reel-chef.mp4',
    poster: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
    description: 'Double custom wagyu patty seared crisp on a 500°F flat-top, double aged cheddar melt, caramelized shallots, secret sauce, and toasted milk brioche.',
    chefNote: 'Our signature house-ground wagyu patty creates an ultra-crisp umami crust while keeping the center succulent.',
    prepTime: '12 min',
    isSpicy: false,
    isVeg: false,
    ingredients: [
      'Fresh Ground Wagyu Chuck (70/30)',
      'Aged Wisconsin Sharp Cheddar',
      'Artisan Butter Brioche Bun',
      'Sweet Caramelized Onion Confit',
      'House-Cured Dill Pickles',
      'Smoked Paprika Burger Aioli'
    ],
    initialLikes: 1420,
    initialComments: [
      { id: 'c1', author: 'Foodie_Dhaka', text: 'That cheese melt at the end is unbelievable! 🔥', time: '10m ago', likes: 18 },
      { id: 'c2', author: 'Table 4 Diner', text: 'Ordered this 5 minutes ago, smells heavenly!', time: '25m ago', likes: 9 },
      { id: 'c3', author: 'BurgerKingCritic', text: 'Crispy edges on smash burgers are perfection.', time: '1h ago', likes: 4 }
    ]
  },
  {
    id: 'reel-balado-wings',
    dishId: 'starter-balado-wings',
    name: 'Balado Glazed Crisp Wings',
    category: 'Starters',
    price: 14.50,
    videoUrl: '/videos/reel-chef.mp4',
    poster: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
    description: 'Flash-fried organic chicken wings tossed in fiery Minangkabau red chili glaze, crushed kaffir lime leaf, and caramelized shallot oil.',
    chefNote: 'Glazed sizzling hot straight from the wok to preserve the exterior crunch while sealing in the zesty chili aroma.',
    prepTime: '15 min',
    isSpicy: true,
    isVeg: false,
    ingredients: [
      'Free-Range Chicken Wings',
      'Crushed Red Curly Chilies',
      'Shallots & Garlic Confit',
      'Fresh Kaffir Lime Leaves',
      'Indonesian Coconut Palm Sugar',
      'Toasted Sesame & Scallions'
    ],
    initialLikes: 890,
    initialComments: [
      { id: 'c4', author: 'SpicyLover99', text: 'Is it spicy enough for high tolerance?', time: '30m ago', likes: 12 },
      { id: 'c5', author: 'Chef_Tanvir', text: 'The lime leaf aroma sets this apart from normal wings!', time: '2h ago', likes: 7 }
    ]
  },
  {
    id: 'reel-truffle-fries',
    dishId: 'starter-1',
    name: 'Truffle & Herb Loaded Fries',
    category: 'Starters',
    price: 8.50,
    videoUrl: '/videos/reel-chef.mp4',
    poster: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&auto=format&fit=crop&q=80',
    description: 'Crispy skin-on russet potatoes infused with aromatic white Italian truffle oil, 24-month aged parmesan snowfall, and roasted garlic aioli.',
    chefNote: 'Double-fried at two different temperatures to ensure the exterior stays crisp even under generous parmesan grating.',
    prepTime: '8 min',
    isSpicy: false,
    isVeg: true,
    ingredients: [
      'Hand-Cut Idaho Russet Potatoes',
      'Pure White Truffle Infused Olive Oil',
      '24-Month Parmigiano-Reggiano',
      'Fresh Chopped Italian Parsley',
      'Sea Salt Crystals & Cracked Black Pepper',
      'Roasted Garlic Aioli Dip'
    ],
    initialLikes: 2150,
    initialComments: [
      { id: 'c6', author: 'Anonymous Guest', text: 'You can never have too much parmesan on fries 🍟', time: '15m ago', likes: 34 },
      { id: 'c7', author: 'DineInMaster', text: 'A must-order every single time I visit!', time: '3h ago', likes: 14 }
    ]
  },
  {
    id: 'reel-salmon',
    dishId: 4,
    name: 'Pan-Seared Atlantic Salmon',
    category: 'Mains',
    price: 24.50,
    videoUrl: '/videos/reel-chef.mp4',
    poster: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&auto=format&fit=crop&q=80',
    description: 'Crisp-skin Norwegian salmon filet served over saffron risotto, tender asparagus spears, and a lemon-dill beurre blanc.',
    chefNote: 'Seared skin-down in cast iron for 4 minutes until glass-crisp, then basted with thyme compound butter.',
    prepTime: '18 min',
    isSpicy: false,
    isVeg: false,
    ingredients: [
      'Wild Atlantic Salmon Fillet',
      'Spanish Saffron Risotto',
      'Charred Baby Asparagus',
      'Lemon Dill Beurre Blanc',
      'French Thyme & Chive Butter'
    ],
    initialLikes: 1680,
    initialComments: [
      { id: 'c8', author: 'SeafoodLover', text: 'Look at that crispy skin sizzle!', time: '45m ago', likes: 21 }
    ]
  },
  {
    id: 'reel-lava-cake',
    dishId: 7,
    name: 'Dark Chocolate Lava Cake',
    category: 'Desserts',
    price: 9.50,
    videoUrl: '/videos/reel-chef.mp4',
    poster: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80',
    description: 'Warm Valrhona molten dark chocolate cake flowing onto Madagascar vanilla bean gelato and crushed raspberry dust.',
    chefNote: 'Baked to exact 11 minutes so the chocolate core flows warm and silky upon the first spoon cut.',
    prepTime: '14 min',
    isSpicy: false,
    isVeg: true,
    ingredients: [
      'Valrhona 70% Dark Chocolate',
      'French Grass-Fed Cultured Butter',
      'Free-Range Organic Eggs',
      'Madagascar Bourbon Vanilla Gelato',
      'Tart Raspberry Coulis & Mint'
    ],
    initialLikes: 3410,
    initialComments: [
      { id: 'c9', author: 'SweetTooth', text: 'The chocolate eruption is glorious! 🤤', time: '12m ago', likes: 52 },
      { id: 'c10', author: 'Table 9', text: 'Best dessert in the city hands down.', time: '1h ago', likes: 19 }
    ]
  }
];

export default function FoodReelsModal({
  isOpen,
  onClose,
  menuItems = [],
  onAddToCart,
  initialDishId = null,
  tableNumber = null
}) {
  // Combine real menu items marked for reels + demo food reels
  const activeReels = useMemo(() => {
    const list = [];

    // Filter menu items that have a making_video_url and are allowed in reels (show_in_reels !== 0 and !== false)
    if (Array.isArray(menuItems) && menuItems.length > 0) {
      menuItems.forEach((item) => {
        const vidUrl = item.making_video_url || item.makingVideoUrl || item.videoUrl;
        const isReelAllowed = item.show_in_reels === undefined || item.show_in_reels === 1 || item.show_in_reels === true || item.is_reel === 1;

        if (vidUrl && isReelAllowed) {
          list.push({
            id: `item-${item.id}`,
            dishId: item.id,
            name: item.name || item.title,
            category: item.category_name || item.category || 'Kitchen Specials',
            price: Number(item.price) || 0,
            videoUrl: vidUrl,
            poster: item.image_url || item.imageUrl || item.image || '',
            description: item.description || 'Chef special culinary creation.',
            chefNote: item.chefNote || 'Prepared fresh upon order by our kitchen team.',
            prepTime: item.prepTime || '15 min',
            isSpicy: Boolean(item.is_spicy || item.isSpicy),
            isVeg: Boolean(item.is_veg || item.isVeg),
            ingredients: Array.isArray(item.ingredients) && item.ingredients.length > 0
              ? item.ingredients
              : ['Fresh Gourmet Ingredients', 'Chef Seasoning', 'Herb Garnish', 'Extra Virgin Olive Oil'],
            initialLikes: 500 + Math.floor(Math.random() * 800),
            initialComments: [
              { id: 'cm-1', author: 'Guest Diner', text: 'Looks so delicious! Adding this right away.', time: '5m ago', likes: 6 }
            ],
            originalItem: item
          });
        }
      });
    }

    // If fewer than 3 dishes have reels, supplement with rich demo reels
    if (list.length < DEMO_FOOD_REELS.length) {
      DEMO_FOOD_REELS.forEach((demo) => {
        if (!list.some((r) => r.dishId === demo.dishId || r.name === demo.name)) {
          // Attempt to find matching item in menuItems to get real pricing/cart hook
          const matchedItem = menuItems.find((m) => String(m.id) === String(demo.dishId) || (m.name && m.name.toLowerCase().includes(demo.name.toLowerCase().split(' ')[0])));
          list.push({
            ...demo,
            price: matchedItem ? Number(matchedItem.price) : demo.price,
            originalItem: matchedItem || {
              id: demo.dishId,
              name: demo.name,
              price: demo.price,
              description: demo.description,
              image_url: demo.poster
            }
          });
        }
      });
    }

    return list.length > 0 ? list : DEMO_FOOD_REELS;
  }, [menuItems]);

  // Current reel index
  const [currentIndex, setCurrentIndex] = useState(0);

  // When initialDishId changes, set current index to that dish
  useEffect(() => {
    if (initialDishId && activeReels.length > 0) {
      const idx = activeReels.findIndex((r) => String(r.dishId) === String(initialDishId));
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [initialDishId, activeReels]);

  const currentReel = activeReels[currentIndex] || activeReels[0];

  // Play / Pause & Volume states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  // Video element reference
  const videoRef = useRef(null);

  // Ingredients Blur Modal State
  const [showIngredients, setShowIngredients] = useState(false);

  // Anonymous Comments Drawer State
  const [showComments, setShowComments] = useState(false);
  const [commentsMap, setCommentsMap] = useState(() => {
    try {
      const saved = localStorage.getItem('smartdine_reels_comments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [newCommentText, setNewCommentText] = useState('');
  const [guestAuthorName, setGuestAuthorName] = useState('');

  // Likes Map State
  const [likesMap, setLikesMap] = useState(() => {
    try {
      const saved = localStorage.getItem('smartdine_reels_likes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Quantity Selector for Add to Cart
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Reset states on reel change
  useEffect(() => {
    setShowIngredients(false);
    setOrderQuantity(1);
    setAddedSuccess(false);
    setIsPlaying(true);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay was prevented, mute to allow play
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [currentIndex]);

  // Touch Swipe Gesture for Next/Prev Reel
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!touchStartY.current || !touchEndY.current) return;
    const diff = touchStartY.current - touchEndY.current;
    // Swipe UP -> Next Reel
    if (diff > 50) {
      goToNextReel();
    }
    // Swipe DOWN -> Prev Reel
    else if (diff < -50) {
      goToPrevReel();
    }
    touchStartY.current = 0;
    touchEndY.current = 0;
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showIngredients) setShowIngredients(false);
        else if (showComments) setShowComments(false);
        else onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNextReel();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrevReel();
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showIngredients, showComments, currentIndex, activeReels.length]);

  const goToNextReel = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1 < activeReels.length ? prev + 1 : 0));
  }, [activeReels.length]);

  const goToPrevReel = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : activeReels.length - 1));
  }, [activeReels.length]);

  // Play / Pause Toggle
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
  };

  // Double tap to love
  const lastTapRef = useRef(0);
  const handleVideoTap = (e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double Tap!
      triggerLoveAction();
    } else {
      // Single Tap!
      togglePlayPause();
    }
    lastTapRef.current = now;
  };

  // Love / Like Action
  const isLoved = Boolean(likesMap[currentReel?.id]?.loved);
  const currentLikesCount = (currentReel?.initialLikes || 500) + (likesMap[currentReel?.id]?.count || 0);

  const triggerLoveAction = () => {
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 850);

    setLikesMap((prev) => {
      const cur = prev[currentReel.id] || { count: 0, loved: false };
      const nextLoved = !cur.loved;
      const nextCount = nextLoved ? cur.count + 1 : Math.max(0, cur.count - 1);
      const nextMap = {
        ...prev,
        [currentReel.id]: { count: nextCount, loved: nextLoved }
      };
      try {
        localStorage.setItem('smartdine_reels_likes', JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });
  };

  // Anonymous Comment Submission
  const activeComments = useMemo(() => {
    const stored = commentsMap[currentReel?.id] || [];
    const defaults = currentReel?.initialComments || [];
    return [...stored, ...defaults];
  }, [commentsMap, currentReel]);

  const handlePostComment = (e) => {
    e?.preventDefault();
    if (!newCommentText.trim()) return;

    const author = guestAuthorName.trim() || `Diner (Table #${tableNumber || 'Guest'})`;
    const newEntry = {
      id: `cm-${Date.now()}`,
      author,
      text: newCommentText.trim(),
      time: 'Just now',
      likes: 0
    };

    setCommentsMap((prev) => {
      const list = prev[currentReel.id] || [];
      const updated = [newEntry, ...list];
      const nextMap = { ...prev, [currentReel.id]: updated };
      try {
        localStorage.setItem('smartdine_reels_comments', JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });

    setNewCommentText('');
  };

  // Add to Cart handler
  const handleOrderThisDish = () => {
    if (!currentReel || !onAddToCart) return;
    const itemToAdd = currentReel.originalItem || {
      id: currentReel.dishId,
      name: currentReel.name,
      price: currentReel.price,
      description: currentReel.description,
      image_url: currentReel.poster
    };

    onAddToCart(itemToAdd, orderQuantity);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  if (!isOpen || !currentReel) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden animate-fadeIn select-none">
      {/* ── Main Reel Viewport (Mobile 9:16 aspect ratio or full height desktop) ── */}
      <div
        className="relative w-full h-full max-w-md sm:h-[94vh] sm:rounded-3xl sm:border sm:border-white/10 sm:overflow-hidden bg-[#0a0a0f] shadow-2xl flex flex-col justify-between"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── Top Header Controls ── */}
        <div className="reel-vignette-top" />
        <header className="relative z-20 flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 backdrop-blur-md border border-white/15 rounded-full text-xs font-black text-white shadow-lg">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
              <span className="tracking-wide uppercase text-[11px] text-[#FF7A45]">FOOD REEL</span>
              <span className="text-white/40 text-[10px]">&bull;</span>
              <span className="text-white/80 text-[11px] font-semibold">{currentIndex + 1}/{activeReels.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition hover:bg-black/80 hover:scale-105 active:scale-95 cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white/80" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Close Reels */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition hover:bg-white/20 hover:scale-105 active:scale-95 cursor-pointer"
              title="Close Reels"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ── Video Player Area ── */}
        <div
          className="absolute inset-0 z-0 reel-video-wrapper cursor-pointer"
          onClick={handleVideoTap}
        >
          <video
            ref={videoRef}
            src={currentReel.videoUrl}
            poster={currentReel.poster}
            playsInline
            loop
            autoPlay
            muted={isMuted}
            className={`reel-video ${showIngredients ? 'is-blurred' : ''}`}
          />

          {/* Central Play / Pause Flash Indicator */}
          {showPlayIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-2xl animate-scaleUp">
                {isPlaying ? <Play className="w-10 h-10 ml-1 fill-white" /> : <Pause className="w-10 h-10 fill-white" />}
              </div>
            </div>
          )}

          {/* Double Tap Heart Burst Animation */}
          {heartBurst && (
            <div className="heart-burst-animate">
              <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_25px_rgba(244,63,94,0.9)]" />
            </div>
          )}
        </div>

        {/* ── Desktop Up / Down Reel Jump Controls ── */}
        <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={goToPrevReel}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:bg-black/80 flex items-center justify-center transition cursor-pointer"
            title="Previous Reel"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goToNextReel}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:bg-black/80 flex items-center justify-center transition cursor-pointer"
            title="Next Reel"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* ── Facebook / Instagram Style Right Side Action Bar ── */}
        <div className="absolute right-3.5 bottom-32 z-20 flex flex-col items-center gap-4 pointer-events-auto">
          {/* 1. Love / Like Button */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={triggerLoveAction}
              className={`reel-action-btn ${isLoved ? 'active-heart' : ''}`}
              title="Like this Reel"
            >
              <Heart className={`w-6 h-6 transition-all ${isLoved ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white'}`} />
            </button>
            <span className="text-[11px] font-black text-white mt-1 drop-shadow-md">
              {currentLikesCount >= 1000 ? `${(currentLikesCount / 1000).toFixed(1)}k` : currentLikesCount}
            </span>
          </div>

          {/* 2. Comments Button */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowComments(true)}
              className="reel-action-btn"
              title="Anonymous Comments"
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </button>
            <span className="text-[11px] font-black text-white mt-1 drop-shadow-md">
              {activeComments.length}
            </span>
          </div>

          {/* 3. Ingredients Glassmorphic Button */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowIngredients((prev) => !prev)}
              className={`reel-action-btn ${showIngredients ? 'bg-amber-500/40 border-amber-400 text-amber-300 ring-2 ring-amber-400/50' : ''}`}
              title="View Ingredients & Chef Recipe"
            >
              <Sparkles className={`w-6 h-6 ${showIngredients ? 'text-amber-300 animate-spin' : 'text-amber-400'}`} />
            </button>
            <span className="text-[10px] font-black text-amber-300 mt-1 uppercase tracking-tight drop-shadow-md">
              Recipe
            </span>
          </div>

          {/* 4. Share Button */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: currentReel.name,
                    text: `Watch how our chef makes ${currentReel.name} on SmartDine!`,
                    url: window.location.href
                  }).catch(() => {});
                } else if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Reel link copied to clipboard!');
                }
              }}
              className="reel-action-btn"
              title="Share Reel"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <span className="text-[10px] font-semibold text-white/80 mt-1 drop-shadow-md">
              Share
            </span>
          </div>
        </div>

        {/* ── Ingredients Blur Overlay (Smoothly blurs video & reveals recipe) ── */}
        {showIngredients && (
          <div
            className="absolute inset-x-3 bottom-28 top-20 z-30 flex flex-col justify-end pointer-events-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIngredients(false);
            }}
          >
            <div className="ingredients-glass-card rounded-3xl p-5 sm:p-6 text-white max-h-[82%] overflow-y-auto border border-amber-500/30">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Culinary Ingredients & Notes
                    </h4>
                    <p className="text-[11px] text-white/60">Crafted by Executive Chef</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIngredients(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dish Name */}
              <h3 className="text-lg sm:text-xl font-black text-white mb-1.5 [font-family:Playfair_Display,Georgia,serif]">
                {currentReel.name}
              </h3>
              <p className="text-xs text-white/80 leading-relaxed mb-4">
                {currentReel.description}
              </p>

              {/* Chef Note */}
              {currentReel.chefNote && (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 mb-4 text-xs text-amber-200/90 leading-relaxed">
                  <span className="font-bold text-amber-400">👨‍🍳 Chef's Technique:</span> {currentReel.chefNote}
                </div>
              )}

              {/* Ingredients List */}
              <h5 className="text-[11px] font-black uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" />
                <span>Prime Fresh Ingredients:</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {currentReel.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{ing}</span>
                  </div>
                ))}
              </div>

              {/* Quick Specs */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/10 text-xs text-white/70">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {currentReel.prepTime}
                </span>
                {currentReel.isSpicy && (
                  <span className="flex items-center gap-1 text-rose-400 font-bold">
                    <Flame className="w-3.5 h-3.5" />
                    Spicy Specialty
                  </span>
                )}
                {currentReel.isVeg && (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Leaf className="w-3.5 h-3.5" />
                    Vegetarian
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Anonymous Comments Drawer (Facebook Reels Style) ── */}
        {showComments && (
          <div className="absolute inset-x-0 bottom-0 top-1/4 z-30 comments-drawer rounded-t-3xl flex flex-col p-4 sm:p-5 pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#FF7A45]" />
                <h3 className="text-sm font-extrabold text-white">
                  Anonymous Foodie Comments ({activeComments.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comment Thread */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {activeComments.length === 0 ? (
                <div className="text-center py-10 text-white/50 text-xs">
                  No comments yet. Be the first diner to comment on this dish!
                </div>
              ) : (
                activeComments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {c.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-amber-300 truncate">{c.author}</span>
                        <span className="text-[10px] text-white/40">{c.time}</span>
                      </div>
                      <p className="text-xs text-white/90 mt-1 leading-relaxed break-words">
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Anonymous Comment Form */}
            <form onSubmit={handlePostComment} className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestAuthorName}
                  onChange={(e) => setGuestAuthorName(e.target.value)}
                  placeholder={`Your Nickname (default: Table #${tableNumber || 'Guest'})`}
                  className="w-1/2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#FF5A26]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Leave an anonymous foodie review..."
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#FF5A26]"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="w-10 h-10 rounded-full bg-[#FF5A26] hover:bg-[#FF7A45] disabled:opacity-40 text-white flex items-center justify-center transition shadow-lg shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Bottom Overlay: Dish Details & Fixed "Add to Cart" Order Button ── */}
        <div className="reel-vignette-bottom" />
        <footer className="relative z-20 p-4 sm:p-5 pt-0 pointer-events-auto space-y-3">
          {/* Dish Meta Info */}
          <div className="max-w-[75%] space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/15 backdrop-blur-md text-amber-300 border border-white/15">
                {currentReel.category}
              </span>
              <span className="text-base sm:text-lg font-black text-white">
                ${Number(currentReel.price).toFixed(2)}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow-lg [font-family:Playfair_Display,Georgia,serif]">
              {currentReel.name}
            </h2>
            <p className="text-xs text-white/80 line-clamp-2 leading-relaxed drop-shadow-sm font-normal">
              {currentReel.description}
            </p>
          </div>

          {/* ── ALWAYS-VISIBLE "ADD TO CART" ORDER BUTTON ── */}
          <div className="flex items-center gap-2.5 pt-1">
            {/* Quantity Selector */}
            <div className="flex items-center bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-1 text-white shrink-0">
              <button
                type="button"
                onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center text-xs font-black">
                {orderQuantity}
              </span>
              <button
                type="button"
                onClick={() => setOrderQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Glowing Add to Cart Order Button */}
            <button
              type="button"
              onClick={handleOrderThisDish}
              className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer active:scale-95 ${
                addedSuccess
                  ? 'bg-emerald-600 shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-[#FF5A26] via-[#FF7A45] to-amber-500 hover:brightness-110 shadow-[#FF5A26]/40'
              }`}
            >
              {addedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Added to Order!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                  <span>Add to Order • ${(Number(currentReel.price) * orderQuantity).toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
