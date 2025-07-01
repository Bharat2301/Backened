require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Path to local images
const imagesDir = path.join(__dirname, '..', 'food', 'src', 'assets', 'menu');
const images = [
  'burger-11.jpg',
  'burger-12.jpg',
  'burger-13.jpg',
  'burger-14.jpg',
  'burger-15.jpg',
  'burger-16.jpg',
  'burger-17.jpg',
  'burger-18.jpg',
  'ads-1.jpg',
];

// Check if directory exists
if (!fs.existsSync(imagesDir)) {
  console.error('Error: Images directory does not exist:', imagesDir);
  process.exit(1);
}

// Check available files
const files = fs.readdirSync(imagesDir);
console.log('Files in menu directory:', files);
if (files.length === 0) {
  console.error('Error: No files found in menu directory');
  process.exit(1);
}

async function uploadImages() {
  let uploadedCount = 0;
  const errors = [];
  for (const image of images) {
    const filePath = path.join(imagesDir, image);
    if (!fs.existsSync(filePath)) {
      errors.push(`File not found: ${filePath}`);
      continue;
    }
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'menu',
        public_id: image.replace(/\.[^/.]+$/, ''),
      });
      console.log(`Uploaded ${image}: ${result.url}`);
      uploadedCount++;
    } catch (error) {
      errors.push(`Failed to upload ${image}: ${error.message}`);
    }
  }
  console.log(`Successfully uploaded ${uploadedCount} images`);
  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

uploadImages();