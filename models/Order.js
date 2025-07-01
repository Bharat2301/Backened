const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  paymentId: { type: String, required: true },
  orderId: { type: String, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// Add indexes for faster queries
orderSchema.index({ userId: 1 });
orderSchema.index({ 'items.menuItemId': 1 }); // Added index for faster order queries

module.exports = mongoose.model('Order', orderSchema);