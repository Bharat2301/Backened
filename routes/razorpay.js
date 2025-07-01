require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const crypto = require('crypto');

// Debugging environment variables
console.log('[Debug] Current environment variables:', {
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? '***exists***' : 'MISSING',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ? '***exists***' : 'MISSING',
  NODE_ENV: process.env.NODE_ENV || 'development',
});

// Validate environment variables
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  const errorMsg = 'Razorpay configuration is incomplete. Please check .env file';
  console.error('[Critical]', errorMsg);
  throw new Error(errorMsg);
}

// Initialize Razorpay with enhanced configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log('[Info] Razorpay client initialized with key:', process.env.RAZORPAY_KEY_ID);

// Get Razorpay key ID (publicly accessible)
router.get('/razorpay-key', (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID) {
      throw new Error('Razorpay key ID not configured');
    }
    res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('[Error] Failed to fetch Razorpay key:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Razorpay key',
      error: error.message,
    });
  }
});

// Create a Razorpay order
router.post(
  '/create-order',
  authMiddleware,
  [
    body('amount').isInt({ min: 1 }).withMessage('Amount must be at least 1 INR'),
    body('currency').isIn(['INR']).withMessage('Only INR currency supported'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { amount, currency, receipt_note } = req.body;
    try {
      const options = {
        amount: amount * 100, // Convert to paise
        currency: currency || 'INR',
        receipt: receipt_note || `order_${Date.now()}`,
        payment_capture: 1,
      };
      console.log('[Debug] Creating order with options:', options);
      const order = await razorpay.orders.create(options);
      console.log('[Success] Order created:', order.id);
      res.json({
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status,
        },
      });
    } catch (error) {
      console.error('[Error] Order creation failed:', {
        error: error.error?.description || error.message,
        statusCode: error.statusCode,
        request: error.error?.metadata?.order_request,
      });
      res.status(error.statusCode || 500).json({
        success: false,
        message: 'Order creation failed',
        error: error.error?.description || error.message,
      });
    }
  }
);

// Verify Razorpay payment signature
router.post(
  '/verify-payment',
  authMiddleware,
  [
    body('razorpay_order_id').notEmpty().withMessage('Order ID required'),
    body('razorpay_payment_id').notEmpty().withMessage('Payment ID required'),
    body('razorpay_signature').notEmpty().withMessage('Signature required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      console.log('[Debug] Signature verification:', {
        received: razorpay_signature,
        generated: expectedSignature,
      });
      if (expectedSignature !== razorpay_signature) {
        console.warn('[Warning] Signature mismatch for order:', razorpay_order_id);
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature',
        });
      }
      console.log('[Success] Payment verified for order:', razorpay_order_id);
      res.json({
        success: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        message: 'Payment verified successfully',
      });
    } catch (error) {
      console.error('[Error] Payment verification failed:', error.message);
      res.status(500).json({
        success: false,
        message: 'Payment verification failed',
        error: error.message,
      });
    }
  }
);

// Debug endpoint
router.get('/config-check', (req, res) => {
  res.json({
    razorpay_configured: !!process.env.RAZORPAY_KEY_ID,
    node_env: process.env.NODE_ENV || 'development',
    server_time: new Date().toISOString(),
  });
});

module.exports = router;