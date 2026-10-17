const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Multer storage for food photos and short kitchen reel videos
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isVideo = file.mimetype.startsWith('video/');
    const targetDir = isVideo 
      ? path.join(__dirname, '..', 'uploads', 'videos')
      : path.join(__dirname, '..', 'uploads', 'photos');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max for high-res food photos or kitchen reels
});

/**
 * POST /api/menu/upload
 * Upload dish pictures or kitchen making-videos to local storage
 */
router.post('/upload', mediaUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }
    const isVideo = req.file.mimetype.startsWith('video/');
    const relativeUrl = `/uploads/${isVideo ? 'videos' : 'photos'}/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      url: relativeUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (err) {
    console.error('Error uploading media:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Helper to emit Socket.IO events safely if Socket.IO is initialized on app
 */
function emitSocket(req, event, data) {
  try {
    const io = req.io || (req.app && typeof req.app.get === 'function' ? req.app.get('io') : null);
    if (io && typeof io.emit === 'function') {
      io.emit(event, data);
    }
  } catch (err) {
    console.warn(`[Socket.IO emit warning (${event})]:`, err.message);
  }
}

/**
 * GET /api/menu
 * Returns all categories with their associated menu_items.
 * Optional query params:
 *   ?format=flat -> returns { categories: [...], items: [...] }
 *   ?availableOnly=true -> filters out items where is_available == 0
 */
router.get('/', (req, res) => {
  try {
    const categories = db.getCategories();
    const allItems = db.getMenuItems();
    const availableOnly = req.query.availableOnly === 'true' || req.query.available === 'true';

    const filteredItems = availableOnly 
      ? allItems.filter(item => Boolean(item.is_available)) 
      : allItems;

    if (req.query.format === 'flat') {
      return res.status(200).json({
        success: true,
        data: {
          categories,
          items: filteredItems
        }
      });
    }

    // Default: Group items inside each category
    const itemsByCat = {};
    for (const item of filteredItems) {
      const catId = item.category_id || 0;
      if (!itemsByCat[catId]) {
        itemsByCat[catId] = [];
      }
      itemsByCat[catId].push(item);
    }

    const grouped = categories.map(category => ({
      ...category,
      items: itemsByCat[category.id] || []
    }));

    // If there are unassigned items (category_id is null or 0), append an "Other" section
    if (itemsByCat[0] && itemsByCat[0].length > 0) {
      grouped.push({
        id: 0,
        name: 'Other',
        slug: 'other',
        icon: '🍽️',
        sort_order: 999,
        items: itemsByCat[0]
      });
    }

    return res.status(200).json({
      success: true,
      data: grouped
    });
  } catch (err) {
    console.error('Error fetching menu:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve menu items: ' + err.message
    });
  }
});

/**
 * GET /api/menu/categories
 * Returns category list only
 */
router.get('/categories', (req, res) => {
  try {
    const categories = db.getCategories();
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories: ' + err.message
    });
  }
});

/**
 * GET /api/menu/items
 * Returns flat list of items, optionally filtered by ?categoryId=
 */
router.get('/items', (req, res) => {
  try {
    const categoryId = req.query.categoryId || req.query.category_id;
    const items = db.getMenuItems(categoryId);
    return res.status(200).json({
      success: true,
      data: items
    });
  } catch (err) {
    console.error('Error fetching items:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve items: ' + err.message
    });
  }
});

/**
 * GET /api/menu/:id
 * Retrieve a single menu item by ID
 */
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID'
      });
    }

    const item = db.getMenuItemById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    console.error('Error fetching menu item:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve menu item: ' + err.message
    });
  }
});

/**
 * POST /api/menu
 * Create a new menu item
 */
router.post('/', (req, res) => {
  try {
    const {
      name,
      price,
      description,
      image_url,
      imageUrl,
      category_id,
      categoryId,
      is_veg,
      isVeg,
      is_spicy,
      isSpicy,
      is_available,
      isAvailable
    } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Menu item name is required'
      });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid non-negative price is required'
      });
    }

    let resolvedCategoryId = null;
    const rawCatId = category_id !== undefined ? category_id : categoryId;
    if (rawCatId !== undefined && rawCatId !== null && rawCatId !== '' && !isNaN(Number(rawCatId))) {
      const catIdNum = Number(rawCatId);
      const categories = db.getCategories();
      const exists = categories.some(c => c.id === catIdNum);
      if (exists) {
        resolvedCategoryId = catIdNum;
      } else {
        return res.status(400).json({
          success: false,
          error: `Category with ID ${catIdNum} does not exist`
        });
      }
    }

    const resolvedImageUrl = image_url !== undefined ? image_url : imageUrl;
    const resolvedIsVeg = is_veg !== undefined ? is_veg : isVeg;
    const resolvedIsSpicy = is_spicy !== undefined ? is_spicy : isSpicy;
    const resolvedIsAvailable = is_available !== undefined ? is_available : isAvailable;

    const newItem = db.createMenuItem({
      category_id: resolvedCategoryId,
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      price: Number(price),
      image_url: resolvedImageUrl ? String(resolvedImageUrl).trim() : '',
      is_veg: resolvedIsVeg ? 1 : 0,
      is_spicy: resolvedIsSpicy ? 1 : 0,
      is_available: resolvedIsAvailable !== undefined ? (resolvedIsAvailable ? 1 : 0) : 1
    });

    emitSocket(req, 'menu:item_created', newItem);

    return res.status(201).json({
      success: true,
      data: newItem
    });
  } catch (err) {
    console.error('Error creating menu item:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create menu item: ' + err.message
    });
  }
});

/**
 * PUT /api/menu/:id
 * Update an existing menu item
 */
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID'
      });
    }

    const existing = db.getMenuItemById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const {
      name,
      price,
      description,
      image_url,
      imageUrl,
      category_id,
      categoryId,
      is_veg,
      isVeg,
      is_spicy,
      isSpicy,
      is_available,
      isAvailable
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (price !== undefined) {
      if (isNaN(Number(price)) || Number(price) < 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be a non-negative number'
        });
      }
      updates.price = Number(price);
    }

    if (image_url !== undefined) updates.image_url = String(image_url).trim();
    else if (imageUrl !== undefined) updates.image_url = String(imageUrl).trim();

    if (category_id !== undefined || categoryId !== undefined) {
      const rawCatId = category_id !== undefined ? category_id : categoryId;
      if (rawCatId === null || rawCatId === '') {
        updates.category_id = null;
      } else if (!isNaN(Number(rawCatId))) {
        const catIdNum = Number(rawCatId);
        const categories = db.getCategories();
        if (!categories.some(c => c.id === catIdNum)) {
          return res.status(400).json({
            success: false,
            error: `Category with ID ${catIdNum} does not exist`
          });
        }
        updates.category_id = catIdNum;
      }
    }

    if (is_veg !== undefined) updates.is_veg = Boolean(is_veg);
    else if (isVeg !== undefined) updates.is_veg = Boolean(isVeg);

    if (is_spicy !== undefined) updates.is_spicy = Boolean(is_spicy);
    else if (isSpicy !== undefined) updates.is_spicy = Boolean(isSpicy);

    if (is_available !== undefined) updates.is_available = Boolean(is_available);
    else if (isAvailable !== undefined) updates.is_available = Boolean(isAvailable);

    const updatedItem = db.updateMenuItem(id, updates);

    emitSocket(req, 'menu:item_updated', updatedItem);

    return res.status(200).json({
      success: true,
      data: updatedItem
    });
  } catch (err) {
    console.error('Error updating menu item:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update menu item: ' + err.message
    });
  }
});

/**
 * PATCH /api/menu/:id/toggle
 * Toggle availability (in stock / out of stock)
 */
router.patch('/:id/toggle', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID'
      });
    }

    const existing = db.getMenuItemById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const isAvailableParam = req.body && req.body.is_available !== undefined 
      ? req.body.is_available 
      : (req.body && req.body.isAvailable !== undefined ? req.body.isAvailable : undefined);

    const updatedItem = db.toggleItemAvailability(id, isAvailableParam);

    emitSocket(req, 'menu:item_toggle', updatedItem);
    emitSocket(req, 'menu:item_updated', updatedItem);

    return res.status(200).json({
      success: true,
      data: updatedItem
    });
  } catch (err) {
    console.error('Error toggling menu item availability:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle availability: ' + err.message
    });
  }
});

/**
 * DELETE /api/menu/:id
 * Delete a menu item
 */
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID'
      });
    }

    const existing = db.getMenuItemById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const result = db.deleteMenuItem(id);

    emitSocket(req, 'menu:item_deleted', { id });

    return res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully',
      data: result
    });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete menu item: ' + err.message
    });
  }
});

module.exports = router;
