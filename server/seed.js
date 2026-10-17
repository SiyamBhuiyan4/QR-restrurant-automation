const { db } = require('./db');

const initialCategories = [
  { name: 'Starters', slug: 'starters', icon: '🥗', sort_order: 1 },
  { name: 'Mains', slug: 'mains', icon: '🍲', sort_order: 2 },
  { name: 'Burgers & Sandwiches', slug: 'burgers-sandwiches', icon: '🍔', sort_order: 3 },
  { name: 'Beverages', slug: 'beverages', icon: '🥤', sort_order: 4 },
  { name: 'Desserts', slug: 'desserts', icon: '🍰', sort_order: 5 }
];

const initialMenuItems = [
  // Starters
  {
    category_slug: 'starters',
    name: 'Truffle & Herb Loaded Fries',
    description: 'Crispy hand-cut russet potatoes tossed in aromatic white truffle oil, grated aged parmesan, and fresh chopped parsley, served with roasted garlic aioli.',
    price: 8.50,
    image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  },
  {
    category_slug: 'starters',
    name: 'Buffalo Cauliflower Bites',
    description: 'Crispy beer-battered cauliflower florets tossed in tangy cayenne pepper glaze, served with house-made creamy blue cheese dip and crisp celery.',
    price: 9.99,
    image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 1
  },
  {
    category_slug: 'starters',
    name: 'Salt & Pepper Calamari',
    description: 'Tender wild-caught calamari flash-fried with cracked peppercorn, fresh cilantro, sliced red chili, and a side of citrus sweet chili sauce.',
    price: 13.50,
    image_url: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=800&q=80',
    is_veg: 0,
    is_spicy: 1
  },
  {
    category_slug: 'starters',
    name: 'Roasted Red Pepper Bruschetta',
    description: 'Grilled sourdough crostini rubbed with garlic and topped with fire-roasted sweet peppers, heirloom cherry tomatoes, fresh basil, and aged balsamic glaze.',
    price: 8.99,
    image_url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  },

  // Mains
  {
    category_slug: 'mains',
    name: 'Pan-Seared Atlantic Salmon',
    description: 'Crispy skin Atlantic salmon over a bed of creamy wild mushroom risotto, tender charred broccolini, and lemon-dill beurre blanc.',
    price: 23.50,
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
    is_veg: 0,
    is_spicy: 0
  },
  {
    category_slug: 'mains',
    name: 'Slow-Braised Beef Short Rib',
    description: 'Slow-braised bone-in beef short rib in a Cabernet wine reduction, accompanied by silky garlic-chive mashed potatoes and roasted heirloom baby carrots.',
    price: 24.99,
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    is_veg: 0,
    is_spicy: 0
  },
  {
    category_slug: 'mains',
    name: 'Spicy Basil Garlic Noodles',
    description: 'Wok-seared flat rice noodles tossed with Thai holy basil, bird’s eye chili, shiitake mushrooms, bell peppers, and scallions in savory dark soy reduction.',
    price: 16.99,
    image_url: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 1
  },
  {
    category_slug: 'mains',
    name: 'Tuscan Sundried Tomato Chicken',
    description: 'Seared chicken cutlets simmered in a rich garlic cream sauce with sundried tomatoes, baby spinach, and parmesan, served over artisan penne pasta.',
    price: 19.50,
    image_url: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=800&q=80',
    is_veg: 0,
    is_spicy: 0
  },
  {
    category_slug: 'mains',
    name: 'Truffle Mushroom Tagliatelle',
    description: 'Handcrafted fresh tagliatelle ribbons with sautéed cremini and porcini mushrooms, finished with black truffle butter and 24-month Parmigiano Reggiano.',
    price: 18.50,
    image_url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  },

  // Burgers & Sandwiches
  {
    category_slug: 'burgers-sandwiches',
    name: 'The Double Smash Bacon Cheeseburger',
    description: 'Two 100% Angus beef smashed patties, double melted cheddar, thick applewood smoked bacon, caramelized onions, and secret burger sauce on toasted brioche.',
    price: 15.99,
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    is_veg: 0,
    is_spicy: 0
  },
  {
    category_slug: 'burgers-sandwiches',
    name: 'Nashville Hot Chicken Sandwich',
    description: 'Double-dredged crispy fried chicken breast dredged in Nashville hot chili oil, dill pickle chips, and creamy jalapeño slaw on a soft potato bun.',
    price: 14.50,
    image_url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80',
    is_veg: 0,
    is_spicy: 1
  },
  {
    category_slug: 'burgers-sandwiches',
    name: 'Smokey BBQ Pulled Pork Brioche',
    description: 'Hickory-smoked pulled pork tossed in tangy Carolina barbecue sauce, piled high with crisp apple cider slaw and pickled jalapeños on a buttered bun.',
    price: 13.99,
    image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
    is_veg: 0,
    is_spicy: 0
  },
  {
    category_slug: 'burgers-sandwiches',
    name: 'Grilled Halloumi & Avocado Burger',
    description: 'Thick slabs of golden grilled Cypriot halloumi cheese, smashed Hass avocado, roasted red peppers, baby arugula, and chipotle lime drizzle on artisan sourdough.',
    price: 14.99,
    image_url: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  },

  // Beverages
  {
    category_slug: 'beverages',
    name: 'Passionfruit Mint Sparkler',
    description: 'Real passionfruit pulp, muddled fresh Moroccan mint, freshly squeezed lime, pure cane syrup, and effervescent sparkling water over ice.',
    price: 5.50,
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  },
  {
    category_slug: 'beverages',
    name: 'Iced Salted Caramel Cold Brew',
    description: '18-hour slow-steeped Colombian cold brew coffee infused with pure vanilla syrup and topped with velvety salted caramel sweet cream cold foam.',
    price: 5.95,
    image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  },
  {
    category_slug: 'beverages',
    name: 'Hibiscus Blood Orange Cooler',
    description: 'Tart brewed organic hibiscus tea infused with fresh Sicilian blood orange juice, agave nectar, and crushed ice, garnished with a fresh rosemary sprig.',
    price: 4.95,
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  },
  {
    category_slug: 'beverages',
    name: 'Fiery Ginger Beer & Lime',
    description: 'House-crafted cold-pressed fiery Jamaican ginger brew, Key lime juice, dash of cayenne, and sparkling water garnished with crystallized ginger.',
    price: 4.50,
    image_url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 1
  },

  // Desserts
  {
    category_slug: 'desserts',
    name: 'Molten Dark Chocolate Lava Cake',
    description: 'Rich 70% Valrhona dark chocolate cake with a warm flowing center, paired with a scoop of bourbon vanilla bean gelato and raspberry coulis.',
    price: 9.50,
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  },
  {
    category_slug: 'desserts',
    name: 'New York Strawberry Cheesecake',
    description: 'Classic velvety dense cheesecake baked over a cinnamon graham cracker crust, topped with macerated wild summer strawberries.',
    price: 8.50,
    image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  },
  {
    category_slug: 'desserts',
    name: 'Coconut Mango Sticky Rice',
    description: 'Sweet glutinous sticky rice steamed in rich pandan-infused coconut milk, served with sweet sliced champagne mango and toasted sesame seeds.',
    price: 7.99,
    image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
    is_veg: 1,
    is_spicy: 0
  }
];

