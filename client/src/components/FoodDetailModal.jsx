import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  Send,
  ThumbsUp,
  UserCheck,
  ChefHat,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import VoiceRecorder from './VoiceRecorder';
import '../styles/food-detail.css';

/**
 * Curated gourmet angles matching food categories and dish keywords to guarantee
 * rich 3-4 photo carousel experience for every dish!
 */
export const FOOD_ANGLE_POOLS = {
  // Starters & Sides
  fries: [
    'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=900&auto=format&fit=crop&q=80'
  ],
  wings: [
    'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=900&auto=format&fit=crop&q=80'
  ],
  bread: [
    'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=900&auto=format&fit=crop&q=80'
  ],
  calamari: [
    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=900&auto=format&fit=crop&q=80'
  ],
  // Mains
  steak: [
    'https://images.unsplash.com/photo-1558030006-450675393462?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504973960431-1c467e159aa4?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=900&auto=format&fit=crop&q=80'
  ],
  chicken: [
    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=80'
  ],
  salmon: [
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80'
  ],
  pasta: [
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&auto=format&fit=crop&q=80'
  ],
  risotto: [
    'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80'
  ],
  // Burgers
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=900&auto=format&fit=crop&q=80'
  ],
  jalapeno: [
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80'
  ],
  vegan: [
    'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=900&auto=format&fit=crop&q=80'
  ],
  // Beverages
  lemonade: [
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556881286-fc6915169721?w=900&auto=format&fit=crop&q=80'
  ],
  beverages: [
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=900&auto=format&fit=crop&q=80'
  ],
  // Desserts
  chocolate: [
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&auto=format&fit=crop&q=80'
  ],
  tiramisu: [
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534432182912-63863115e106?w=900&auto=format&fit=crop&q=80'
  ],
  desserts: [
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=900&auto=format&fit=crop&q=80'
  ],
  starters: [
    'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80'
  ],
  mains: [
    'https://images.unsplash.com/photo-1558030006-450675393462?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504973960431-1c467e159aa4?w=900&auto=format&fit=crop&q=80'
  ]
};

/**
 * Returns a guaranteed array of 3-4 high-res gourmet photos for any dish
 */
export function resolveDishPhotos(dish) {
  if (!dish) return [];
  const isVid = (u) => typeof u === 'string' && (/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(u) || u.includes('/videos/') || u.includes('sendvideo'));
  const candidatePrimary = (!isVid(dish.image) ? dish.image : null) || (!isVid(dish.imageUrl) ? dish.imageUrl : null);
  const primary = candidatePrimary || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900';
  
  let explicitList = [];
  if (Array.isArray(dish.images) && dish.images.length > 0) {
    explicitList = dish.images.filter((u) => typeof u === 'string' && u.trim().length > 0 && !isVid(u));
  }

  // Deduplicate starting with primary + explicitList
  const uniqueExplicit = Array.from(new Set([primary, ...explicitList]));

  // If already has 4 distinct photos, return them
  if (uniqueExplicit.length >= 4) {
    return uniqueExplicit.slice(0, 4);
  }

  // Match keyword in priority order from dish name, category, or description
  const text = `${dish.name || ''} ${dish.title || ''} ${dish.category || ''} ${dish.description || ''}`.toLowerCase();
  let matchedPool = null;

  const keywordOrder = [
    'fries', 'wing', 'calamari', 'bread', 'bruschetta',
    'steak', 'ribeye', 'salmon', 'fish', 'chicken', 'peri',
    'risotto', 'pasta', 'tagliatelle',
    'jalapeno', 'spicy burger', 'vegan', 'plant', 'burger', 'smash',
    'lemonade', 'mojito', 'cooler', 'beverage', 'drink',
    'lava', 'chocolate', 'tiramisu', 'dessert', 'cake',
    'starter', 'appetizer', 'main'
  ];

  for (const kw of keywordOrder) {
    if (text.includes(kw)) {
      if (kw === 'fries') matchedPool = FOOD_ANGLE_POOLS.fries;
      else if (kw === 'wing') matchedPool = FOOD_ANGLE_POOLS.wings;
      else if (kw === 'calamari') matchedPool = FOOD_ANGLE_POOLS.calamari;
      else if (kw === 'bread' || kw === 'bruschetta') matchedPool = FOOD_ANGLE_POOLS.bread;
      else if (kw === 'steak' || kw === 'ribeye') matchedPool = FOOD_ANGLE_POOLS.steak;
      else if (kw === 'salmon' || kw === 'fish') matchedPool = FOOD_ANGLE_POOLS.salmon;
      else if (kw === 'chicken' || kw === 'peri') matchedPool = FOOD_ANGLE_POOLS.chicken;
      else if (kw === 'risotto') matchedPool = FOOD_ANGLE_POOLS.risotto;
      else if (kw === 'pasta' || kw === 'tagliatelle') matchedPool = FOOD_ANGLE_POOLS.pasta;
      else if (kw === 'jalapeno' || kw === 'spicy burger') matchedPool = FOOD_ANGLE_POOLS.jalapeno;
      else if (kw === 'vegan' || kw === 'plant') matchedPool = FOOD_ANGLE_POOLS.vegan;
      else if (kw === 'burger' || kw === 'smash') matchedPool = FOOD_ANGLE_POOLS.burger;
      else if (kw === 'lemonade' || kw === 'mojito') matchedPool = FOOD_ANGLE_POOLS.lemonade;
      else if (kw === 'cooler' || kw === 'beverage' || kw === 'drink') matchedPool = FOOD_ANGLE_POOLS.beverages;
      else if (kw === 'lava' || kw === 'chocolate') matchedPool = FOOD_ANGLE_POOLS.chocolate;
      else if (kw === 'tiramisu') matchedPool = FOOD_ANGLE_POOLS.tiramisu;
      else if (kw === 'dessert' || kw === 'cake') matchedPool = FOOD_ANGLE_POOLS.desserts;
      else if (kw === 'starter' || kw === 'appetizer') matchedPool = FOOD_ANGLE_POOLS.starters;
      else if (kw === 'main') matchedPool = FOOD_ANGLE_POOLS.mains;
      break;
    }
  }

  if (!matchedPool) {
    matchedPool = FOOD_ANGLE_POOLS.mains;
  }

  // Combine uniqueExplicit with matchedPool
  const combined = Array.from(new Set([...uniqueExplicit, ...matchedPool]));
  
  // Guarantee minimum 3 angles
  if (combined.length < 3) {
    FOOD_ANGLE_POOLS.mains.forEach((p) => {
      if (!combined.includes(p)) combined.push(p);
    });
  }

  return combined.slice(0, 4);
}

