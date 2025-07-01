require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10,
}).then(() => console.log('Connected to MongoDB'));

const menuItems = [
  {
    id: '0001',
    title: 'Crispy Chicken',
    paragraph: 'Chicken breast, chilli sauce, tomatoes, pickles, coleslaw',
    price: 99,
    rating: 5,
    image: `http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1750849974/menu/burger-11`,
  },
  {
    id: '0002',
    title: 'Ultimate Bacon',
    paragraph: 'House patty, cheddar cheese, bacon, onion, mustard',
    price: 199,
    rating: 4.5,
    image: `http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1750849975/menu/burger-12`,
  },
  {
    id: '0003',
    title: 'Black Sheep',
    paragraph: 'American cheese, tomato relish, avocado, lettuce, red onion',
    price: 149,
    rating: 4,
    image: `http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1750849977/menu/burger-13`,
  },
  {
    id: '0004',
    title: 'Vegan Burger',
    paragraph: 'House patty, cheddar cheese, bacon, onion, mustard',
    price: 179,
    rating: 3.5,
    image: `http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1750849978/menu/burger-14`,
  },
  {
    id: '0005',
    title: 'Double Burger',
    paragraph: '2 patties, cheddar cheese, mustard, pickles, tomatoes',
    price: 79,
    rating: 3.0,
    image: `http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1750849979/menu/burger-15`,
  },
  {
    id: '0006',
    title: 'Turkey Burger',
    paragraph: 'Turkey, cheddar cheese, onion, lettuce, tomatoes, pickles',
    price: 99,
    rating: 3,
    image: `http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1750849981/menu/burger-16`,
  },
  {
    id: '0007',
    title: 'Smokey House',
    paragraph: 'patty, cheddar cheese, onion, lettuce, tomatoes, pickles',
    price: 199,
    rating: 2.5,
    image: `http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1750849982/menu/burger-17`,
  },
  {
    id: '0008',
    title: 'Classic Burger',
    paragraph: 'cheddar cheese, ketchup, mustard, pickles, onion',
    price: 149,
    rating: 2.0,
    image: `http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1750849983/menu/burger-18`,
  },
];

async function seed() {
  try {
    await MenuItem.deleteMany({});
    await MenuItem.insertMany(menuItems);
    console.log('Menu items seeded successfully');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding menu items:', error);
    mongoose.connection.close();
  }
}

seed();