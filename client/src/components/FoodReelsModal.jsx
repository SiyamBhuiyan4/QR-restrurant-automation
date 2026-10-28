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

    // If fewer dishes have reels, supplement with rich demo reels
    if (list.length < DEMO_FOOD_REELS.length) {
      DEMO_FOOD_REELS.forEach((demo) => {
        if (!list.some((r) => String(r.dishId) === String(demo.dishId) || r.name === demo.name)) {
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

  // Current reel index (synced with scroll position)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sound Muted state
  const [isMuted, setIsMuted] = useState(true);

  // Playing state per reel index
  const [playingMap, setPlayingMap] = useState({});

  // Central play/pause icon flash state
  const [playIconFlash, setPlayIconFlash] = useState(null);

  // Heart Burst state per reel index
  const [heartBurstMap, setHeartBurstMap] = useState({});

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
  const [copiedToast, setCopiedToast] = useState(false);

  // DOM Refs
  const scrollContainerRef = useRef(null);
  const reelElementsRef = useRef([]);
  const videoRefs = useRef([]);
  const lastTapTimes = useRef({});
  const tapTimeoutRefs = useRef({});
  const wheelLockedRef = useRef(false);

  const currentReel = activeReels[currentIndex] || activeReels[0];

  // Scroll to a specific reel index smoothly
  const scrollToReel = useCallback((targetIndex) => {
    const bounded = Math.max(0, Math.min(targetIndex, activeReels.length - 1));
    const el = reelElementsRef.current[bounded];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentIndex(bounded);
    }
  }, [activeReels.length]);

  // Jump to initial dish if specified
  useEffect(() => {
    if (isOpen && initialDishId && activeReels.length > 0) {
      const idx = activeReels.findIndex((r) => String(r.dishId) === String(initialDishId));
      if (idx !== -1) {
        setTimeout(() => {
          scrollToReel(idx);
        }, 120);
      }
    }
  }, [isOpen, initialDishId, activeReels, scrollToReel]);

  // Observe which reel is currently snapped into view (Real Reels Snap Observer)
  useEffect(() => {
    if (!isOpen) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(idx)) {
              setCurrentIndex(idx);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6
      }
    );

    reelElementsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isOpen, activeReels.length]);

  // Video playback management: Play active reel video, pause and reset all other videos
  useEffect(() => {
    setShowIngredients(false);
    setOrderQuantity(1);
    setAddedSuccess(false);

    videoRefs.current.forEach((videoEl, idx) => {
      if (!videoEl) return;
      if (idx === currentIndex) {
        videoEl.currentTime = 0;
        videoEl.muted = isMuted;
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setPlayingMap((prev) => ({ ...prev, [idx]: true }));
            })
            .catch(() => {
              // Browser autoplay blocked -> force mute and replay
              videoEl.muted = true;
              setIsMuted(true);
              videoEl.play().catch(() => {});
              setPlayingMap((prev) => ({ ...prev, [idx]: true }));
            });
        }
      } else {
        videoEl.pause();
        videoEl.currentTime = 0;
        setPlayingMap((prev) => ({ ...prev, [idx]: false }));
      }
    });
  }, [currentIndex, isMuted]);

  // Sync mute state across all video tags
  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) v.muted = isMuted;
    });
  }, [isMuted]);

  // Mouse wheel scroll with smooth spring snapping (for laptop trackpad & mouse wheel)
  const handleWheel = (e) => {
    if (showComments || showIngredients) return;
    if (Math.abs(e.deltaY) > 25) {
      if (!wheelLockedRef.current) {
        wheelLockedRef.current = true;
        if (e.deltaY > 0) {
          scrollToReel(currentIndex + 1);
        } else {
          scrollToReel(currentIndex - 1);
        }
        setTimeout(() => {
          wheelLockedRef.current = false;
        }, 400);
      }
    }
  };

  // Keyboard navigation (ArrowDown / ArrowUp / Space / Mute)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showIngredients) setShowIngredients(false);
        else if (showComments) setShowComments(false);
        else onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToReel(currentIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToReel(currentIndex - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause(currentIndex);
      } else if (e.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showIngredients, showComments, currentIndex, scrollToReel, onClose]);

  // Toggle Play / Pause on video tap
  const togglePlayPause = (idx) => {
    const video = videoRefs.current[idx];
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setPlayingMap((prev) => ({ ...prev, [idx]: true }));
      setPlayIconFlash({ idx, isPlaying: true });
    } else {
      video.pause();
      setPlayingMap((prev) => ({ ...prev, [idx]: false }));
      setPlayIconFlash({ idx, isPlaying: false });
    }

    setTimeout(() => {
      setPlayIconFlash(null);
    }, 700);
  };

  // Double-tap vs Single-tap detection on Reel video
  const handleSlideTap = (e, idx) => {
    // If ingredients or comments open, close them first
    if (showIngredients) {
      setShowIngredients(false);
      return;
    }
    if (showComments) {
      setShowComments(false);
      return;
    }

    const now = Date.now();
    const lastTap = lastTapTimes.current[idx] || 0;

    if (now - lastTap < 320) {
      // Double Tap -> Instagram Heart Burst!
      if (tapTimeoutRefs.current[idx]) {
        clearTimeout(tapTimeoutRefs.current[idx]);
      }
      triggerHeartBurst(idx);
      triggerLoveAction(activeReels[idx]);
      lastTapTimes.current[idx] = 0;
    } else {
      lastTapTimes.current[idx] = now;
      tapTimeoutRefs.current[idx] = setTimeout(() => {
        togglePlayPause(idx);
        lastTapTimes.current[idx] = 0;
      }, 320);
    }
  };

  // Heart burst animation trigger
  const triggerHeartBurst = (idx) => {
    setHeartBurstMap((prev) => ({ ...prev, [idx]: true }));
    setTimeout(() => {
      setHeartBurstMap((prev) => ({ ...prev, [idx]: false }));
    }, 900);
  };

  // Like / Love action handler
  const triggerLoveAction = (reel) => {
    if (!reel) return;
    const reelKey = String(reel.dishId || reel.id);
    setLikesMap((prev) => {
      const current = prev[reelKey] || { count: reel.initialLikes, isLoved: false };
      const updated = {
        count: current.isLoved ? current.count - 1 : current.count + 1,
        isLoved: !current.isLoved
      };
      const nextMap = { ...prev, [reelKey]: updated };
      try {
        localStorage.setItem('smartdine_reels_likes', JSON.stringify(nextMap));
      } catch (_) {}
      return nextMap;
    });
  };

  // Submit anonymous comment
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentReel) return;

    const reelKey = String(currentReel.dishId || currentReel.id);
    const author = guestAuthorName.trim() || (tableNumber ? `Table #${tableNumber} Diner` : 'Anonymous Diner');

    const newComment = {
      id: `anon-${Date.now()}`,
      author,
      text: newCommentText.trim(),
      time: 'Just now',
      likes: 1
    };

    setCommentsMap((prev) => {
      const existing = prev[reelKey] || currentReel.initialComments || [];
      const updatedList = [newComment, ...existing];
      const nextMap = { ...prev, [reelKey]: updatedList };
      try {
        localStorage.setItem('smartdine_reels_comments', JSON.stringify(nextMap));
      } catch (_) {}
      return nextMap;
    });

    setNewCommentText('');
  };

  // Share reel link
  const handleShareReel = (reel) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  // Add to Cart handler
  const handleOrderThisDish = () => {
    if (!currentReel) return;
    const itemToAdd = currentReel.originalItem || {
      id: currentReel.dishId,
      name: currentReel.name,
      price: currentReel.price,
      description: currentReel.description,
      image_url: currentReel.poster
    };

    if (onAddToCart) {
      onAddToCart(itemToAdd, orderQuantity);
    }

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
    }, 2000);
  };

  if (!isOpen) return null;

  // Active reel specific states
  const currentReelKey = String(currentReel.dishId || currentReel.id);
  const currentLikeData = likesMap[currentReelKey] || { count: currentReel.initialLikes, isLoved: false };
  const activeComments = commentsMap[currentReelKey] || currentReel.initialComments || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 sm:bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 select-none animate-fadeIn">
      {/* 9:16 Canvas Phone Frame */}
      <div 
        onWheel={handleWheel}
        className="relative w-full h-full sm:max-w-[425px] sm:h-[94vh] sm:max-h-[880px] sm:rounded-3xl overflow-hidden bg-black shadow-2xl border-0 sm:border sm:border-white/10 flex flex-col"
      >
        
        {/* ── Fixed Top Header ── */}
        <header className="absolute top-0 inset-x-0 z-30 p-3.5 flex items-center justify-between pointer-events-auto">
          {/* Brand & Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="font-extrabold text-xs tracking-wide">Food Reels</span>
            <span className="text-[10px] text-white/50 font-mono">
              {currentIndex + 1}/{activeReels.length}
            </span>
          </div>

          {/* Quick Header Controls: Sound & Close */}
          <div className="flex items-center gap-2">
            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition hover:bg-white/20 active:scale-95 cursor-pointer shadow-lg"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white/80" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition hover:bg-white/20 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
              title="Close Food Reels"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ── Native Vertical Snap-Scroll Reel Feed ── */}
        <div
          ref={scrollContainerRef}
          className="reels-snap-feed"
        >
          {activeReels.map((reel, index) => {
            const isSlideLoved = (likesMap[String(reel.dishId || reel.id)] || {}).isLoved;
            const slideLikesCount = (likesMap[String(reel.dishId || reel.id)] || {}).count || reel.initialLikes;
            const slideComments = commentsMap[String(reel.dishId || reel.id)] || reel.initialComments || [];
            const isCurrentSlide = index === currentIndex;
            const isPlayingThis = playingMap[index] ?? isCurrentSlide;

            return (
              <div
                key={reel.id}
                data-index={index}
                ref={(el) => (reelElementsRef.current[index] = el)}
                className="reel-snap-slide"
              >
                {/* 1. Video Element */}
                <div
                  className="reel-video-wrapper cursor-pointer"
                  onClick={(e) => handleSlideTap(e, index)}
                >
                  <video
                    ref={(el) => (videoRefs.current[index] = el)}
                    src={reel.videoUrl}
                    poster={reel.poster}
                    playsInline
                    loop
                    muted={isMuted}
                    preload="auto"
                    className={`reel-video ${isCurrentSlide && showIngredients ? 'is-blurred' : ''}`}
                  />

                  {/* Central Play / Pause Icon Flash */}
                  {playIconFlash && playIconFlash.idx === index && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <div className="w-16 h-16 rounded-full bg-black/65 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-2xl animate-scaleUp">
                        {playIconFlash.isPlaying ? (
                          <Play className="w-8 h-8 ml-1 fill-white" />
                        ) : (
                          <Pause className="w-8 h-8 fill-white" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Double Tap Heart Burst Animation */}
                  {heartBurstMap[index] && (
                    <div className="heart-burst-animate">
                      <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_25px_rgba(244,63,94,0.95)]" />
                    </div>
                  )}
                </div>

                {/* 2. Top and Bottom Vignettes */}
                <div className="reel-vignette-top" />
                <div className="reel-vignette-bottom" />

                {/* 3. Right-Side Action Bar (Facebook / Instagram Reels Style) */}
                <div className="absolute right-3.5 bottom-28 z-20 flex flex-col items-center gap-4 pointer-events-auto">
                  {/* Heart / Love Button */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHeartBurst(index);
                        triggerLoveAction(reel);
                      }}
                      className={`reel-action-btn ${isSlideLoved ? 'active-heart' : ''}`}
                      title="Love this Reel"
                    >
                      <Heart
                        className={`w-6 h-6 transition-transform ${
                          isSlideLoved ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white'
                        }`}
                      />
                    </button>
                    <span className="text-[11px] font-black text-white mt-1 drop-shadow-md">
                      {slideLikesCount >= 1000 ? `${(slideLikesCount / 1000).toFixed(1)}k` : slideLikesCount}
                    </span>
                  </div>

                  {/* Anonymous Comments Button */}
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
                      {slideComments.length}
                    </span>
                  </div>

                  {/* Ingredients Button (Blurs video to reveal recipe) */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setShowIngredients((prev) => !prev)}
                      className={`reel-action-btn ${isCurrentSlide && showIngredients ? 'bg-amber-500/30 border-amber-400 text-amber-300' : ''}`}
                      title="View Recipe Ingredients & Chef Secrets"
                    >
                      <ChefHat className="w-6 h-6" />
                    </button>
                    <span className="text-[10px] font-extrabold text-amber-300 mt-1 uppercase tracking-tight drop-shadow-md">
                      Recipe
                    </span>
                  </div>

                  {/* Share Button */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => handleShareReel(reel)}
                      className="reel-action-btn"
                      title="Share Reel Link"
                    >
                      <Share2 className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-[10px] font-bold text-white/70 mt-1 drop-shadow-md">
                      Share
                    </span>
                  </div>
                </div>

                {/* 4. Bottom Info Area (Dish Details, Chef Note, Tags) */}
                <div className="absolute bottom-24 inset-x-0 p-4 z-20 pointer-events-none text-left">
                  <div className="max-w-[78%] pointer-events-auto">
                    {/* Tags Bar */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600/90 text-white shadow-xs">
                        {reel.category}
                      </span>
                      {reel.isSpicy && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Spicy</span>
                        </span>
                      )}
                      {reel.isVeg && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Leaf className="w-3 h-3 text-emerald-400" />
                          <span>Veg</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 text-stone-300 border border-white/10 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{reel.prepTime}</span>
                      </span>
                    </div>

                    {/* Dish Title */}
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight drop-shadow-lg leading-snug">
                      {reel.name}
                    </h2>

                    {/* Chef Note */}
                    <p className="text-xs text-stone-200 mt-1 line-clamp-2 drop-shadow-md font-medium leading-relaxed">
                      {reel.chefNote || reel.description}
                    </p>

                    {/* Quick Ingredients Pill Trigger */}
                    <button
                      type="button"
                      onClick={() => setShowIngredients(true)}
                      className="mt-2 text-[11px] font-bold text-amber-300 hover:text-amber-200 underline underline-offset-4 flex items-center gap-1.5 cursor-pointer drop-shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tap to inspect fresh ingredients &amp; cooking notes</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Desktop Quick Up / Down Arrows ── */}
        <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => scrollToReel(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/90 hover:text-white hover:bg-black/80 flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title="Previous Reel (Arrow Up)"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToReel(currentIndex + 1)}
            disabled={currentIndex === activeReels.length - 1}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/90 hover:text-white hover:bg-black/80 flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title="Next Reel (Arrow Down)"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* ── Fixed Bottom "Add to Order" Sticky Bar ── */}
        <footer className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black via-black/90 to-transparent z-30 pointer-events-auto">
          <div className="flex items-center gap-2">
            {/* Quantity Stepper */}
            <div className="flex items-center bg-black/70 backdrop-blur-xl border border-white/20 rounded-2xl p-1 text-white shrink-0">
              <button
                type="button"
                onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                aria-label="Decrease quantity"
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
                aria-label="Increase quantity"
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
                  <span>
                    Add to Order • ${(Number(currentReel.price) * orderQuantity).toFixed(2)}
                  </span>
                </>
              )}
            </button>
          </div>
        </footer>

        {/* ── Blurred Video Recipe & Ingredients Card Overlay ── */}
        {showIngredients && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-fadeIn">
            <div className="w-full max-h-[75vh] overflow-y-auto ingredients-glass-card rounded-3xl p-5 text-white border border-white/20 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-tight">{currentReel.name}</h3>
                    <p className="text-[11px] text-amber-300 font-semibold">Chef's Fresh Ingredients &amp; Recipe</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIngredients(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cooking Secret / Chef Note */}
              <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl text-xs text-amber-200 leading-relaxed font-medium">
                <span className="font-black text-amber-300 block mb-1">👨‍🍳 Cooking Secret:</span>
                {currentReel.chefNote || currentReel.description}
              </div>

              {/* Ingredients List */}
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-300 block mb-2">
                  Ingredients Used:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentReel.ingredients.map((ing, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A26]" />
                      <span>{ing}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Resume Button */}
              <button
                type="button"
                onClick={() => setShowIngredients(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF5A26] to-amber-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Resume Video Reel
              </button>
            </div>
          </div>
        )}

        {/* ── Anonymous Comments Drawer (Facebook / Instagram Style) ── */}
        {showComments && (
          <div className="absolute inset-0 z-40 bg-black/60 flex items-end animate-fadeIn">
            <div className="w-full max-h-[70vh] comments-drawer rounded-t-3xl flex flex-col p-4 text-white">
              {/* Drawer Handle & Header */}
              <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#FF5A26]" />
                  <h3 className="font-black text-sm tracking-tight">
                    Anonymous Diners' Feedback ({activeComments.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComments(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comments Scrollable Feed */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 max-h-[42vh] pr-1">
                {activeComments.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs">
                    No comments yet. Be the first diner to leave anonymous thoughts! 💬
                  </div>
                ) : (
                  activeComments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5 text-left">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#FF5A26] to-amber-500 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                        {c.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-stone-200">{c.author}</span>
                          <span className="text-[10px] text-stone-500">{c.time}</span>
                        </div>
                        <p className="text-stone-300 font-medium leading-relaxed">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Anonymous Comment Form */}
              <form onSubmit={handleAddComment} className="pt-2 border-t border-white/10 space-y-2">
                <input
                  type="text"
                  value={guestAuthorName}
                  onChange={(e) => setGuestAuthorName(e.target.value)}
                  placeholder="Your Name / Handle (Optional - Defaults to Anonymous Diner)"
                  className="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-[#FF5A26]"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add an anonymous comment..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-[#FF5A26]"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5A26] to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Link Copied Toast ── */}
        {copiedToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 shadow-2xl flex items-center gap-2 animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reel link copied!</span>
          </div>
        )}

      </div>
    </div>
  );
}
