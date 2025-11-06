import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all categories and items for the user
router.get('/', (req, res) => {
  try {
    const userId = req.user.sub;
    const search = req.query.search?.toLowerCase() || '';

    // Get all categories for the user
    const categories = db.prepare('SELECT * FROM categories WHERE userId = ? ORDER BY name').all(userId);

    // Get all items for the user
    let itemsQuery = `
      SELECT i.*, c.name as categoryName 
      FROM items i 
      JOIN categories c ON i.categoryId = c.id 
      WHERE i.userId = ?
    `;
    const params = [userId];
    
    if (search) {
      itemsQuery += ' AND (LOWER(i.name) LIKE ? OR LOWER(c.name) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    itemsQuery += ' ORDER BY c.name, i.name';
    const items = db.prepare(itemsQuery).all(...params);

    // Group items by category
    const categoriesWithItems = categories.map(category => ({
      ...category,
      items: items.filter(item => item.categoryId === category.id),
      isExpanded: !search // Auto-expand if searching
    }));

    // Include uncategorized items if any exist without a category
    const allItems = items.filter(item => !categories.find(c => c.id === item.categoryId));
    if (allItems.length > 0) {
      categoriesWithItems.push({
        id: null,
        name: 'Uncategorized',
        userId,
        createdAt: Date.now(),
        items: allItems,
        isExpanded: true
      });
    }

    res.json({ categories: categoriesWithItems });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ message: 'Failed to fetch inventory' });
  }
});