function seedDatabase({ force = false } = {}) {
  try {
    const existingCount = db.prepare('SELECT count(*) as count FROM categories').get().count;

    if (existingCount > 0 && !force) {
      console.log(`[Seed] Database already has ${existingCount} categories. Skipping seed (use --force to reseed).`);
      return { skipped: true, categoryCount: existingCount };
    }

    if (force) {
      console.log('[Seed] Force flag detected. Clearing existing data...');
      db.exec(`
        DELETE FROM order_items;
        DELETE FROM orders;
        DELETE FROM waiter_calls;
        DELETE FROM menu_items;
        DELETE FROM categories;
      `);
    }

    console.log('[Seed] Seeding categories and menu items...');

    db.exec('BEGIN TRANSACTION;');

    const insertCatStmt = db.prepare(`
      INSERT INTO categories (name, slug, icon, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    const categoryIdMap = {};
    for (const cat of initialCategories) {
      const res = insertCatStmt.run(cat.name, cat.slug, cat.icon, cat.sort_order);
      categoryIdMap[cat.slug] = Number(res.lastInsertRowid);
    }

    const insertItemStmt = db.prepare(`
      INSERT INTO menu_items (category_id, name, description, price, image_url, is_veg, is_spicy, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    for (const item of initialMenuItems) {
      const categoryId = categoryIdMap[item.category_slug];
      insertItemStmt.run(
        categoryId,
        item.name,
        item.description,
        item.price,
        item.image_url,
        item.is_veg,
        item.is_spicy
      );
    }

    db.exec('COMMIT;');

    const totalCategories = db.prepare('SELECT count(*) as count FROM categories').get().count;
    const totalItems = db.prepare('SELECT count(*) as count FROM menu_items').get().count;

    console.log(`[Seed] Successfully seeded ${totalCategories} categories and ${totalItems} menu items!`);
    return { success: true, categories: totalCategories, menuItems: totalItems };
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch (_) {}
    console.error('[Seed] Error seeding database:', error);
    throw error;
  }
}

// If executed directly from command line
if (require.main === module) {
  const isForce = process.argv.includes('--force') || process.argv.includes('-f');
  try {
    const result = seedDatabase({ force: isForce });
    console.log('[Seed] Result:', result);
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Failed:', err);
    process.exit(1);
  }
}

module.exports = {
  seedDatabase,
  initialCategories,
  initialMenuItems
};
