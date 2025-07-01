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
console.log('Attempting to load .env file from:', envPath);
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at', envPath);
  process.exit(1);
}
const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.error('Error loading .env file:', dotenvResult.error);
  process.exit(1);
}

// Debug: Log environment variables to verify
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
  origin: ['http://localhost:3000', 'https://food-kohl-theta.vercel.app/'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
}));
app.use(morgan('combined'));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Tasty Burger API' });
});

// Routes
app.use('/api/auth', authRoutes.router);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api', orderRoutes);
app.use('/api', razorpayRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});