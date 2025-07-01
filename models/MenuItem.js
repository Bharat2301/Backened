const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // unique: true creates the index
  title: { type: String, required: true },
  paragraph: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  rating: { type: Number, required: true, min: 0, max: 5 }, // Added validation
  image: { type: String, required: true },
});

module.exports = mongoose.model('MenuItem', menuItemSchema);