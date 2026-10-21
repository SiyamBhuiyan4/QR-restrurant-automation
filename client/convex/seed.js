import { internalMutation } from "./_generated/server";

// Express seed menu (server/seed.js) ported to Convex.
// Inserts only when BOTH categories and menuItems are empty, so it never
// duplicates data. Run manually: npx convex run seed:seedExpressMenu
// (requires a deployed version containing this file). Not called by the client.
const EXPRESS_CATEGORIES = [
  {
    "name": "Starters",
    "slug": "starters",
    "icon": "🥗",
    "sortOrder": 1
  },
  {
    "name": "Mains",
    "slug": "mains",
    "icon": "🍲",
    "sortOrder": 2
  },
  {
    "name": "Burgers & Sandwiches",
    "slug": "burgers-sandwiches",
    "icon": "🍔",
    "sortOrder": 3
  },
  {
    "name": "Beverages",
    "slug": "beverages",
    "icon": "🥤",
    "sortOrder": 4
  },
  {
    "name": "Desserts",
    "slug": "desserts",
    "icon": "🍰",
    "sortOrder": 5
  }
];

const EXPRESS_MENU_ITEMS = [
  {
    "categorySlug": "starters",
    "name": "Truffle & Herb Loaded Fries",
    "description": "Crispy hand-cut russet potatoes tossed in aromatic white truffle oil, grated aged parmesan, and fresh chopped parsley, served with roasted garlic aioli.",
    "price": 8.5,
    "imageUrl": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "starters",
    "name": "Buffalo Cauliflower Bites",
    "description": "Crispy beer-battered cauliflower florets tossed in tangy cayenne pepper glaze, served with house-made creamy blue cheese dip and crisp celery.",
    "price": 9.99,
    "imageUrl": "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true
  },
  {
    "categorySlug": "starters",
    "name": "Salt & Pepper Calamari",
    "description": "Tender wild-caught calamari flash-fried with cracked peppercorn, fresh cilantro, sliced red chili, and a side of citrus sweet chili sauce.",
    "price": 13.5,
    "imageUrl": "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=800&q=80",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true
  },
  {
    "categorySlug": "starters",
    "name": "Roasted Red Pepper Bruschetta",
    "description": "Grilled sourdough crostini rubbed with garlic and topped with fire-roasted sweet peppers, heirloom cherry tomatoes, fresh basil, and aged balsamic glaze.",
    "price": 8.99,
    "imageUrl": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "mains",
    "name": "Pan-Seared Atlantic Salmon",
    "description": "Crispy skin Atlantic salmon over a bed of creamy wild mushroom risotto, tender charred broccolini, and lemon-dill beurre blanc.",
    "price": 23.5,
    "imageUrl": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "mains",
    "name": "Slow-Braised Beef Short Rib",
    "description": "Slow-braised bone-in beef short rib in a Cabernet wine reduction, accompanied by silky garlic-chive mashed potatoes and roasted heirloom baby carrots.",
    "price": 24.99,
    "imageUrl": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "mains",
    "name": "Spicy Basil Garlic Noodles",
    "description": "Wok-seared flat rice noodles tossed with Thai holy basil, bird’s eye chili, shiitake mushrooms, bell peppers, and scallions in savory dark soy reduction.",
    "price": 16.99,
    "imageUrl": "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true
  },
  {
    "categorySlug": "mains",
    "name": "Tuscan Sundried Tomato Chicken",
    "description": "Seared chicken cutlets simmered in a rich garlic cream sauce with sundried tomatoes, baby spinach, and parmesan, served over artisan penne pasta.",
    "price": 19.5,
    "imageUrl": "https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=800&q=80",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "mains",
    "name": "Truffle Mushroom Tagliatelle",
    "description": "Handcrafted fresh tagliatelle ribbons with sautéed cremini and porcini mushrooms, finished with black truffle butter and 24-month Parmigiano Reggiano.",
    "price": 18.5,
    "imageUrl": "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "burgers-sandwiches",
    "name": "The Double Smash Bacon Cheeseburger",
    "description": "Two 100% Angus beef smashed patties, double melted cheddar, thick applewood smoked bacon, caramelized onions, and secret burger sauce on toasted brioche.",
    "price": 15.99,
    "imageUrl": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "burgers-sandwiches",
    "name": "Nashville Hot Chicken Sandwich",
    "description": "Double-dredged crispy fried chicken breast dredged in Nashville hot chili oil, dill pickle chips, and creamy jalapeño slaw on a soft potato bun.",
    "price": 14.5,
    "imageUrl": "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true
  },
  {
    "categorySlug": "burgers-sandwiches",
    "name": "Smokey BBQ Pulled Pork Brioche",
    "description": "Hickory-smoked pulled pork tossed in tangy Carolina barbecue sauce, piled high with crisp apple cider slaw and pickled jalapeños on a buttered bun.",
    "price": 13.99,
    "imageUrl": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "burgers-sandwiches",
    "name": "Grilled Halloumi & Avocado Burger",
    "description": "Thick slabs of golden grilled Cypriot halloumi cheese, smashed Hass avocado, roasted red peppers, baby arugula, and chipotle lime drizzle on artisan sourdough.",
    "price": 14.99,
    "imageUrl": "https://images.unsplash.com/photo-1585238342024-78d387f4a707?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "beverages",
    "name": "Passionfruit Mint Sparkler",
    "description": "Real passionfruit pulp, muddled fresh Moroccan mint, freshly squeezed lime, pure cane syrup, and effervescent sparkling water over ice.",
    "price": 5.5,
    "imageUrl": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "beverages",
    "name": "Iced Salted Caramel Cold Brew",
    "description": "18-hour slow-steeped Colombian cold brew coffee infused with pure vanilla syrup and topped with velvety salted caramel sweet cream cold foam.",
    "price": 5.95,
    "imageUrl": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "beverages",
    "name": "Hibiscus Blood Orange Cooler",
    "description": "Tart brewed organic hibiscus tea infused with fresh Sicilian blood orange juice, agave nectar, and crushed ice, garnished with a fresh rosemary sprig.",
    "price": 4.95,
    "imageUrl": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "beverages",
    "name": "Fiery Ginger Beer & Lime",
    "description": "House-crafted cold-pressed fiery Jamaican ginger brew, Key lime juice, dash of cayenne, and sparkling water garnished with crystallized ginger.",
    "price": 4.5,
    "imageUrl": "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true
  },
  {
    "categorySlug": "desserts",
    "name": "Molten Dark Chocolate Lava Cake",
    "description": "Rich 70% Valrhona dark chocolate cake with a warm flowing center, paired with a scoop of bourbon vanilla bean gelato and raspberry coulis.",
    "price": 9.5,
    "imageUrl": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "desserts",
    "name": "New York Strawberry Cheesecake",
    "description": "Classic velvety dense cheesecake baked over a cinnamon graham cracker crust, topped with macerated wild summer strawberries.",
    "price": 8.5,
    "imageUrl": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  },
  {
    "categorySlug": "desserts",
    "name": "Coconut Mango Sticky Rice",
    "description": "Sweet glutinous sticky rice steamed in rich pandan-infused coconut milk, served with sweet sliced champagne mango and toasted sesame seeds.",
    "price": 7.99,
    "imageUrl": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true
  }
];

export const seedExpressMenu = internalMutation({
  args: {},
  handler: async (ctx) => {
    const anyCategory = await ctx.db.query("categories").first();
    const anyItem = await ctx.db.query("menuItems").first();
    if (anyCategory || anyItem) {
      return { seeded: false, message: "Menu already has data; nothing inserted" };
    }

    const categoryIds = {};
    for (const cat of EXPRESS_CATEGORIES) {
      categoryIds[cat.slug] = await ctx.db.insert("categories", cat);
    }

    for (const item of EXPRESS_MENU_ITEMS) {
      await ctx.db.insert("menuItems", {
        ...item,
        categoryId: categoryIds[item.categorySlug],
      });
    }

    return { seeded: true, categories: EXPRESS_CATEGORIES.length, menuItems: EXPRESS_MENU_ITEMS.length };
  },
});
