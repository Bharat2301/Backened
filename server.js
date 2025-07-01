const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const razorpayRoutes = require('./routes/razorpay');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const dotenvResult = dotenv.config({ path: envPath });
  if (dotenvResult.error) {
    console.error('Error loading .env file:', dotenvResult.error);
    process.exit(1);
  }
  console.log('Loaded .env file from:', envPath);
} else {
  console.warn('No .env file found, relying on environment variables');
}

// Verify required environment variables
const requiredEnvVars = ['MONGODB_URI', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Debug: Log environment variables
console.log('Environment Variables Loaded:', {
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ? '[REDACTED]' : undefined,
  MONGODB_URI: process.env.MONGODB_URI ? '[REDACTED]' : undefined,
  JWT_SECRET: process.env.JWT_SECRET ? '[REDACTED]' : undefined,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '[REDACTED]' : undefined,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '[REDACTED]' : undefined,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '[REDACTED]' : undefined,
});

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:3000', 'https://food-kohl-theta.vercel.app/'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
}));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Tasty Burger API' });
});

// Routes
app.use('/api/auth', authRoutes.router);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes); // Updated for consistency
app.use('/api/razorpay', razorpayRoutes); // Updated for consistency

// Connect to MongoDB with retry
const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
      break;
    } catch (err) {
      console.error('MongoDB connection error:', err);
      retries -= 1;
      if (retries === 0) {
        console.error('MongoDB connection failed after retries');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});