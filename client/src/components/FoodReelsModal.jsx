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
  ChevronLeft,
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
  Info,
  Mic,
  Trash2,
  Forward,
  MoreHorizontal
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { permanentMediaUrl } from '../utils/mediaUrl';
import { prefetchVideos } from '../utils/videoCache';
import '../styles/food-reels.css';

// Curated high-res streaming demo food reels if dishes don't have custom videos
export const DEMO_FOOD_REELS = [
  {
    id: 'reel-wagyu-smash',
    dishId: 1,
    name: 'Double Wagyu Smash Burger',
    category: 'Burgers',
    price: 16.50,
    videoUrl: '/videos/demo-dish-360.mp4',
    poster: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
    description: 'Double custom wagyu patty seared crisp on a 500°F flat-top, double aged cheddar melt, caramelized shallots, secret sauce, and toasted milk brioche.',
    chefNote: 'Our signature house-ground wagyu patty creates an ultra-crisp umami crust while keeping the center succulent.',
    caption: 'Sizzling hot on a 500°F seasoned cast-iron flat-top! 🍔🔥 Double house-ground American Wagyu patties smashed razor-thin for maximum crispy umami lace edges, covered with double melted Wisconsin sharp cheddar and sweet slow-caramelized shallot jam on buttered brioche.\n\nPrepared fresh to order every single time. Try it once and you\'ll never look at normal burgers the same way again!\n\n#WagyuSmash #BurgerPorn #StreetFoodGourmet #CrispyEdges #ChefSecrets #DhakaFoodie',
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
    videoUrl: '/videos/demo-dish-360.mp4',
    poster: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80',
    description: 'Flash-fried organic chicken wings tossed in fiery Minangkabau red chili glaze, crushed kaffir lime leaf, and caramelized shallot oil.',
    chefNote: 'Glazed sizzling hot straight from the wok to preserve the exterior crunch while sealing in the zesty chili aroma.',
    caption: 'Wok-tossed straight out of the sizzling peanut oil! 🔥🌶️ Double-dusted crispy organic chicken wings glazed with our authentic Minangkabau chili balado reduction, infused with torn kaffir lime leaf, caramelized shallot confit, and natural coconut palm sugar.\n\nPerfect balance of bold heat, citrus freshness, and crunch that builds with every bite. Warning: extremely addictive!\n\n#SpicyWings #BaladoWings #IndonesianFlavors #CrispyCrunch #WokHei #HotAndSpicy',
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
    videoUrl: '/videos/demo-dish-360.mp4',
    poster: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&auto=format&fit=crop&q=80',
    description: 'Crispy skin-on russet potatoes infused with aromatic white Italian truffle oil, 24-month aged parmesan snowfall, and roasted garlic aioli.',
    chefNote: 'Double-fried at two different temperatures to ensure the exterior stays crisp even under generous parmesan grating.',
    caption: 'Double-fried hand-cut Idaho russet potatoes drenched in pure white Italian truffle oil and a blizzard of 24-month aged Parmigiano-Reggiano! 🍟🧀\n\nTossed with fresh garden Italian parsley and flaky sea salt crystals, served alongside our house roasted garlic confit aioli.\n\n#TruffleFries #ParmesanSnow #GourmetFries #FoodieFavorites #LoadedFries #ChefSpecial',
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
    videoUrl: '/videos/demo-dish-360.mp4',
    poster: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&auto=format&fit=crop&q=80',
    description: 'Crisp-skin Norwegian salmon filet served over saffron risotto, tender asparagus spears, and a lemon-dill beurre blanc.',
    chefNote: 'Seared skin-down in cast iron for 4 minutes until glass-crisp, then basted with thyme compound butter.',
    caption: 'Wild Norwegian salmon fillet seared skin-side down until shatteringly crisp! 🐟✨\n\nBasted with French thyme compound butter and served over creamy Spanish saffron risotto, charred baby asparagus, and a velvety citrus-dill beurre blanc. Pure culinary luxury crafted with love.\n\n#AtlanticSalmon #CrispySkin #SeafoodLovers #RisottoLove #FineDining #ChefTanvir',
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
    videoUrl: '/videos/demo-dish-360.mp4',
    poster: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80',
    description: 'Warm Valrhona molten dark chocolate cake flowing onto Madagascar vanilla bean gelato and crushed raspberry dust.',
    chefNote: 'Baked to exact 11 minutes so the chocolate core flows warm and silky upon the first spoon cut.',
    caption: 'Warm Belgian 70% Valrhona molten dark chocolate cake with a rich liquid heart that flows like velvet upon the very first spoon cut! 🍫🍨\n\nPaired with cold Madagascar Bourbon vanilla bean gelato, tart raspberry coulis, and Dutch cocoa dust. Baked fresh to order in exactly 11 minutes.\n\n#ChocolateLava #MoltenCake #Valrhona #DessertHeaven #SweetTooth #ChocoLover',
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
  },
  {
    id: 'reel-ribeye-steak',
    dishId: 4,
    name: 'Char-Grilled Prime Ribeye Steak',
    category: 'Mains',
    price: 29.50,
    videoUrl: '/videos/demo-dish-360.mp4',
    poster: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80',
    description: '300g Prime grass-fed ribeye seared over white-hot binchotan charcoal, roasted garlic herb butter, and charred asparagus.',
    chefNote: 'Seared to a textbook medium-rare, locking in juices with garlic rosemary butter baste.',
    caption: 'Listen to that sizzling crust on the hot cast iron! 🥩🔥 300g Prime grass-fed ribeye steak seared over white-hot binchotan charcoal, basted continuously with roasted garlic cloves, fresh rosemary, and Normandy cultured butter.\n\nRested to a tender medium-rare with our signature chimichurri and charred asparagus spears. Every bite melts in your mouth with deep wood-fired smokiness.\n\n#RibeyeSteak #SteakLover #CharcoalGrilled #MediumRare #MeatPorn #SteakhouseGourmet #FoodieLife',
    prepTime: '20 min',
    isSpicy: false,
    isVeg: false,
    ingredients: [
      '300g Prime Grass-Fed Ribeye',
      'Normandy Cultured Butter',
      'Fresh Rosemary & Thyme',
      'Roasted Garlic Confit',
      'Charred Asparagus Spears',
      'House Herb Chimichurri'
    ],
    initialLikes: 2890,
    initialComments: [
      { id: 'c11', author: 'CarnivoreDaily', text: 'That butter baste is hypnotic! 🔥', time: '8m ago', likes: 31 },
      { id: 'c12', author: 'VIP Diner', text: 'Tender as butter, ordered it rare. Perfect.', time: '40m ago', likes: 15 }
    ]
  },
  {
    id: 'reel-margherita-pizza',
    dishId: 3,
    name: 'Artisan Wood-Fired Margherita Pizza',
    category: 'Pizza',
    price: 18.00,
    videoUrl: '/videos/demo-dish-360.mp4',
    poster: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=900&auto=format&fit=crop&q=80',
    description: 'San Marzano tomatoes, fresh buffalo mozzarella, extra virgin olive oil, sweet basil.',
    chefNote: 'Stone-baked at 900°F for 90 seconds to produce airy leopard-spotted crust blisters.',
    caption: 'Baked at blistering 900°F inside our stone wood-fired oven in under 90 seconds! 🍕🔥 Look at those gorgeous leopard-spotted crust blisters puffing up live in the flames.\n\nCrafted with 72-hour cold-fermented sourdough, crushed San Marzano DOP tomatoes, imported buffalo mozzarella medallions, and freshly plucked sweet basil leaves drizzled with cold-pressed Sicilian olive oil.\n\n#NeapolitanPizza #WoodFired #Margherita #SourdoughPizza #PizzaLover #CheesyGoodness',
    prepTime: '10 min',
    isSpicy: false,
    isVeg: true,
    ingredients: [
      '72-Hour Fermented Dough',
      'San Marzano D.O.P. Tomatoes',
      'Fresh Buffalo Mozzarella',
      'Sweet Genovese Basil',
      'Extra Virgin Sicilian Olive Oil',
      'Fleur de Sel'
    ],
    initialLikes: 4120,
    initialComments: [
      { id: 'c13', author: 'NapoliFan', text: 'The crust bubble rise is art! 🍕', time: '14m ago', likes: 64 },
      { id: 'c14', author: 'FoodReviewBD', text: 'Best wood-fired crust in town.', time: '2h ago', likes: 23 }
    ]
  },
  {
    id: 'reel-passion-mocktail',
    dishId: 6,
    name: 'Signature Passionfruit Mint Cooler',
    category: 'Beverages',
    price: 7.50,
    videoUrl: '/videos/demo-dish-360.mp4',
    poster: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
    description: 'Fresh passionfruit pulp vigorously shaken with spearmint, raw agave, and key lime juice over crystal ice.',
    chefNote: 'Cold-pressed mint release creates an ultra-crisp aromatic aroma.',
    caption: 'The ultimate tropical refresher! 🍹🌴 Freshly scooped golden passionfruit pulp vigorously shaken with muddled Moroccan spearmint, raw agave nectar, and freshly squeezed key lime juice, topped with sparkling club soda over hand-carved crystal ice.\n\nZesty, bubbly, and thirst-quenching. The ideal companion to balance our spicy dishes!\n\n#MocktailBar #PassionfruitCooler #CraftBeverages #Refreshment #ZeroProof #TropicalVibes',
    prepTime: '4 min',
    isSpicy: false,
    isVeg: true,
    ingredients: [
      'Fresh Passionfruit Pulp',
      'Moroccan Spearmint',
      'Key Lime Juice',
      'Organic Blue Agave',
      'Sparkling Club Soda',
      'Crushed Crystal Ice'
    ],
    initialLikes: 1940,
    initialComments: [
      { id: 'c15', author: 'SummerVibes', text: 'So refreshing with the wings! 🍹', time: '20m ago', likes: 11 }
    ]
  },
  {
    id: 'reel-nachos-fiery',
    dishId: 5,
    name: 'Fiery Loaded Jalapeño Nachos',
    category: 'Starters',
    price: 11.25,
    videoUrl: '/videos/demo-dish-360.mp4',
    poster: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=900&auto=format&fit=crop&q=80',
    description: 'Stone ground tortilla chips, melted cheddar blend, pickled jalapeños, pico de gallo, guacamole.',
    chefNote: 'Layered in three tiers so every single chip gets melted cheese coverage.',
    caption: 'Ultimate crunchy comfort food! 🧀🌮 Thick stone-ground yellow corn tortilla chips piled high and smothered in a bubbling blanket of triple-cheddar fondue, house-pickled fiery jalapeño slices, fresh pico de gallo, and cool Haas avocado crema.\n\nPull a chip and watch the glorious cheese stretch! Perfect for sharing with friends at your table.\n\n#LoadedNachos #CheesePull #JalapenoLovers #ComfortFood #BarBites #TexMexFlavors',
    prepTime: '10 min',
    isSpicy: true,
    isVeg: true,
    ingredients: [
      'Stone-Ground Corn Chips',
      'Aged Triple-Cheddar Blend',
      'House-Pickled Jalapeños',
      'Fresh Pico de Gallo',
      'Haas Avocado Crema',
      'Cilantro Garnish'
    ],
    initialLikes: 2310,
    initialComments: [
      { id: 'c16', author: 'SnackMonster', text: 'Look at that cheese pull!! 🤤', time: '18m ago', likes: 29 }
    ]
  }
];

