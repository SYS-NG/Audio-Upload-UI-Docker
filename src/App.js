import React, { useState, useEffect } from 'react';
import './App.css'; // Make sure to import the CSS
// If your logo is in `public/` folder, you can reference it by "/logo.png" in <img src="/logo.png" ... />
// If your logo is in `src/`, then do: import logo from './logo.png';
function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }
  
    // Allow both .wav and .mp4 files
    if (!(
      selectedFile.type === 'audio/wav' ||
      selectedFile.type === 'video/mp4' ||
      selectedFile.name.toLowerCase().endsWith('.wav') ||
      selectedFile.name.toLowerCase().endsWith('.mp4')
    )) {
      alert("Only .wav and .mp4 files are allowed.");
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

  return (
    <div className="App">
      <header className="App-header">
        <img src="/logo.png" className="App-logo" alt="Momenta Logo" />
        <h1 className="title">Audio Uploader</h1>

        <div className="upload-section">
          <input type="file" accept=".wav, .mp4" onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
        </div>

        {/* Preview before uploading */}
        {selectedFile && (
          <div className="preview">
            <h3>Preview:</h3>
            {selectedFile.type === 'video/mp4' ? (
              <video width="320" height="240" controls src={URL.createObjectURL(selectedFile)}>
                Your browser does not support the video tag.
              </video>
            ) : selectedFile.type === 'audio/wav' ? (
              <audio controls src={URL.createObjectURL(selectedFile)}>
                Your browser does not support the audio element.
              </audio>
            ) : null}
          </div>
        )}

        {/* Status message */}
        <p className="status">{uploadStatus}</p>

        {/* Queued files with playable media and download link */}
        <h2>Queued Files</h2>
        <ul>
          {queue.map((file, index) => {
            const lowerName = file.originalname.toLowerCase();
            return (
              <li key={index}>
                {lowerName.endsWith('.mp4') ? (
                  <video width="320" height="240" controls>
                    <source src={file.downloadUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : lowerName.endsWith('.wav') ? (
                  <audio controls>
                    <source src={file.downloadUrl} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                ) : (
                  <span>{file.originalname}</span>
                )}
                <br />
                <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">
                  Download {file.originalname}
                </a>
              </li>
            );
          })}
        </ul>
      </header>
    </div>
  );
}

export default App;