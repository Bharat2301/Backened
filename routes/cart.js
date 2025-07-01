const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware'); // Updated import
const CartItem = require('../models/CartItem');
const MenuItem = require('../models/MenuItem');

// Get cart items for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('Cart GET - User:', req.user);
    const items = await CartItem.find({ userId: req.user.userId }).populate('menuItemId');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: `Failed to fetch cart items: ${error.message}` });
  }
});

// Add item to cart
router.post(
  '/',
  authMiddleware,
  [
    body('menuItemId').notEmpty().withMessage('Menu item ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { menuItemId, quantity } = req.body;
    try {
      console.log('Adding to cart:', { menuItemId, quantity, userId: req.user.userId }); // Added logging
      const menuItem = await MenuItem.findOne({ id: menuItemId }); // Use custom id
      if (!menuItem) {
        console.log('Menu item not found for id:', menuItemId); // Added logging
        return res.status(404).json({ message: 'Menu item not found' });
      }
      const existingItem = await CartItem.findOne({ userId: req.user.userId, menuItemId: menuItem._id });
      if (existingItem) {
        existingItem.quantity += quantity;
        const updatedItem = await existingItem.save();
        const populatedItem = await CartItem.findById(updatedItem._id).populate('menuItemId');
        res.json(populatedItem);
      } else {
        const cartItem = new CartItem({ userId: req.user.userId, menuItemId: menuItem._id, quantity });
        const newItem = await cartItem.save();
        const populatedItem = await CartItem.findById(newItem._id).populate('menuItemId');
        res.status(201).json(populatedItem);
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      res.status(400).json({ message: `Failed to add item to cart: ${error.message}` });
    }
  }
);

// Update item quantity
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').notEmpty().withMessage('Menu item ID is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { quantity } = req.body;
    const menuItemId = req.params.id;
    try {
      const menuItem = await MenuItem.findOne({ id: menuItemId }); // Use custom id
      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
      const item = await CartItem.findOne({ userId: req.user.userId, menuItemId: menuItem._id }).populate('menuItemId');
      if (!item) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }
      if (quantity < 1) {
        await CartItem.deleteOne({ _id: item._id });
        res.json({ message: 'Item removed from cart' });
      } else {
        item.quantity = quantity;
        const updatedItem = await item.save();
        const populatedItem = await CartItem.findById(updatedItem._id).populate('menuItemId');
        res.json(populatedItem);
      }
    } catch (error) {
      res.status(400).json({ message: `Failed to update cart item: ${error.message}` });
    }
  }
);

// Remove item from cart
router.delete(
  '/:id',
  authMiddleware,
  [param('id').notEmpty().withMessage('Menu item ID is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const menuItemId = req.params.id;
    try {
      const menuItem = await MenuItem.findOne({ id: menuItemId }); // Use custom id
      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
      const item = await CartItem.findOneAndDelete({ userId: req.user.userId, menuItemId: menuItem._id });
      if (!item) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }
      res.json({ message: 'Item removed from cart' });
    } catch (error) {
      res.status(500).json({ message: `Failed to remove cart item: ${error.message}` });
    }
  }
);

// Clear cart
router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    await CartItem.deleteMany({ userId: req.user.userId });
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: `Failed to clear cart: ${error.message}` });
  }
});

module.exports = router;