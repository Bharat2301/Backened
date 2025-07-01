const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, required: true, default: 1 },
});

// Add index for faster queries
cartItemSchema.index({ userId: 1, menuItemId: 1 });

module.exports = mongoose.model('CartItem', cartItemSchema);