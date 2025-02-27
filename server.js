const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Use CORS middleware
app.use(cors());

// Directory where uploaded files will be stored
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Prefix the file with a timestamp to avoid collisions
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow .wav files
    if (path.extname(file.originalname).toLowerCase() !== '.wav') {
      return cb(new Error('Only .wav files are allowed'));
    }
    cb(null, true);
  }
});

// An in-memory queue (in production, consider using a database)
let fileQueue = [];

// POST /upload endpoint: upload and queue the .wav file
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Keep only the latest file in the queue
  fileQueue = [{
    filename: req.file.filename,
    originalname: req.file.originalname,
    filePath: req.file.path
  }];

  res.json({ message: "File uploaded successfully", file: req.file });
});

// GET /queue endpoint: return list of queued files with download URLs
app.get('/queue', (req, res) => {
  console.log("Request received for /queue endpoint");
  res.setHeader('Content-Type', 'application/json'); // Set content type to JSON
  if (!fileQueue || fileQueue.length === 0) {
    console.log("Queue is empty, returning empty array");
    return res.json([]); // Return empty array if queue is empty
  }
  
  const files = fileQueue.map(file => ({
    originalname: file.originalname,
    // Build a download URL dynamically; adjust hostname if needed
    downloadUrl: `${req.protocol}://${req.get('host')}/download/${file.filename}`
  }));
  console.log(`Returning ${fileQueue.length} files in the queue`);
  
  // Try to send the response as JSON
  try {
    res.json(files);
  } catch (error) {
    console.error("Error sending JSON response:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /download/:filename endpoint: serve the file for download
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