/** Audio Player for Voice Reviews in Reels */
function ReelVoiceCommentPlayer({ audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="flex items-center gap-2.5 mt-2 p-2 rounded-xl bg-white/10 border border-white/15 select-none">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FF5A26] via-rose-500 to-amber-500 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md shrink-0"
        aria-label={isPlaying ? 'Pause voice comment' : 'Play voice comment'}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-[100px]">
        <div className="flex items-center gap-1 h-3 mb-0.5">
          <span className={`w-1 h-2 rounded-full ${isPlaying ? 'bg-[#FF5A26] animate-pulse' : 'bg-white/40'}`} />
          <span className={`w-1 h-3 rounded-full ${isPlaying ? 'bg-[#FF5A26]' : 'bg-white/60'}`} />
          <span className={`w-1 h-1.5 rounded-full ${isPlaying ? 'bg-[#FF5A26] animate-pulse' : 'bg-white/30'}`} />
          <span className={`w-1 h-3.5 rounded-full ${isPlaying ? 'bg-[#FF5A26]' : 'bg-white/70'}`} />
          <span className={`w-1 h-2 rounded-full ${isPlaying ? 'bg-[#FF5A26] animate-pulse' : 'bg-white/50'}`} />
          <span className={`w-1 h-3 rounded-full ${isPlaying ? 'bg-[#FF5A26]' : 'bg-white/60'}`} />
        </div>
        <span className="text-[10px] font-bold text-amber-300 block tracking-wide">
          {isPlaying ? 'Playing Voice Review…' : '🎤 Tap to Listen'}
        </span>
      </div>
    </div>
  );
}

