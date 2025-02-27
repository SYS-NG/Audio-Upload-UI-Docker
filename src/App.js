import React, { useState, useEffect } from 'react';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [queue, setQueue] = useState([]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }

    // Ensure file is a .wav
    if (selectedFile.type !== 'audio/wav' && !selectedFile.name.endsWith('.wav')) {
      alert("Only .wav files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        setUploadStatus("Upload successful!");
        fetchQueue();
      } else {
        setUploadStatus("Upload failed: " + result.message);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadStatus("Upload failed.");
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await fetch('/queue');
      const files = await response.json();
      setQueue(files);
    } catch (error) {
      console.error("Error fetching queue:", error);
    }
  };

  // Initially load the queue
  useEffect(() => {
    fetchQueue();
  }, []);

  return (
    <div style={{ margin: '20px' }}>
      <h1>Audio Uploader</h1>
      <input type="file" accept=".wav" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      <p>{uploadStatus}</p>
      <h2>Queued Files</h2>
      <ul>
        {queue.map((file, index) => (
          <li key={index}>
            {file.originalname} – <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">Download</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
