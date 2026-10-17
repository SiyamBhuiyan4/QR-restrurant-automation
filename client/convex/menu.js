import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMenu = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    categories.sort((a, b) => a.sortOrder - b.sortOrder);

    const items = await ctx.db.query("menuItems").collect();

    const categorized = categories.map((cat) => ({
      ...cat,
      items: items.filter((item) => item.categorySlug === cat.slug || item.categoryId === cat._id),
    }));

    return categorized;
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const createMenuItem = mutation({
  args: {
    categorySlug: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    imageUrl: v.string(),
    images: v.optional(v.array(v.string())),
    makingVideoUrl: v.optional(v.string()),
    isVeg: v.boolean(),
    isSpicy: v.boolean(),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .first();

    return await ctx.db.insert("menuItems", {
      ...args,
      categoryId: category ? category._id : undefined,
    });
  },
});

export const updateMenuItem = mutation({
  args: {
    id: v.id("menuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    makingVideoUrl: v.optional(v.string()),
    isVeg: v.optional(v.boolean()),
    isSpicy: v.optional(v.boolean()),
    isAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const fieldsToUpdate = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        fieldsToUpdate[key] = val;
      }
    }
    await ctx.db.patch(id, fieldsToUpdate);
    return true;
  },
});

export const toggleAvailability = mutation({
  args: {
    id: v.id("menuItems"),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, { id, isAvailable }) => {
    await ctx.db.patch(id, { isAvailable });
    return true;
  },
});

export const deleteMenuItem = mutation({
  args: {
    id: v.id("menuItems"),
  },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});

// Seed default categories and realistic dishes if empty
export const seedMenu = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("categories").first();
    if (existing) {
      return { seeded: false, message: "Menu already seeded" };
    }

    const defaultCategories = [
      { name: "Starters", slug: "starters", icon: "🥗", sortOrder: 1 },
      { name: "Mains", slug: "mains", icon: "🍲", sortOrder: 2 },
      { name: "Burgers & Sandwiches", slug: "burgers-sandwiches", icon: "🍔", sortOrder: 3 },
      { name: "Beverages", slug: "beverages", icon: "🥤", sortOrder: 4 },
      { name: "Desserts", slug: "desserts", icon: "🍰", sortOrder: 5 },
    ];

    const categoryMap = {};
    for (const cat of defaultCategories) {
      const id = await ctx.db.insert("categories", cat);
      categoryMap[cat.slug] = id;
    }

    const defaultVideoReel = "/videos/reel-chef.mp4";

    const defaultItems = [
      {
        categorySlug: "starters",
        name: "Crispy Garlic Calamari",
        description: "Tender flash-fried calamari tossed in roasted garlic and served with lemon-herb aioli.",
        price: 11.99,
        imageUrl: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80",
        images: [
          "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80"
        ],
        makingVideoUrl: defaultVideoReel,
        isVeg: false,
        isSpicy: false,
        isAvailable: true,
      },
      {
        categorySlug: "starters",
        name: "Artisan Bruschetta",
        description: "Toasted sourdough slices topped with vine-ripened tomatoes, sweet basil, garlic, and aged balsamic glaze.",
        price: 8.50,
        imageUrl: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&auto=format&fit=crop&q=80",
        images: [
          "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=900&auto=format&fit=crop&q=80"
        ],
        makingVideoUrl: defaultVideoReel,
        isVeg: true,
        isSpicy: false,
        isAvailable: true,
      },
      {
        categorySlug: "starters",
        name: "Spicy Buffalo Cauliflower Bites",
        description: "Crispy battered cauliflower florets coated in house fiery buffalo sauce, served with cool vegan ranch.",
        price: 9.75,
        imageUrl: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&auto=format&fit=crop&q=80",
        images: [
          "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1527477321005-4d01d75b2d5c?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=900&auto=format&fit=crop&q=80"
        ],
        makingVideoUrl: defaultVideoReel,
        isVeg: true,
        isSpicy: true,
        isAvailable: true,
      },
      {
        categorySlug: "mains",
        name: "Grilled Herb Ribeye Steak",
        description: "10oz prime ribeye grilled to perfection with rosemary-infused butter and roasted fingerling potatoes.",
        price: 24.99,
        imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
        images: [
          "https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1558030006-450675393462?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1504973960431-1c467e159aa4?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=900&auto=format&fit=crop&q=80"
        ],
        makingVideoUrl: defaultVideoReel,
        isVeg: false,
        isSpicy: false,
        isAvailable: true,
      },
      {
        categorySlug: "mains",
        name: "Creamy Truffle Tagliatelle",
        description: "Handmade pasta ribbons enveloped in a rich black truffle and parmesan cream sauce with wild forest mushrooms.",
        price: 17.50,
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3d5d6281290?w=600&auto=format&fit=crop&q=80",
        images: [
          "https://images.unsplash.com/photo-1621996346565-e3d5d6281290?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&auto=format&fit=crop&q=80"
        ],
        makingVideoUrl: defaultVideoReel,
        isVeg: true,
        isSpicy: false,
        isAvailable: true,
      },
      {
        categorySlug: "burgers-sandwiches",
        name: "The Signature Wagyu Smash",
        description: "Double 4oz wagyu beef patties, melted sharp cheddar, caramelized shallots, crisp butter lettuce, and house brioche.",
        price: 15.99,
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
        images: [
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=900&auto=format&fit=crop&q=80"
        ],
        makingVideoUrl: defaultVideoReel,
        isVeg: false,
        isSpicy: false,
        isAvailable: true,
      },
      {
        categorySlug: "beverages",
        name: "Fresh Mint & Lime Mojito",
        description: "Muddled garden mint, zesty fresh lime juice, raw cane sugar, sparkling soda, and crushed ice (Alcohol-free).",
        price: 5.50,
        imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        images: [
          "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1556881286-fc6915169721?w=900&auto=format&fit=crop&q=80"
        ],
        makingVideoUrl: defaultVideoReel,
        isVeg: true,
        isSpicy: false,
        isAvailable: true,
      },
      {
        categorySlug: "desserts",
        name: "Warm Molten Lava Cake",
        description: "Rich dark Belgian chocolate cake with a molten center, accompanied by Madagascar vanilla bean gelato.",
        price: 8.75,
        imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
        images: [
          "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=900&auto=format&fit=crop&q=80"
        ],
        makingVideoUrl: defaultVideoReel,
        isVeg: true,
        isSpicy: false,
        isAvailable: true,
      },
    ];

    for (const item of defaultItems) {
      await ctx.db.insert("menuItems", {
        ...item,
        categoryId: categoryMap[item.categorySlug],
      });
    }

    return { seeded: true, count: defaultItems.length };
  },
});

export const getDishById = query({
  args: { id: v.id("menuItems") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const repairMediaUrls = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("menuItems").collect();
    let updatedCount = 0;
    for (const item of items) {
      if (!item.makingVideoUrl || item.makingVideoUrl.includes("mixkit.co")) {
        await ctx.db.patch(item._id, {
          makingVideoUrl: "/videos/reel-chef.mp4",
        });
        updatedCount++;
      }
    }
    return { success: true, updatedCount };
  },
});


