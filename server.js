const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const menuRoutes = require('./routes/menu');
const cartRoutes = require('./routes/cart');
const { router: authRoutes } = require('./routes/auth');
const authMiddleware = require('./middleware/authMiddleware');
const Order = require('./models/Order');
const MenuItem = require('./models/MenuItem');

dotenv.config();

// Validate environment variables
const requiredEnv = ['MONGODB_URI', 'PORT', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
requiredEnv.forEach(key => {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
});

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.metadata(),
    winston.format.printf(({ timestamp, level, message, metadata }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

const app = express();
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, { ip: req.ip });
  next();
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  })
  .then(() => logger.info('Connected to MongoDB'))
  .catch(error => {
    logger.error('MongoDB connection error:', { error: error.message });
    process.exit(1);
  });

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Rate limiter for Razorpay key endpoint
const razorpayKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests for Razorpay key, please try again later.',
});

// Get user orders
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId }).populate('items.menuItemId');
    res.json(
      orders.map(order => ({
        id: order._id,
        items: order.items.map(item => ({
          menuItem: {
            id: item.menuItemId.id,
            title: item.menuItemId.title,
            paragraph: item.menuItemId.paragraph,
            price: item.menuItemId.price,
            rating: item.menuItemId.rating,
            image: item.menuItemId.image,
          },
          quantity: item.quantity,
        })),
        totalAmount: order.totalAmount,
        paymentId: order.paymentId,
        orderId: order.orderId,
        currency: order.currency,
        status: order.status,
        createdAt: order.createdAt,
      }))
    );
  } catch (error) {
    logger.error('Failed to fetch orders:', { error: error.message, userId: req.user.userId });
    res.status(500).json({ message: `Failed to fetch orders: ${error.message}` });
  }
});

// Create order endpoint
app.post(
  '/api/create-order',
  authMiddleware,
  [
    body('amount').isInt({ min: 100 }).withMessage('Amount must be at least 100 paise'),
    body('currency').isIn(['INR']).withMessage('Currency must be INR'),
    body('receipt').notEmpty().withMessage('Receipt is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { amount, currency, receipt } = req.body;
    try {
      const order = await razorpay.orders.create({ amount, currency, receipt });
      logger.info('Order created', { orderId: order.id, userId: req.user.userId });
      res.json(order);
    } catch (error) {
      logger.error('Failed to create order:', { error: error.message, userId: req.user.userId });
      res.status(500).json({ error: `Failed to create order: ${error.message}` });
    }
  }
);

// Save order after payment
app.post(
  '/api/save-order',
  authMiddleware,
  [
    body('items').isArray({ min: 1 }).withMessage('Items array cannot be empty'),
    body('items.*.menuItemId').notEmpty().withMessage('Menu item ID is required'), // Removed isMongoId
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Invalid total amount'),
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('currency').isIn(['INR']).withMessage('Currency must be INR'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { items, totalAmount, paymentId, orderId, currency } = req.body;
    try {
      // Convert custom menuItemId to MongoDB _id
      const itemIds = items.map(item => item.menuItemId);
      const menuItems = await MenuItem.find({ id: { $in: itemIds } });
      if (menuItems.length !== items.length) {
        logger.warn('One or more menu items not found', { userId: req.user.userId, itemIds });
        return res.status(400).json({ error: 'One or more menu items not found' });
      }
      const convertedItems = items.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        return { menuItemId: menuItem._id, quantity: item.quantity };
      });
      const calculatedTotal = convertedItems.reduce((sum, item) => {
        const menuItem = menuItems.find(mi => mi._id.toString() === item.menuItemId.toString());
        return sum + menuItem.price * item.quantity;
      }, 0);
      if (calculatedTotal !== totalAmount) {
        logger.warn('Invalid total amount', { expected: calculatedTotal, got: totalAmount, userId: req.user.userId });
        return res.status(400).json({ error: 'Invalid total amount' });
      }
      const order = new Order({
        userId: req.user.userId,
        items: convertedItems,
        totalAmount,
        paymentId,
        orderId,
        currency,
        status: 'completed',
      });
      const savedOrder = await order.save();
      logger.info('Order saved', { orderId: savedOrder._id, userId: req.user.userId });
      await CartItem.deleteMany({ userId: req.user.userId });
      res.status(201).json(savedOrder);
    } catch (error) {
      logger.error('Failed to save order:', { error: error.message, userId: req.user.userId });
      res.status(500).json({ error: `Failed to save order: ${error.message}` });
    }
  }
);

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  res.status(500).json({ message: 'Something went wrong!' });
});

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/cart', authMiddleware, cartRoutes);
app.use('/api/auth', authRoutes);

// Provide Razorpay key
app.get('/api/razorpay-key', razorpayKeyLimiter, (req, res) => {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});