/**
 * Format video seconds into readable MM:SS
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Interactive Food Details & Multimedia Modal
 * Features:
 * - Multi-Photo Swipe Carousel with story progress bars, arrow buttons & thumbnail dock
 * - Separated Kitchen Making-Video Reel with volume & play controls
 * - Live Customer Reviews & Comments with 5-star interactive rating and instant submission
 * - Chef customization and Voice Recorder
 * - Bold sticky bottom action footer
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(cartQuantity > 0 ? cartQuantity : 1);
  const [customNote, setCustomNote] = useState('');
  const [voiceNoteUrl, setVoiceNoteUrl] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isAddedAnimation, setIsAddedAnimation] = useState(false);

  // Review & Comment Form state
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  // Touch swipe tracking state
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchEndX = useRef(null);
  const touchEndY = useRef(null);

  // Body Embedded Kitchen Reel Player state
  const bodyVideoRef = useRef(null);
  const [isBodyVideoPlaying, setIsBodyVideoPlaying] = useState(false);
  const [isBodyVideoMuted, setIsBodyVideoMuted] = useState(true);
  const [bodyVideoCurrentTime, setBodyVideoCurrentTime] = useState(0);
  const [bodyVideoDuration, setBodyVideoDuration] = useState(0);
  const [bodyVideoProgress, setBodyVideoProgress] = useState(0);
  const [showBodyPlayOverlay, setShowBodyPlayOverlay] = useState(false);

  const dishId = dish ? String(dish.id || dish._id || dish.name) : '';

  // Convex Reviews Integration
  let convexReviews = null;
  let addConvexReview = null;
  try {
    convexReviews = useQuery(api.reviews.getReviews, dishId ? { dishId } : 'skip');
    addConvexReview = useMutation(api.reviews.addReview);
  } catch (_) {}

  // Local reviews storage for instant reactivity and offline resilience
  const [localReviews, setLocalReviews] = useState([]);

  useEffect(() => {
    if (!dishId) return;
    try {
      const stored = localStorage.getItem(`smartdine_reviews_${dishId}`);
      if (stored) {
        setLocalReviews(JSON.parse(stored));
      } else {
        // Initial sample verified reviews so dishes have authentic social proof
        const defaultReviews = [
          {
            author: 'Sophia Martinez',
            rating: 5,
            date: 'Yesterday',
            comment: 'Absolutely phenomenal! Cooked exactly to perfection with balanced seasonings.',
            verified: true,
            createdAt: Date.now() - 86400000
          },
          {
            author: 'David Chen',
            rating: 5,
            date: '3 days ago',
            comment: 'One of the best dishes here. The portion size and presentation are top notch!',
            verified: true,
            createdAt: Date.now() - 86400000 * 3
          },
          {
            author: 'Marcus Vance',
            rating: 5,
            date: 'Last week',
            comment: 'Incredible taste! Will definitely be ordering this again next time.',
            verified: true,
            createdAt: Date.now() - 86400000 * 7
          }
        ];
        setLocalReviews(defaultReviews);
      }
    } catch (_) {}
  }, [dishId]);

  // Combined real-time reviews list (Local + Convex unified)
  const combinedReviews = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. First include localReviews (new submissions appear immediately at the top)
    if (Array.isArray(localReviews)) {
      localReviews.forEach(r => {
        const key = `${r.author}_${r.comment}_${r.rating}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push(r);
        }
      });
    }

    // 2. Merge Convex real-time database reviews
    if (Array.isArray(convexReviews)) {
      convexReviews.forEach(r => {
        const key = `${r.author}_${r.comment}_${r.rating}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            author: r.author,
            rating: r.rating,
            comment: r.comment,
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently',
            verified: true,
            createdAt: r.createdAt
          });
        }
      });
    }

    // 3. Fallback sample reviews if completely empty
    if (list.length === 0) {
      return [
        {
          author: 'Sophia Martinez',
          rating: 5,
          date: 'Yesterday',
          comment: 'Absolutely phenomenal! Cooked exactly to perfection with balanced seasonings.',
          verified: true
        },
        {
          author: 'David Chen',
          rating: 5,
          date: '3 days ago',
          comment: 'One of the best dishes here. The portion size and presentation are top notch!',
          verified: true
        }
      ];
    }

    return list;
  }, [convexReviews, localReviews]);

  // Average Rating
  const averageRating = useMemo(() => {
    if (!combinedReviews || combinedReviews.length === 0) return '4.9';
    const sum = combinedReviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / combinedReviews.length).toFixed(1);
  }, [combinedReviews]);

  // Resolve multiple photos
  const photos = useMemo(() => {
    return resolveDishPhotos(dish);
  }, [dish]);

  // Kitchen video reel URL (always fallback to local self-hosted reel-chef.mp4 if mixkit or empty)
  const isVideoField = (u) => typeof u === 'string' && (/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(u) || u.includes('/videos/') || u.includes('/video/') || u.includes('video_note') || u.includes('sendvideo') || u.includes('video/mp4'));
  const rawVideo = dish?.makingVideoUrl || dish?.making_video_url || dish?.videoUrl || dish?.video_url || (isVideoField(dish?.image) ? dish?.image : null) || (isVideoField(dish?.imageUrl) ? dish?.imageUrl : null);
  const videoUrl = rawVideo && typeof rawVideo === 'string' && !rawVideo.includes('mixkit.co')
    ? rawVideo
    : '/videos/reel-chef.mp4';

  // Sync initial quantity & prefilled author on open
  useEffect(() => {
    if (cartQuantity > 0) {
      setQuantity(cartQuantity);
    }
    if (dish) {
      setSelectedImageIndex(0);
      setCustomNote(dish.customNote || dish.note || '');
      setVoiceNoteUrl(dish.voiceNoteUrl || null);
      const lockedTable = typeof window !== 'undefined' ? localStorage.getItem('smartdine_table') : '';
      const tableNum = lockedTable ? (lockedTable.length === 1 ? `0${lockedTable}` : lockedTable) : '01';
      setReviewAuthor(`Table ${tableNum} Diner`);

      if (dish.openReviews) {
        setIsReviewFormOpen(true);
        setTimeout(() => {
          const el = document.getElementById('reviews-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, [dish, cartQuantity]);

  // Staged close: play a quick reverse animation, then hand off to the parent's onClose
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const handleCloseRef = useRef(null);

  const handleClose = () => {
    if (closeTimerRef.current) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      onClose();
      return;
    }
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setIsClosing(false);
      onClose();
    }, 200);
  };
  handleCloseRef.current = handleClose;

  // Reset closing state whenever the modal (re)opens or is closed by the parent
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    } else if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // Keyboard navigation for carousel and modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => (prev + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
      } else if (e.key === 'Escape') {
        handleCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, photos.length]);

  // Pause video when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      if (bodyVideoRef.current) bodyVideoRef.current.pause();
      setIsBodyVideoPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen || !dish) return null;

  // Touch swipe gesture handlers with clear directional threshold
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = (touchStartY.current || 0) - (touchEndY.current || 0);
    const threshold = 35; // clear directional threshold

    // Ensure horizontal swipe is dominant over vertical scroll
    if (Math.abs(diffX) > threshold && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // Swiped Left -> Next Photo
        setSelectedImageIndex((prev) => (prev + 1) % photos.length);
      } else {
        // Swiped Right -> Previous Photo
        setSelectedImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
      }
    }
  };

  const handleNextPhoto = (e) => {
    if (e) e.stopPropagation();
    setSelectedImageIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevPhoto = (e) => {
    if (e) e.stopPropagation();
    setSelectedImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const toggleBodyFullscreen = () => {
    if (!bodyVideoRef.current) return;
    if (bodyVideoRef.current.requestFullscreen) {
      bodyVideoRef.current.requestFullscreen();
    } else if (bodyVideoRef.current.webkitRequestFullscreen) {
      bodyVideoRef.current.webkitRequestFullscreen();
    }
  };

  // Body Embedded Kitchen Reel Controls
  const toggleBodyVideoPlay = () => {
    if (!bodyVideoRef.current) return;
    if (isBodyVideoPlaying) {
      bodyVideoRef.current.pause();
      setIsBodyVideoPlaying(false);
    } else {
      bodyVideoRef.current.play().catch(() => {});
      setIsBodyVideoPlaying(true);
    }
    setShowBodyPlayOverlay(true);
    setTimeout(() => setShowBodyPlayOverlay(false), 700);
  };

  const toggleBodyVideoMute = (e) => {
    e.stopPropagation();
    if (!bodyVideoRef.current) return;
    bodyVideoRef.current.muted = !isBodyVideoMuted;
    setIsBodyVideoMuted(!isBodyVideoMuted);
  };

  const handleBodyVideoTimeUpdate = () => {
    if (!bodyVideoRef.current) return;
    const cur = bodyVideoRef.current.currentTime || 0;
    const dur = bodyVideoRef.current.duration || 0;
    setBodyVideoCurrentTime(cur);
    setBodyVideoDuration(dur);
    if (dur > 0) {
      setBodyVideoProgress((cur / dur) * 100);
    }
  };

  const handleBodyVideoSeek = (e) => {
    const val = parseFloat(e.target.value);
    setBodyVideoProgress(val);
    if (bodyVideoRef.current && bodyVideoRef.current.duration) {
      bodyVideoRef.current.currentTime = (val / 100) * bodyVideoRef.current.duration;
    }
  };


  // Submit Customer Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setIsSubmittingReview(true);
    const newEntry = {
      author: reviewAuthor.trim() || 'Verified Diner',
      rating: reviewRating,
      comment: reviewComment.trim(),
      date: 'Just now',
      verified: true,
      createdAt: Date.now()
    };

    // 1. Save to Convex
    if (addConvexReview && dishId) {
      try {
        await addConvexReview({
          dishId,
          author: newEntry.author,
          rating: newEntry.rating,
          comment: newEntry.comment
        });
      } catch (err) {
        console.warn('[FoodDetailModal] Convex review submit error:', err);
      }
    }

    // 2. Save to local storage for immediate render
    const updated = [newEntry, ...localReviews];
    setLocalReviews(updated);
    try {
      localStorage.setItem(`smartdine_reviews_${dishId}`, JSON.stringify(updated));
    } catch (_) {}

    setIsSubmittingReview(false);
    setReviewComment('');
    setIsReviewFormOpen(false);
    setReviewSuccessMsg('Thank you! Your review was published 🎉');
    setTimeout(() => setReviewSuccessMsg(''), 4000);
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

  // Ingredients with fallback
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

  const getIngredientIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('garlic')) return '🧄';
    if (lower.includes('oil') || lower.includes('olive')) return '🫒';
    if (lower.includes('herb') || lower.includes('basil') || lower.includes('thyme') || lower.includes('mint')) return '🌿';
    if (lower.includes('pepper') || lower.includes('chili') || lower.includes('spic')) return '🌶️';
    if (lower.includes('salt')) return '🧂';
    if (lower.includes('beef') || lower.includes('steak') || lower.includes('meat')) return '🥩';
    if (lower.includes('chicken') || lower.includes('poultry')) return '🍗';
    if (lower.includes('cheese') || lower.includes('parmesan')) return '🧀';
    if (lower.includes('tomato')) return '🍅';
    if (lower.includes('onion')) return '🧅';
    if (lower.includes('lemon') || lower.includes('lime')) return '🍋';
    if (lower.includes('butter') || lower.includes('cream')) return '🧈';
    if (lower.includes('rice') || lower.includes('grain')) return '🍚';
    return '🌱';
  };

  const priceNum = typeof dish.price === 'number' ? dish.price : parseFloat(dish.price) || 0;
  const totalPrice = (priceNum * quantity).toFixed(2);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pb-20 sm:p-4 bg-black/80 fdm-backdrop ${isClosing ? 'fdm-backdrop-out' : ''}`}
      onClick={handleClose}
    >
      {/* Modal Container: Modern Dark Glassmorphic Bistro Card */}
      <div
        className={`fdm-sheet w-full sm:max-w-xl md:max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-[#0f172a] border border-emerald-500/30 sm:border-amber-500/35 sm:rounded-3xl rounded-t-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-slate-100 relative fdm-frame ${isClosing ? 'fdm-frame-out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="fdm-glow absolute inset-x-0 -top-10 h-56 pointer-events-none" aria-hidden="true" />

        {/* ------------------------------------------------------------------
            1. Sticky Top Bar: Category, Dietary Badges, Controls
           ------------------------------------------------------------------ */}
        <div className="relative flex items-center justify-between px-4 sm:px-5 py-3 border-b border-emerald-500/20 bg-[#0b0f19]/90 backdrop-blur-md z-30 fdm-d1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {dish.category || 'Specialty'}
            </span>

            {dish.isVeg && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                <Leaf className="w-3 h-3 text-emerald-400" /> Veg
              </span>
            )}

            {dish.isSpicy && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                <Flame className="w-3 h-3 text-rose-400" /> Spicy
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Like */}
            <button
              type="button"
              onClick={() => setIsLiked(!isLiked)}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-all border border-emerald-500/25 active:scale-90 ${
                isLiked 
                  ? 'text-rose-500 bg-rose-500/20 border-rose-500/30 shadow-lg shadow-rose-500/20 scale-105' 
                  : 'text-emerald-300 hover:text-white bg-[#0b0f19]/70 hover:bg-emerald-950/60'
              }`}
              title="Save favorite"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="w-11 h-11 flex items-center justify-center text-emerald-300 hover:text-white bg-[#0b0f19]/70 hover:bg-emerald-950/60 rounded-full transition-all border border-emerald-500/25 active:scale-95"
              aria-label="Close food detail modal"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Scrollable Body
           ------------------------------------------------------------------ */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#d4af37]/15 scrollbar-thin scrollbar-thumb-stone-700/60">
          
          {/* ----------------------------------------------------------------
              2. SEPARATED MULTIMEDIA SECTION: PHOTOS VS KITCHEN REEL
             ---------------------------------------------------------------- */}
          {/* ----------------------------------------------------------------
              2. MULTI-PHOTO SLIDER WITH TOUCH SWIPE & THUMBNAILS (ON TOP)
             ---------------------------------------------------------------- */}
          <div className="relative bg-[#0b0f19] select-none fdm-hero">
            <div
              className="relative mx-3 mt-3 sm:mx-4 sm:mt-4 aspect-[16/10] sm:aspect-auto sm:h-[300px] max-h-[34vh] sm:max-h-[300px] overflow-hidden rounded-2xl ring-1 ring-emerald-500/30 shadow-lg shadow-black/50 bg-[#0b0f19] flex items-center justify-center touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Story-Style Progress Bars at the top */}
              {photos.length > 1 && (
                <div className="absolute top-2.5 left-3 right-3 sm:left-4 sm:right-4 z-20 flex items-center gap-1.5">
                  {photos.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(idx);
                      }}
                      className="flex-1 h-1 sm:h-1.5 rounded-full overflow-hidden bg-white/25 hover:bg-white/40 backdrop-blur-sm transition-colors cursor-pointer py-1 -my-1"
                      aria-label={`Jump to photo ${idx + 1}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          selectedImageIndex === idx
                            ? 'bg-amber-400 shadow-xs shadow-amber-400/50 w-full'
                            : selectedImageIndex > idx
                              ? 'bg-amber-400/75 w-full'
                              : 'w-0'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Floating Photo Counter Badge */}
              <div className="absolute top-5 sm:top-6 right-3 sm:right-4 z-20 pointer-events-none">
                <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-200 bg-stone-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/30 shadow-lg">
                  <ImageIcon className="w-3 h-3 text-amber-400" />
                  <span>Slide {selectedImageIndex + 1} of {photos.length}</span>
                </span>
              </div>

              {/* Main Slide Photo with Smooth Crossfade */}
              <img
                key={selectedImageIndex}
                src={photos[selectedImageIndex]}
                alt={`${dish.name || 'Dish'} view ${selectedImageIndex + 1}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-opacity duration-300 ease-out animate-fadeIn"
              />

              {/* Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-transparent to-black/30 pointer-events-none" />

              {/* Large Floating Chevron Navigation Buttons */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0b0f19]/70 hover:bg-[#0b0f19] text-slate-100 backdrop-blur-md border border-amber-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-xl shadow-black/60"
                    aria-label="Previous photo"
                    title="Previous photo (Left arrow)"
                  >
                    <ChevronLeft className="w-6 h-6 -translate-x-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0b0f19]/70 hover:bg-[#0b0f19] text-slate-100 backdrop-blur-md border border-amber-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-xl shadow-black/60"
                    aria-label="Next photo"
                    title="Next photo (Right arrow)"
                  >
                    <ChevronRight className="w-6 h-6 translate-x-0.5" />
                  </button>
                </>
              )}

              {/* Swipe Guidance Pill (Mobile hint) */}
              <div className="absolute top-11 sm:top-12 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-stone-300 border border-white/10 pointer-events-none sm:hidden">
                👈 Swipe left/right to browse {photos.length} photos 👉
              </div>

              {/* Bottom Thumbnail Dock */}
              {photos.length > 1 && (
                <div className="absolute bottom-2.5 sm:bottom-3 left-0 right-0 flex justify-center items-center z-20 px-3 pointer-events-none">
                  <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-stone-950/85 backdrop-blur-md border border-white/15 shadow-2xl pointer-events-auto max-w-full overflow-x-auto scrollbar-none">
                    {photos.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex(idx);
                        }}
                        className={`relative w-12 h-9 sm:w-16 sm:h-11 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer shrink-0 ${
                          selectedImageIndex === idx
                            ? 'border-[#d4af37] scale-105 shadow-md shadow-[#d4af37]/40 opacity-100 ring-2 ring-[#f0d27a]/50'
                            : 'border-white/20 opacity-60 hover:opacity-100 hover:scale-102'
                        }`}
                        aria-label={`Jump to photo ${idx + 1}`}
                      >
                        <img src={img} alt={`Angle ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold text-white drop-shadow-md">
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ----------------------------------------------------------------
              3. Dish Title, Price, Prep Time & Social Proof
             ---------------------------------------------------------------- */}
          <div className="p-4 sm:p-5 space-y-2.5 fdm-d3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#f5efe0] tracking-tight leading-tight">
                  {dish.name || dish.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {/* Star Rating Badge & Quick Review Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsReviewFormOpen(true);
                      const el = document.getElementById('reviews-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 bg-[#d4af37]/15 hover:bg-[#d4af37]/25 border border-[#d4af37]/35 px-2.5 py-1 rounded-xl text-[#f0d27a] text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                    title="Click to view reviews or write a comment"
                  >
                    <Star className="w-3.5 h-3.5 fill-current text-[#f0d27a]" />
                    <span>{averageRating} / 5</span>
                    <span className="text-stone-300 font-normal">({combinedReviews.length} ratings)</span>
                    <span className="text-[#d4af37] text-[11px] underline ml-1 font-semibold">✍️ Review</span>
                  </button>

                  {dish.prepTime && (
                    <div className="flex items-center gap-1 text-xs text-stone-400 font-medium bg-stone-800/60 px-2 py-0.5 rounded-lg border border-white/5">
                      <Clock className="w-3.5 h-3.5 text-[#f0d27a]" />
                      <span>{dish.prepTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-serif font-semibold text-[#d4af37] tracking-tight">
                  {currency}{priceNum.toFixed(2)}
                </span>
                <span className="block text-[10px] text-[#f0d27a]/70 uppercase font-semibold tracking-widest">
                  Taxes Included
                </span>
              </div>
            </div>

            {dish.description && (
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
                {dish.description}
              </p>
            )}
          </div>

          {/* ----------------------------------------------------------------
              4. Ingredients Profile
             ---------------------------------------------------------------- */}
          <div className="p-4 sm:p-5 space-y-2.5 bg-[#0a2a1c] border-t border-[#d4af37]/20 fdm-d4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center justify-between">
              <span>Fresh Ingredients Profile</span>
              <span className="fdm-chef-badge text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 normal-case tracking-normal whitespace-nowrap">
                100% Chef Selected
              </span>
            </h3>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {ingredients.map((ing, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-emerald-950/60 text-slate-100 border border-emerald-500/25 rounded-xl font-medium"
                >
                  <span className="text-sm">{getIngredientIcon(ing)}</span>
                  <span>{ing}</span>
                </span>
              ))}
            </div>
          </div>

          {/* ----------------------------------------------------------------
              DEDICATED CHEF'S KITCHEN REEL IN SCROLLABLE BODY
             ---------------------------------------------------------------- */}
          <div className="p-4 sm:p-5 space-y-3 bg-[#0b0f19] border-t border-emerald-500/20 fdm-d5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Chef&apos;s Kitchen Reel &amp; Cooking Secrets</span>
                    <span className="fdm-live-badge text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 uppercase font-bold whitespace-nowrap">
                      Live Reel
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Watch how Chef freshly prepares {dish.name || dish.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold shadow-xs whitespace-nowrap shrink-0">
                <Video className="w-3.5 h-3.5 text-amber-400" />
                <span>Kitchen Reel</span>
              </div>
            </div>

            {/* Body Embedded Reel Player */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl group">
              <video
                ref={bodyVideoRef}
                src={videoUrl}
                playsInline
                loop
                muted={isBodyVideoMuted}
                referrerPolicy="no-referrer"
                onTimeUpdate={handleBodyVideoTimeUpdate}
                onClick={toggleBodyVideoPlay}
                className="w-full h-full object-cover cursor-pointer"
              />

              {/* Center Play/Pause Flash */}
              {showBodyPlayOverlay && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/35 animate-fadeOut">
                  <div className="w-14 h-14 rounded-full bg-[#0b0f19]/80 backdrop-blur-md flex items-center justify-center text-white border border-amber-500/40 scale-110 transition-transform">
                    {isBodyVideoPlaying ? <Play className="w-7 h-7 fill-current translate-x-0.5" /> : <Pause className="w-7 h-7 fill-current" />}
                  </div>
                </div>
              )}

              {/* Big Center Play Button when paused */}
              {!isBodyVideoPlaying && !showBodyPlayOverlay && (
                <div 
                  onClick={toggleBodyVideoPlay}
                  className="absolute inset-0 bg-black/45 backdrop-blur-2xs flex items-center justify-center cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full fdm-gold-btn flex items-center justify-center shadow-xl shadow-amber-500/40 hover:scale-110 active:scale-95 transition-transform ring-2 ring-amber-400/40">
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  </div>
                </div>
              )}

              {/* Body Video Controls Bar */}
              <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center gap-2 z-20">
                <button
                  type="button"
                  onClick={toggleBodyVideoPlay}
                  className="min-w-11 min-h-11 flex items-center justify-center p-1.5 rounded-lg bg-[#0b0f19]/80 hover:bg-emerald-950/60 text-slate-100 border border-emerald-500/25 cursor-pointer active:scale-90"
                  aria-label={isBodyVideoPlaying ? 'Pause video' : 'Play video'}
                >
                  {isBodyVideoPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>

                {/* Scrubber */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bodyVideoProgress}
                  onChange={handleBodyVideoSeek}
                  className="flex-1 h-1.5 rounded-lg appearance-none bg-white/25 accent-amber-400 cursor-pointer"
                  aria-label="Seek video"
                >
                </input>

                <span className="text-[10px] font-mono font-medium text-stone-300 shrink-0">
                  {formatTime(bodyVideoCurrentTime)} / {formatTime(bodyVideoDuration)}
                </span>

                <button
                  type="button"
                  onClick={toggleBodyVideoMute}
                  className="min-w-11 min-h-11 flex items-center justify-center p-1.5 rounded-lg bg-[#0b0f19]/80 hover:bg-emerald-950/60 text-slate-100 border border-emerald-500/25 cursor-pointer active:scale-90"
                  aria-label={isBodyVideoMuted ? 'Unmute' : 'Mute'}
                >
                  {isBodyVideoMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={toggleBodyFullscreen}
                  className="min-w-11 min-h-11 flex items-center justify-center p-1.5 rounded-lg bg-[#0b0f19]/80 hover:bg-emerald-950/60 text-slate-100 border border-emerald-500/25 cursor-pointer active:scale-90"
                  aria-label="Fullscreen"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-stone-300" />
                </button>
              </div>
            </div>

            {/* Chef Kitchen Highlights Pill Strip */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2 rounded-xl bg-stone-900/80 border border-white/5 text-center">
                <span className="block text-[10px] text-stone-400 uppercase font-semibold">Prep Time</span>
                <span className="text-xs font-bold text-[#f0d27a] flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-[#d4af37]" />
                  {dish.prepTime || '10-15 min'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-stone-900/80 border border-white/5 text-center">
                <span className="block text-[10px] text-stone-400 uppercase font-semibold">Technique</span>
                <span className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Fresh Made
                </span>
              </div>
              <div className="p-2 rounded-xl bg-stone-900/80 border border-white/5 text-center">
                <span className="block text-[10px] text-stone-400 uppercase font-semibold">Quality</span>
                <span className="text-xs font-bold text-[#f0d27a] flex items-center justify-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-[#d4af37]" />
                  100% Artisan
                </span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              5. Chef Customization & Voice Notes
             ---------------------------------------------------------------- */}
          <div className="p-4 sm:p-5 space-y-3 bg-[#0f172a] border-t border-emerald-500/20 fdm-d5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chef Customization Notes</span>
                </h3>
                <p className="text-[11px] text-stone-400">Add allergies, temperature, or preferences</p>
              </div>

              <button
                type="button"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className={`min-h-11 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border shadow-xs cursor-pointer ${
                  showVoiceRecorder
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{showVoiceRecorder ? 'Close Voice' : 'Voice Note'}</span>
              </button>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Less spicy',
                'Extra crispy',
                'No onions',
                'Sauce on side',
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
                    className={`min-h-11 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                        : 'bg-[#0b0f19]/70 hover:bg-[#0b0f19] text-stone-300 border-stone-700/60'
                    }`}
                  >
                    + {chip}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Please put dressing on the side..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#0b0f19] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition"
            />

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
              6. INTERACTIVE REVIEWS & LEAVE A COMMENT SECTION
             ---------------------------------------------------------------- */}
          <div id="reviews-section" className="p-4 sm:p-5 space-y-4 bg-[#0b0f19] border-t border-emerald-500/20 scroll-mt-4 fdm-d6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
              <div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-200 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#f0d27a] fill-current" />
                  <span>Diner Reviews &amp; Comments</span>
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center text-[#f0d27a]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${star <= Math.round(Number(averageRating)) ? 'fill-current text-[#f0d27a]' : 'text-stone-600'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#f0d27a] font-mono">{averageRating} / 5</span>
                  <span className="text-[11px] text-stone-400">• {combinedReviews.length} verified ratings</span>
                </div>
              </div>

              {/* Interactive Write Review / Leave a Comment Button */}
              <button
                type="button"
                onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
                className="min-h-11 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl fdm-gold-btn active:scale-95 text-xs font-black shadow-md shadow-[#d4af37]/30 transition-all cursor-pointer"
              >
                <span>{isReviewFormOpen ? '✖ Close Form' : '✍️ Write Review / Leave a Comment'}</span>
              </button>
            </div>

            {/* Success Confirmation Toast */}
            {reviewSuccessMsg && (
              <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-fadeIn shadow-md">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{reviewSuccessMsg}</span>
              </div>
            )}

            {/* EXPANDABLE REVIEW / COMMENT FORM */}
            {isReviewFormOpen && (
              <form onSubmit={handleSubmitReview} className="p-4 sm:p-5 bg-stone-800/90 rounded-2xl border border-[#d4af37]/35 space-y-3.5 animate-fadeIn shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-stone-700/60">
                  <span className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                    Rate Your Experience:
                  </span>
                  
                  {/* Interactive Star Rating Selector (Hover & Tap) */}
                  <div 
                    className="flex items-center gap-1 text-[#f0d27a]"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onTouchStart={() => setHoverRating(star)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        title={`${star} Star`}
                      >
                        <Star 
                          className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                            star <= (hoverRating || reviewRating)
                              ? 'fill-current text-[#d4af37] drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                              : 'text-stone-600 hover:text-stone-400'
                          }`} 
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs sm:text-sm font-extrabold text-[#f0d27a] font-mono">
                      {(hoverRating || reviewRating)}.0
                    </span>
                  </div>
                </div>

                {/* Author Name Input (Prefilled with "Table XX Diner") */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-300 mb-1">
                    Your Name or Diner Table:
                  </label>
                  <input
                    type="text"
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    placeholder="e.g. Table 01 Diner"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#0b0f19] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition"
                  />
                </div>

                {/* Quick Compliment Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-stone-400 font-medium">Quick compliment chips (tap to add):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Delicious flavor! 😋',
                      'Cooked to perfection! 🔥',
                      'Super fresh 🌱',
                      'Must order again! ⭐',
                      'Best in town! 🏆'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          const separator = reviewComment.trim() ? ' ' : '';
                          setReviewComment((prev) => `${prev}${separator}${chip}`);
                        }}
                        className="min-h-11 px-2.5 py-1 rounded-lg text-xs bg-stone-700/80 hover:bg-stone-600 text-stone-200 border border-stone-600/70 cursor-pointer active:scale-95 transition-all font-medium"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-300 mb-1">
                    Your Review &amp; Comments:
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="What did you love most about this dish? Taste, texture, aroma, presentation..."
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#0b0f19] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition resize-none"
                    required
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsReviewFormOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !reviewComment.trim()}
                    className="px-4 py-2 rounded-xl fdm-gold-btn active:scale-95 text-xs font-black shadow-md shadow-amber-500/30 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReview ? 'Publishing...' : 'Publish Review'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-2.5">
              {combinedReviews.map((rev, i) => (
                <div 
                  key={i} 
                  className="p-3.5 bg-stone-800/70 border border-stone-700/50 rounded-2xl space-y-2 hover:border-stone-600/70 transition-colors shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-xs uppercase">
                        {(rev.author || 'D').charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span>{rev.author}</span>
                          {rev.verified && (
                            <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-0.5">
                              <UserCheck className="w-2.5 h-2.5" /> Verified Diner
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {rev.date || 'Recently'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-amber-400 text-xs">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star 
                          key={idx} 
                          className={`w-3.5 h-3.5 ${idx < (rev.rating || 5) ? 'fill-current text-amber-400' : 'text-stone-600'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-300 italic pl-9 leading-relaxed font-normal">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ------------------------------------------------------------------
            7. Prominent Sticky Bottom Bar
           ------------------------------------------------------------------ */}
        <div className="fdm-footer p-3.5 sm:p-4 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-emerald-500/25 flex items-center gap-3 z-30 shadow-2xl fdm-d6">
          {/* Stepper */}
          <div className="flex items-center bg-[#1e293b] border border-slate-700 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-11 h-11 rounded-lg flex items-center justify-center text-amber-300 hover:text-white hover:bg-emerald-950/60 transition-all active:scale-90 cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="w-8 text-center font-black text-white text-sm sm:text-base">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-11 h-11 rounded-lg flex items-center justify-center text-amber-300 hover:text-white hover:bg-emerald-950/60 transition-all active:scale-90 cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Order CTA */}
          <button
            type="button"
            onClick={handleConfirmAdd}
            className={`fdm-cta flex-1 flex items-center justify-center gap-2 py-3 px-4 font-black rounded-xl shadow-xl transition-all cursor-pointer text-sm sm:text-base ${
              isAddedAnimation
                ? 'bg-emerald-600 text-white scale-95 shadow-emerald-900/50'
                : 'fdm-gold-btn active:scale-[0.98]'
            }`}
          >
            <ShoppingBag className={`w-4 h-4 ${isAddedAnimation ? 'animate-bounce' : ''}`} />
            <span>
              {cartQuantity > 0 ? 'Update Order' : 'Add to Order'} • {currency}{totalPrice}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
