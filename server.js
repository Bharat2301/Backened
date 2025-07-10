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
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? '[REDACTED]' : undefined,
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
    console.log('Request origin:', origin); // Debug log to check incoming origin
    const allowedOrigins = [
      'http://localhost:3000',
      'https://food-kohl-theta.vercel.app',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('CORS error: Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Added OPTIONS for preflight
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Alternative manual CORS setup (uncomment if needed for testing)
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', 'https://food-kohl-theta.vercel.app');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   if (req.method === 'OPTIONS') {
//     return res.sendStatus(200);
//   }
//   next();
// });

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
app.use('/api/orders', orderRoutes);
app.use('/api/razorpay', razorpayRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message, err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Connect to MongoDB with retry
const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('MongoDB connected successfully');
      break;
    } catch (err) {
      console.error('MongoDB connection error:', err.message, err.stack);
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