// First real photo of a dish (some dishes keep their video in the image fields)
const VIDEO_FILE_RE = /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i;
function dishPhoto(item) {
  const candidates = [
    item.image_url,
    item.imageUrl,
    item.image,
    ...(Array.isArray(item.images) ? item.images : []),
    item.poster,
  ];
  return candidates.find((u) => typeof u === 'string' && u.trim() && !VIDEO_FILE_RE.test(u) && !u.includes('/videos/'))
    || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=80';
}

export default function FoodReelsModal({
  isOpen,
  present = false,
  warm = false,
  rootRef,
  onRequestClose,
  menuItems = [],
  funReels = [],
  onAddToCart,
  initialDishId = null,
  tableNumber = null
}) {
  // Feed = dishes the admin marked "Show in Reels" (with Add to Order) mixed with the admin's
  // stand-alone fun reels (no order bar). Demo reels only fill in when neither exists.
  const activeReels = useMemo(() => {
    const list = [];

    if (Array.isArray(menuItems) && menuItems.length > 0) {
      menuItems.forEach((item) => {
        const vidUrl = permanentMediaUrl(item.making_video_url || item.makingVideoUrl || item.videoUrl);
        const flag = item.showInReels !== undefined ? item.showInReels : item.show_in_reels;
        const isReelAllowed = flag === undefined || flag === 1 || flag === true || item.is_reel === 1;

        if (vidUrl && isReelAllowed) {
          list.push({
            kind: 'product',
            id: `item-${item.id}`,
            dishId: item.id,
            name: item.name || item.title,
            category: item.category_name || item.category || 'Kitchen Specials',
            price: Number(item.price) || 0,
            videoUrl: vidUrl,
            poster: dishPhoto(item),
            description: item.description || 'Chef special culinary creation.',
            chefNote: item.chefNote || 'Prepared fresh upon order by our kitchen team.',
            caption: item.reel_caption || item.caption || item.description || item.chefNote || '',
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

    const fun = (Array.isArray(funReels) ? funReels : [])
      .filter((r) => r && r.videoUrl)
      .map((r) => ({
        kind: 'fun',
        id: `fun-${r._id}`,
        name: r.title,
        category: 'Reel',
        videoUrl: permanentMediaUrl(r.videoUrl),
        poster: permanentMediaUrl(r.posterUrl || ''),
        caption: r.caption || '',
        description: r.caption || '',
        initialLikes: 300 + (String(r._id).charCodeAt(0) % 9) * 70,
        initialComments: []
      }));

    if (list.length > 0 || fun.length > 0) {
      // One fun reel after every three dish reels, the rest at the end
      const mixed = [];
      let f = 0;
      list.forEach((reel, i) => {
        mixed.push(reel);
        if ((i + 1) % 3 === 0 && f < fun.length) mixed.push(fun[f++]);
      });
      while (f < fun.length) mixed.push(fun[f++]);
      return mixed;
    }

    // Nothing set up yet: show the built-in demo dish reels
    {
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
  }, [menuItems, funReels]);

  const isFunReel = (reel) => reel?.kind === 'fun';
  // A reel without any video is shown as a full-screen photo of the dish
  const isPhotoReel = (reel) => !reel?.videoUrl;

  // Current reel index (synced with scroll position)
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentReel = activeReels[currentIndex] || activeReels[0];

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

  // Swipe Left Tutorial Pill when Reels opens
  const [showBackTutorial, setShowBackTutorial] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowBackTutorial(true);
      const timer = setTimeout(() => setShowBackTutorial(false), 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  // Back to the menu: the parent's pager slides both screens (dir = the way the reels travel).
  // Sideways swipes themselves are handled by that pager (hooks/useMenuReelsSwipe.js).
  const handleSmoothClose = useCallback((dir = 'right') => {
    if (isOpen) onRequestClose?.(dir);
  }, [isOpen, onRequestClose]);

  // Facebook-Style 2-Line Caption Expand / Scroll State
  const [expandedCaptions, setExpandedCaptions] = useState({});

  const toggleCaptionExpand = (idx) => {
    setExpandedCaptions((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Text-to-Speech (Voice Read / Listen Aloud) State
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeakCaption = (textToSpeak) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = (textToSpeak || '').replace(/#\w+/g, '').replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [currentIndex, isOpen]);

  // Customer Voice Comment Recording Hook
  const {
    isRecording: isRecordingVoiceComment,
    recordingTime: voiceCommentTime,
    audioBlob: voiceCommentBlob,
    startRecording: startVoiceComment,
    stopRecording: stopVoiceComment,
    resetRecording: resetVoiceComment
  } = useVoiceRecorder({ maxDuration: 20 });

  const sendVoiceCommentOnStop = useRef(false);

  const handleSendVoiceComment = () => {
    sendVoiceCommentOnStop.current = true;
    stopVoiceComment();
  };

  useEffect(() => {
    if (voiceCommentBlob && sendVoiceCommentOnStop.current && currentReel) {
      sendVoiceCommentOnStop.current = false;
      const reelKey = String(currentReel.dishId || currentReel.id);
      const author = guestAuthorName.trim() || (tableNumber ? `Table #${tableNumber} Diner` : 'Anonymous Foodie');

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;
        const newVoiceComment = {
          id: `anon-voice-${Date.now()}`,
          author,
          text: '🎤 Voice Review',
          audioUrl: base64Data,
          isVoice: true,
          time: 'Just now',
          likes: 1
        };

        setCommentsMap((prev) => {
          const existing = prev[reelKey] || currentReel.initialComments || [];
          const updatedList = [newVoiceComment, ...existing];
          const nextMap = { ...prev, [reelKey]: updatedList };
          try {
            localStorage.setItem('smartdine_reels_comments', JSON.stringify(nextMap));
          } catch (_) {}
          return nextMap;
        });

        resetVoiceComment();
      };
      reader.readAsDataURL(voiceCommentBlob);
    }
  }, [voiceCommentBlob, currentReel, guestAuthorName, tableNumber, resetVoiceComment]);

  // DOM Refs
  const scrollContainerRef = useRef(null);
  const reelElementsRef = useRef([]);
  const videoRefs = useRef([]);
  const lastTapTimes = useRef({});
  const tapTimeoutRefs = useRef({});
  const wheelLockedRef = useRef(false);

  const scrollAnimRef = useRef(0);
  const wheelGestureRef = useRef({ sum: 0, lastTime: 0, lastMag: 0, locked: false, firedAt: 0 });

  // Glide to a reel with an eased rAF animation. Snap is switched off while gliding so the
  // browser's own snapping can't fight the animation, then restored once it lands.
  const scrollToReel = useCallback((targetIndex, { instant = false } = {}) => {
    const container = scrollContainerRef.current;
    const bounded = Math.max(0, Math.min(targetIndex, activeReels.length - 1));
    const el = reelElementsRef.current[bounded];
    if (!container || !el) return;
    setCurrentIndex(bounded);

    cancelAnimationFrame(scrollAnimRef.current);
    const from = container.scrollTop;
    const to = el.offsetTop;
    const distance = to - from;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (instant || reduceMotion || Math.abs(distance) < 2) {
      container.scrollTop = to;
      return;
    }

    const duration = Math.min(420, 260 + Math.abs(distance) * 0.08);
    const ease = (t) => 1 - Math.pow(1 - t, 4); // easeOutQuart: quick start, soft landing
    const start = performance.now();
    container.style.scrollSnapType = 'none';
    container.style.scrollBehavior = 'auto';

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      container.scrollTop = from + distance * ease(t);
      if (t < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        container.style.scrollSnapType = '';
        container.style.scrollBehavior = '';
        scrollAnimRef.current = 0;
      }
    };
    scrollAnimRef.current = requestAnimationFrame(step);
  }, [activeReels.length]);

  useEffect(() => () => cancelAnimationFrame(scrollAnimRef.current), []);

  // Mouse wheel / trackpad: stop the native scroll inside the feed so only our glide moves it
  // (non-passive so preventDefault works; navigation itself is handled by handleWheel)
  useEffect(() => {
    if (!isOpen) return undefined;
    const container = scrollContainerRef.current;
    if (!container) return undefined;
    const block = (e) => {
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) e.preventDefault();
    };
    container.addEventListener('wheel', block, { passive: false });
    return () => container.removeEventListener('wheel', block);
  }, [isOpen]);

  // Keep the 5 reels around the one playing ready on the phone: this one first, then the
  // next and previous, then two away. Scrolling either way moves the window along.
  useEffect(() => {
    if (!isOpen || activeReels.length === 0) return;
    const order = [0, 1, -1, 2, -2]
      .map((d) => currentIndex + d)
      .filter((i) => i >= 0 && i < activeReels.length);
    prefetchVideos(
      order.map((i) => activeReels[i]).filter((r) => !isPhotoReel(r)).map((r) => r.videoUrl),
      { priority: true }
    );
  }, [isOpen, currentIndex, activeReels]);

  // Jump to initial dish if specified
  useEffect(() => {
    if (isOpen && initialDishId && activeReels.length > 0) {
      const idx = activeReels.findIndex((r) => String(r.dishId) === String(initialDishId));
      if (idx !== -1) {
        setTimeout(() => {
          scrollToReel(idx, { instant: true });
        }, 60);
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
          if (entry.isIntersecting && !scrollAnimRef.current) {
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

    // Nothing plays while the reels are only being dragged in, or have left
    if (!isOpen) {
      videoRefs.current.forEach((v) => { if (v && !v.paused) v.pause(); });
      return;
    }

    // Only touch videos that are actually playing or were played (seeking all of them on every
    // change stalls the decoder and makes the swipe stutter)
    videoRefs.current.forEach((videoEl, idx) => {
      if (!videoEl || idx === currentIndex) return;
      if (!videoEl.paused) videoEl.pause();
      if (videoEl.currentTime > 0) videoEl.currentTime = 0;
    });
    setPlayingMap({ [currentIndex]: true });

    const videoEl = videoRefs.current[currentIndex];
    if (!videoEl) return;
    videoEl.muted = isMuted;
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Browser autoplay blocked -> force mute and replay
        videoEl.muted = true;
        setIsMuted(true);
        videoEl.play().catch(() => {});
      });
    }
  }, [currentIndex, isMuted, isOpen]);

  // Sync mute state across all video tags
  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) v.muted = isMuted;
    });
  }, [isMuted]);

  // Wheel event handler:
  // - Laptop Trackpad Horizontal Swipe (2 or 3 fingers) -> Smoothly Close Food Reels and return to Food Menu
  // - Vertical Reel Scroll -> Navigate to Next / Previous Reel
  const handleWheel = useCallback((e) => {
    if (showComments || showIngredients) return;

    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);

    // Vertical reel scroll: one swipe = one reel.
    // - A gentle trackpad swipe sends many small steps, so steps add up until ~50px.
    // - After a flick the trackpad keeps "coasting" (momentum events that only get smaller), so
    //   further reels are blocked until the wheel goes quiet OR the speed rises again, which
    //   means a fresh swipe has started.
    if (absY < absX) return;
    const now = Date.now();
    const w = wheelGestureRef.current;
    const quietFor = now - w.lastTime;
    const dir = Math.sign(e.deltaY);
    const freshSwipe = w.locked && now - w.firedAt > 140 && absY > w.lastMag * 1.3 + 2;
    if (quietFor > 120 || freshSwipe) {
      w.locked = false;
      w.sum = 0;
    }
    if (dir !== Math.sign(w.sum)) w.sum = 0;
    w.lastTime = now;
    w.lastMag = absY;
    if (w.locked || !dir) return;
    w.sum += e.deltaY;
    if (Math.abs(w.sum) >= 50) {
      w.locked = true;
      w.firedAt = now;
      w.sum = 0;
      scrollToReel(currentIndex + dir);
    }
  }, [showComments, showIngredients, currentIndex, scrollToReel]);

  // Vertical wheel / trackpad scrolling while Food Reels is open
  useEffect(() => {
    if (!isOpen) return undefined;
    const onWindowWheel = (e) => handleWheel(e);
    window.addEventListener('wheel', onWindowWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWindowWheel);
  }, [isOpen, handleWheel]);

  // Keyboard navigation (ArrowDown / ArrowUp / ArrowLeft / Space / Mute / Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Escape') {
        if (showIngredients) setShowIngredients(false);
        else if (showComments) setShowComments(false);
        else handleSmoothClose(e.key === 'ArrowRight' ? 'left' : 'right');
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
  }, [isOpen, showIngredients, showComments, currentIndex, scrollToReel, handleSmoothClose]);

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

  // Each reel's card takes the shape of its own video / photo (landscape or portrait)
  const [aspectMap, setAspectMap] = useState({});
  const noteAspect = useCallback((idx, w, h) => {
    if (!w || !h) return;
    const ratio = Math.round((w / h) * 1000) / 1000;
    setAspectMap((prev) => (prev[idx] === ratio ? prev : { ...prev, [idx]: ratio }));
  }, []);

  // Spinner only while the reel on screen is actually waiting for data
  const [bufferingIndex, setBufferingIndex] = useState(null);
  useEffect(() => setBufferingIndex(null), [currentIndex]);

  // Thin progress line under the playing video, written straight to the DOM each frame
  const progressRefs = useRef([]);
  useEffect(() => {
    if (!isOpen) return undefined;
    let raf = 0;
    const tick = () => {
      const v = videoRefs.current[currentIndex];
      const bar = progressRefs.current[currentIndex];
      if (v && bar && v.duration) bar.style.transform = `scaleX(${v.currentTime / v.duration})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, currentIndex]);

  const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n));

  if (!present && !isOpen && !warm) return null;
  // Off screen and idle: only the first reel is loaded, ready for the next swipe in
  const live = isOpen || present;

  // Active reel specific states
  const currentReelKey = String(currentReel.dishId || currentReel.id);
  const currentLikeData = likesMap[currentReelKey] || { count: currentReel.initialLikes, isLoved: false };
  const activeComments = commentsMap[currentReelKey] || currentReel.initialComments || [];

  return (
    <div
      ref={rootRef}
      className={`reels-pager reels-screen fixed inset-0 z-50 select-none ${isOpen ? 'is-open' : ''}`}
    >
      {/* Close + title (top-left of the screen, like Facebook Reels) */}
      <div className="absolute top-3 left-3 z-40 flex items-center gap-2.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => handleSmoothClose('right')}
          className="reel-round-btn reel-round-btn--light"
          aria-label="Back to menu"
          title="Back to menu"
        >
          <X className="w-5 h-5" strokeWidth={2.4} />
        </button>
        <span className="text-white text-xl font-bold tracking-tight drop-shadow">Reels</span>
      </div>

      {/* Vertical feed: one reel per screen */}
      <div ref={scrollContainerRef} className="reels-snap-feed">
        {activeReels.map((reel, index) => {
          const reelKey = String(reel.dishId || reel.id);
          const isSlideLoved = (likesMap[reelKey] || {}).isLoved;
          const slideLikesCount = (likesMap[reelKey] || {}).count || reel.initialLikes;
          const slideComments = commentsMap[reelKey] || reel.initialComments || [];
          const isCurrentSlide = index === currentIndex;
          const near = Math.abs(index - currentIndex);
          const aspect = aspectMap[index] || 16 / 9;
          const captionText = reel.caption || reel.description || '';
          const isExpanded = Boolean(expandedCaptions[index]);
          const isDish = !isFunReel(reel);

          return (
            <div
              key={reel.id}
              data-index={index}
              ref={(el) => (reelElementsRef.current[index] = el)}
              className="reel-snap-slide"
            >
              <div className="reel-stage">
                {/* The video card, sized to the video's own shape */}
                <div
                  className="reel-card"
                  style={{ '--reel-aspect': aspect }}
                  onClick={(e) => handleSlideTap(e, index)}
                >
                  {isPhotoReel(reel) ? (
                    <img
                      ref={() => (videoRefs.current[index] = null)}
                      src={reel.poster}
                      alt={reel.name}
                      loading={near <= 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onLoad={(e) => noteAspect(index, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                      className={`reel-video ${aspect < 1 ? 'is-portrait' : ''}`}
                    />
                  ) : (
                    <video
                      ref={(el) => (videoRefs.current[index] = el)}
                      src={near <= (live ? 3 : 0) ? reel.videoUrl : undefined}
                      poster={reel.poster}
                      playsInline
                      loop
                      muted={isMuted}
                      preload={!live ? (near === 0 ? 'auto' : 'none') : near <= 1 ? 'auto' : near <= 3 ? 'metadata' : 'none'}
                      onLoadedMetadata={(e) => noteAspect(index, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
                      onWaiting={() => isCurrentSlide && setBufferingIndex(index)}
                      onPlaying={() => setBufferingIndex((b) => (b === index ? null : b))}
                      className={`reel-video ${aspect < 1 ? 'is-portrait' : ''}`}
                    />
                  )}

                  <div className="reel-shade" />

                  {/* Loading spinner while the current video buffers */}
                  {isCurrentSlide && bufferingIndex === index && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <span className="reel-spinner" />
                    </div>
                  )}

                  {/* Sound (top-left of the card on desktop, top-right on phones) */}
                  {!isPhotoReel(reel) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted((prev) => !prev);
                      }}
                      className="reel-round-btn reel-mute-btn"
                      aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-[18px] h-[18px]" /> : <Volume2 className="w-[18px] h-[18px]" />}
                    </button>
                  )}

                  {/* Play / pause flash */}
                  {playIconFlash && playIconFlash.idx === index && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <div className="w-16 h-16 rounded-full bg-black/55 text-white flex items-center justify-center animate-scaleUp">
                        {playIconFlash.isPlaying ? <Play className="w-8 h-8 ml-1 fill-white" /> : <Pause className="w-8 h-8 fill-white" />}
                      </div>
                    </div>
                  )}

                  {/* Double-tap like */}
                  {heartBurstMap[index] && (
                    <div className="heart-burst-animate">
                      <ThumbsUp className="w-24 h-24 text-white fill-[#1877F2] drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
                    </div>
                  )}

                  {/* Bottom: dish, caption, order */}
                  <div className="reel-info" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={reel.poster}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-white/30 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-white text-sm font-semibold truncate drop-shadow">{reel.name}</span>
                      {isDish && (
                        <>
                          <span className="text-white/70 text-sm shrink-0">·</span>
                          <span className="text-white text-sm font-semibold shrink-0 tabular-nums">
                            ${Number(reel.price || 0).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>

                    {captionText && (
                      <p
                        className={`mt-1.5 text-white/95 text-[13px] leading-snug drop-shadow cursor-pointer ${isExpanded ? 'reel-caption-open' : 'line-clamp-1'}`}
                        onClick={() => toggleCaptionExpand(index)}
                      >
                        {captionText}
                      </p>
                    )}

                    {isDish && isCurrentSlide && (
                      <button
                        type="button"
                        onClick={handleOrderThisDish}
                        className={`reel-order-btn ${addedSuccess ? 'is-added' : ''}`}
                      >
                        {addedSuccess ? <Check className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4" strokeWidth={3} />}
                        <span>{addedSuccess ? 'Added to order' : 'Add to order'}</span>
                      </button>
                    )}
                  </div>

                  {/* Video progress */}
                  {!isPhotoReel(reel) && (
                    <div className="reel-progress">
                      <span ref={(el) => (progressRefs.current[index] = el)} className="reel-progress-fill" />
                    </div>
                  )}
                </div>

                {/* Actions (beside the card on desktop, over it on phones) */}
                <div className="reel-actions">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSlideLoved) triggerHeartBurst(index);
                      triggerLoveAction(reel);
                    }}
                    className="reel-action"
                    aria-label="Like"
                  >
                    <ThumbsUp className={`w-7 h-7 ${isSlideLoved ? 'fill-[#1877F2] text-[#1877F2]' : ''}`} strokeWidth={1.8} />
                    <span>{formatCount(slideLikesCount)}</span>
                  </button>
                  <button type="button" onClick={() => setShowComments(true)} className="reel-action" aria-label="Comments">
                    <MessageCircle className="w-7 h-7" strokeWidth={1.8} />
                    <span>{slideComments.length}</span>
                  </button>
                  <button type="button" onClick={() => handleShareReel(reel)} className="reel-action" aria-label="Share">
                    <Forward className="w-7 h-7" strokeWidth={1.8} />
                    <span>Share</span>
                  </button>
                  {isDish && (
                    <button type="button" onClick={() => setShowIngredients(true)} className="reel-action" aria-label="Dish details">
                      <MoreHorizontal className="w-7 h-7" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Previous / next (desktop) */}
      {isOpen && (
        <div className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col gap-3 z-30">
          <button
            type="button"
            onClick={() => scrollToReel(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="reel-round-btn reel-nav-btn"
            aria-label="Previous reel"
            title="Previous (↑)"
          >
            <ChevronUp className="w-6 h-6" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => scrollToReel(currentIndex + 1)}
            disabled={currentIndex === activeReels.length - 1}
            className="reel-round-btn reel-nav-btn"
            aria-label="Next reel"
            title="Next (↓)"
          >
            <ChevronDown className="w-6 h-6" strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Dish details (… button) */}
      {showIngredients && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3 animate-fadeIn" onClick={() => setShowIngredients(false)}>
          <div
            className="ingredients-glass-card w-full max-w-md max-h-[75vh] overflow-y-auto rounded-2xl p-5 text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-base leading-tight">{currentReel.name}</h3>
                {!isFunReel(currentReel) && (
                  <p className="text-sm text-white/70 mt-0.5">${Number(currentReel.price || 0).toFixed(2)} · {currentReel.prepTime}</p>
                )}
              </div>
              <button type="button" onClick={() => setShowIngredients(false)} className="reel-round-btn shrink-0" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            {(currentReel.chefNote || currentReel.description) && (
              <p className="text-sm text-white/85 leading-relaxed">{currentReel.chefNote || currentReel.description}</p>
            )}
            {Array.isArray(currentReel.ingredients) && currentReel.ingredients.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">Ingredients</div>
                <div className="flex flex-wrap gap-1.5">
                  {currentReel.ingredients.map((ing, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-white/10 text-xs">{ing}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Comments drawer ── */}
      {showComments && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center animate-fadeIn" onClick={() => setShowComments(false)}>
          <div className="w-full sm:max-w-lg max-h-[70vh] comments-drawer rounded-t-2xl flex flex-col p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm">Comments ({activeComments.length})</h3>
              <button type="button" onClick={() => setShowComments(false)} className="reel-round-btn" aria-label="Close comments">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 max-h-[42vh] pr-1">
              {activeComments.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-xs">No comments yet. Be the first!</div>
              ) : (
                activeComments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {c.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 bg-white/[0.08] rounded-2xl px-3 py-2 text-[13px]">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold">{c.author}</span>
                        <span className="text-[11px] text-white/45">{c.time}</span>
                      </div>
                      <p className="text-white/85 leading-snug">{c.text}</p>
                      {c.audioUrl && <ReelVoiceCommentPlayer audioUrl={c.audioUrl} />}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-white/10">
              {isRecordingVoiceComment ? (
                <div className="flex items-center justify-between gap-2 bg-rose-950/50 border border-rose-500/50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="font-semibold text-rose-300">Recording</span>
                    <span className="font-mono">{voiceCommentTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={resetVoiceComment} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20" title="Cancel">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={handleSendVoiceComment} className="px-3 py-1.5 rounded-lg bg-[#1877F2] text-white font-semibold text-xs flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    className="flex-1 px-3.5 py-2.5 rounded-full bg-white/10 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                  />
                  <button type="button" onClick={startVoiceComment} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" title="Voice comment">
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center disabled:opacity-40"
                    aria-label="Post comment"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {copiedToast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-4 py-2 rounded-full text-sm font-semibold shadow-xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Link copied</span>
        </div>
      )}
    </div>
  );
}
