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

// GET /queue endpoint: return list of queued files with download URLs and inference results
app.get('/queue', (req, res) => {
  console.log("Request received for /queue endpoint");
  res.setHeader('Content-Type', 'application/json');
  if (!fileQueue || fileQueue.length === 0) {
    console.log("Queue is empty, returning empty array");
    return res.json([]);
  }
  
  const files = fileQueue.map(file => ({
    originalname: file.originalname,
    downloadUrl: `${req.protocol}://${req.get('host')}/download/${file.filename}`,
    // Include inference results if available
    inferenceResult: file.inferenceResult || null
  }));
  console.log(`Returning ${fileQueue.length} files in the queue`);
  
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

// POST /inference-result endpoint: receive inference results for files
app.post('/inference-result', express.json(), (req, res) => {
  const { filename, isHuman } = req.body;
  
  if (!filename) {
    return res.status(400).json({ message: "Filename is required" });
  }
  
  if (typeof isHuman !== 'boolean') {
    return res.status(400).json({ message: "isHuman must be a boolean value" });
  }
  
  console.log(`Received inference result for ${filename}: ${isHuman ? 'Human' : 'Synthetic AI'} voice detected`);
  
  // Find the file in the queue
  const fileIndex = fileQueue.findIndex(file => file.filename === filename);
  
  if (fileIndex === -1) {
    console.log(`File ${filename} not found in queue, ignoring inference result`);
    return res.status(200).json({ message: "File not found in queue, result ignored" });
  }
  
  // Update the file with inference results
  fileQueue[fileIndex] = {
    ...fileQueue[fileIndex],
    inferenceResult: {
      isHuman,
      timestamp: new Date().toISOString()
    }
  };
  
  return res.status(200).json({ message: "Inference result recorded successfully" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