// Create a new category
router.post('/categories', (req, res) => {
  try {
    const userId = req.user.sub;
    const { name } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const insertCategory = db.prepare('INSERT INTO categories (userId, name) VALUES (?, ?)');
    const result = insertCategory.run(userId, name.trim());
    
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    
    // Log activity
    logActivity(userId, 'created', 'category', category.id, category.name);
    
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Category already exists' });
    }
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

// Create a new item
router.post('/items', (req, res) => {
  try {
    const userId = req.user.sub;
    const { categoryId, name, quantity = 0, unit = 'lbs' } = req.body;

    if (!categoryId || !name || !name.trim()) {
      return res.status(400).json({ message: 'Category ID and item name are required' });
    }

    // Verify category belongs to user
    const category = db.prepare('SELECT * FROM categories WHERE id = ? AND userId = ?').get(categoryId, userId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const insertItem = db.prepare(
      'INSERT INTO items (userId, categoryId, name, quantity, unit) VALUES (?, ?, ?, ?, ?)'
    );
    const result = insertItem.run(userId, categoryId, name.trim(), quantity, unit);
    
    const item = db.prepare('SELECT i.*, c.name as categoryName FROM items i JOIN categories c ON i.categoryId = c.id WHERE i.id = ?').get(result.lastInsertRowid);
    
    // Log activity
    logActivity(userId, 'created', 'item', item.id, item.name, `Quantity: ${quantity}${unit}`);
    
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Item already exists in this category' });
    }
    console.error('Error creating item:', err);
    res.status(500).json({ message: 'Failed to create item' });
  }
});

// Update item quantity (Add)
router.put('/items/:id/add', (req, res) => {
  try {
    const userId = req.user.sub;
    const itemId = req.params.id;
    const { amount = 1 } = req.body || {};

    // Verify item belongs to user
    const item = db.prepare('SELECT * FROM items WHERE id = ? AND userId = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const newQuantity = (item.quantity || 0) + Number(amount);
    const updateItem = db.prepare(
      'UPDATE items SET quantity = ?, updatedAt = ? WHERE id = ?'
    );
    updateItem.run(newQuantity, Math.floor(Date.now() / 1000), itemId);

    const updatedItem = db.prepare('SELECT i.*, c.name as categoryName FROM items i JOIN categories c ON i.categoryId = c.id WHERE i.id = ?').get(itemId);
    
    // Log activity
    logActivity(userId, 'added', 'item', itemId, item.name, `Added ${amount}, new quantity: ${newQuantity}${item.unit}`);
    
    res.json(updatedItem);
  } catch (err) {
    console.error('Error updating item (add):', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Failed to update item', error: err.message });
  }
});

// Update item quantity (Take)
router.put('/items/:id/take', (req, res) => {
  try {
    const userId = req.user.sub;
    const itemId = req.params.id;
    const { amount = 1 } = req.body || {};

    // Verify item belongs to user
    const item = db.prepare('SELECT * FROM items WHERE id = ? AND userId = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const newQuantity = Math.max(0, (item.quantity || 0) - Number(amount));
    const updateItem = db.prepare(
      'UPDATE items SET quantity = ?, updatedAt = ? WHERE id = ?'
    );
    updateItem.run(newQuantity, Math.floor(Date.now() / 1000), itemId);

    const updatedItem = db.prepare('SELECT i.*, c.name as categoryName FROM items i JOIN categories c ON i.categoryId = c.id WHERE i.id = ?').get(itemId);
    
    // Log activity
    logActivity(userId, 'took', 'item', itemId, item.name, `Took ${amount}, new quantity: ${newQuantity}${item.unit}`);
    
    res.json(updatedItem);
  } catch (err) {
    console.error('Error updating item (take):', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Failed to update item', error: err.message });
  }
});

// Delete an item
router.delete('/items/:id', (req, res) => {
  try {
    const userId = req.user.sub;
    const itemId = req.params.id;

    // Verify item belongs to user
    const item = db.prepare('SELECT * FROM items WHERE id = ? AND userId = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Log activity before deletion
    logActivity(userId, 'deleted', 'item', itemId, item.name, `Quantity was: ${item.quantity}${item.unit}`);
    
    const deleteItem = db.prepare('DELETE FROM items WHERE id = ?');
    deleteItem.run(itemId);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

// Get activity logs
router.get('/activity-logs', (req, res) => {
  try {
    const userId = req.user.sub;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const fromDate = req.query.fromDate ? parseInt(req.query.fromDate) : null;
    const toDate = req.query.toDate ? parseInt(req.query.toDate) : null;
    
    let query = 'SELECT * FROM activity_logs WHERE userId = ?';
    const params = [userId];
    
    if (fromDate) {
      query += ' AND createdAt >= ?';
      params.push(fromDate);
    }
    
    if (toDate) {
      query += ' AND createdAt <= ?';
      params.push(toDate);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const logs = db.prepare(query).all(...params);
    
    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) as count FROM activity_logs WHERE userId = ?';
    const countParams = [userId];
    
    if (fromDate) {
      countQuery += ' AND createdAt >= ?';
      countParams.push(fromDate);
    }
    
    if (toDate) {
      countQuery += ' AND createdAt <= ?';
      countParams.push(toDate);
    }
    
    const totalCount = db.prepare(countQuery).get(...countParams);
    
    res.json({ logs, total: totalCount.count, limit, offset, fromDate, toDate });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

// Get item history (all activities for a specific item)
router.get('/items/:id/history', (req, res) => {
  try {
    const userId = req.user.sub;
    const itemId = req.params.id;
    const limit = parseInt(req.query.limit) || 3;
    const offset = parseInt(req.query.offset) || 0;
    
    // Verify item belongs to user
    const item = db.prepare('SELECT * FROM items WHERE id = ? AND userId = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Get paginated logs
    const logs = db.prepare(
      'SELECT * FROM activity_logs WHERE userId = ? AND entityType = ? AND entityId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?'
    ).all(userId, 'item', itemId, limit, offset);
    
    // Get total count
    const totalCount = db.prepare(
      'SELECT COUNT(*) as count FROM activity_logs WHERE userId = ? AND entityType = ? AND entityId = ?'
    ).get(userId, 'item', itemId);
    
    res.json({ logs, item, total: totalCount.count, limit, offset });
  } catch (err) {
    console.error('Error fetching item history:', err);
    res.status(500).json({ message: 'Failed to fetch item history' });
  }
});

// Update category name
router.put('/categories/:id', (req, res) => {
  try {
    const userId = req.user.sub;
    const categoryId = req.params.id;
    const { name } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Verify category belongs to user
    const category = db.prepare('SELECT * FROM categories WHERE id = ? AND userId = ?').get(categoryId, userId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const updateCategory = db.prepare('UPDATE categories SET name = ? WHERE id = ?');
    updateCategory.run(name.trim(), categoryId);
    
    const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    
    // Log activity
    logActivity(userId, 'updated', 'category', categoryId, updatedCategory.name, `Name changed from "${category.name}" to "${updatedCategory.name}"`);
    
    res.json(updatedCategory);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Category name already exists' });
    }
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

// Update item name
router.put('/items/:id', (req, res) => {
  try {
    const userId = req.user.sub;
    const itemId = req.params.id;
    const { name, unit } = req.body || {};

    // Verify item belongs to user
    const item = db.prepare('SELECT * FROM items WHERE id = ? AND userId = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const updates = [];
    const values = [];
    
    if (name && typeof name === 'string' && name.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    
    if (unit && typeof unit === 'string') {
      updates.push('unit = ?');
      values.push(unit);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    values.push(itemId);
    const updateQuery = `UPDATE items SET ${updates.join(', ')}, updatedAt = ? WHERE id = ?`;
    values.splice(-1, 0, Math.floor(Date.now() / 1000));
    
    db.prepare(updateQuery).run(...values);
    
    const updatedItem = db.prepare('SELECT i.*, c.name as categoryName FROM items i JOIN categories c ON i.categoryId = c.id WHERE i.id = ?').get(itemId);
    
    // Log activity
    const changes = [];
    if (name && name.trim() !== item.name) {
      changes.push(`name: "${item.name}" → "${name.trim()}"`);
    }
    if (unit && unit !== item.unit) {
      changes.push(`unit: "${item.unit}" → "${unit}"`);
    }
    if (changes.length > 0) {
      logActivity(userId, 'updated', 'item', itemId, updatedItem.name, changes.join(', '));
    }
    
    res.json(updatedItem);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Item name already exists in this category' });
    }
    console.error('Error updating item:', err);
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// Delete a category (and all its items)
router.delete('/categories/:id', (req, res) => {
  try {
    const userId = req.user.sub;
    const categoryId = req.params.id;

    // Verify category belongs to user
    const category = db.prepare('SELECT * FROM categories WHERE id = ? AND userId = ?').get(categoryId, userId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Log activity before deletion
    const itemCount = db.prepare('SELECT COUNT(*) as count FROM items WHERE categoryId = ?').get(categoryId);
    logActivity(userId, 'deleted', 'category', categoryId, category.name, `Deleted with ${itemCount.count} items`);
    
    // Delete all items in category first (CASCADE will handle this, but being explicit)
    db.prepare('DELETE FROM items WHERE categoryId = ?').run(categoryId);
    
    // Delete category
    db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

export default router;

