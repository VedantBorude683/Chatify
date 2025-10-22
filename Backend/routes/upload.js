const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure 'uploads' directory exists
// This navigates one level up from 'routes' to the project root, then into 'uploads'
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Set up storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename to prevent overwrites
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// @route   POST /api/upload
// @desc    Upload a file
// @access  Private (You should add your auth middleware here)
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  // Return the public URL of the file
  res.json({
    // This URL must be accessible from the client.
    // Ensure 'http://localhost:3001' matches your server's address.
    fileUrl: `http://localhost:3001/uploads/${req.file.filename}` 
  });
});

module.exports = router;