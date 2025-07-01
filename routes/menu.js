const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const MenuItem = require('../models/MenuItem');
const authMiddleware = require('../middleware/authMiddleware'); // Updated import
const { adminMiddleware } = require('./auth');

// Debug log to verify middleware imports
console.log('Imported middlewares in menu.js:', { authMiddleware, adminMiddleware });

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: `Failed to fetch menu items: ${error.message}` });
  }
});

// Add menu item (admin only)
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('id')
      .notEmpty()
      .withMessage('ID is required')
      .custom(async (value) => {
        const existingItem = await MenuItem.findOne({ id: value });
        if (existingItem) {
          throw new Error('Menu item ID already exists');
        }
        return true;
      }),
    body('title').notEmpty().withMessage('Title is required'),
    body('paragraph').notEmpty().withMessage('Description is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be non-negative'),
    body('rating').isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
    body('image').isURL().withMessage('Invalid image URL'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const menuItem = new MenuItem(req.body);
      const savedItem = await menuItem.save();
      res.status(201).json(savedItem);
    } catch (error) {
      res.status(400).json({ message: `Failed to create menu item: ${error.message}` });
    }
  }
);

module.exports = router;