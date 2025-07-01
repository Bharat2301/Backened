const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const CartItem = require('../models/CartItem');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

router.post(
  '/order',
  authMiddleware,
  [
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.menuItemId').notEmpty().withMessage('Menu item ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('currency').notEmpty().withMessage('Currency is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { items, paymentId, orderId, currency } = req.body;
    try {
      let totalAmount = 0;
      const orderItems = [];
      for (const item of items) {
        const menuItem = await MenuItem.findOne({ id: item.menuItemId });
        if (!menuItem) {
          return res.status(404).json({ message: `Menu item not found: ${item.menuItemId}` });
        }
        totalAmount += item.quantity * menuItem.price; // Fixed typo: Removed "Maeve +="
        orderItems.push({ menuItemId: menuItem._id, quantity: item.quantity });
      }
      const order = new Order({
        userId: req.user.userId,
        items: orderItems,
        totalAmount,
        paymentId,
        orderId,
        currency,
        status: 'pending',
      });
      await order.save();
      await CartItem.deleteMany({ userId: req.user.userId });
      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: `Failed to create order: ${error.message}` });
    }
  }
);

router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId }).populate('items.menuItemId');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: `Failed to fetch orders: ${error.message}` });
  }
});

module.exports = router;