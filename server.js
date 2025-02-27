const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');

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
    // Only allow .wav and .mp4 files
    const allowedExtensions = ['.wav', '.mp4'];
    if (!allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only .wav and .mp4 files are allowed'));
    }
    cb(null, true);
  }
});

// An in-memory queue (in production, consider using a database)
let fileQueue = [];

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Function to add file to the queue and respond
  const addToQueue = (filename, originalname, filePath, message) => {
    fileQueue = [{
      filename,
      originalname,
      filePath
    }];
    res.json({ message, file: { filename, originalname } });
  };

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (ext === '.mp4') {
    // Build the output filename for the .wav file
    const wavFilename = req.file.filename.replace(/\.mp4$/, '.wav');
    const wavFilePath = path.join(uploadDir, wavFilename);

    // Use ffmpeg to extract audio and convert to wav
    ffmpeg(req.file.path)
      .noVideo() // Remove video stream
      .format('wav')
      .on('end', () => {
        console.log(`Conversion complete: ${wavFilename}`);
        // Optionally, delete the original .mp4 file if not needed:
        // fs.unlinkSync(req.file.path);
        addToQueue(wavFilename, req.file.originalname.replace(/\.mp4$/, '.wav'), wavFilePath, "File uploaded and converted successfully");
      })
      .on('error', (err) => {
        console.error('Error converting file: ', err);
        res.status(500).json({ message: "Error converting file" });
      })
      .save(wavFilePath);
  } else {
    // If it's already a .wav file, just add it to the queue
    addToQueue(req.file.filename, req.file.originalname, req.file.path, "File uploaded successfully");
  }
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
