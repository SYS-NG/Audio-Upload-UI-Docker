import React, { useState, useEffect } from 'react';
import './App.css'; // Make sure to import the CSS
// If your logo is in `public/` folder, you can reference it by "/logo.png" in <img src="/logo.png" ... />
// If your logo is in `src/`, then do: import logo from './logo.png';
function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetchQueue();
    
    // Set up polling interval only for inference results
    const intervalId = setInterval(() => {
      fetchInferenceUpdates();
    }, 3000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
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
      setIsLoading(true);
      const response = await fetch('/queue');
      const files = await response.json();
      setQueue(files);
    } catch (error) {
      console.error("Error fetching queue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // New function to only fetch inference updates
  const fetchInferenceUpdates = async () => {
    try {
      const response = await fetch('/queue');
      const updatedFiles = await response.json();
      
      // Only update queue if there are actual inference changes
      setQueue(prevQueue => {
        // Check if any inference results have changed
        const hasChanges = prevQueue.some(file => {
          const updatedFile = updatedFiles.find(
            updated => updated.originalname === file.originalname
          );
          
          // Check if inference result is new or has changed
          return updatedFile && (
            // Case 1: File had no inference result before but now has one
            (!file.inferenceResult && updatedFile.inferenceResult) ||
            // Case 2: Both have inference results but with different timestamps
            (file.inferenceResult && updatedFile.inferenceResult && 
             file.inferenceResult.timestamp !== updatedFile.inferenceResult.timestamp)
          );
        });
        
        // Only update state if there are actual changes
        if (hasChanges) {
          return prevQueue.map(file => {
            const updatedFile = updatedFiles.find(
              updated => updated.originalname === file.originalname
            );
            
            if (updatedFile && (
              (!file.inferenceResult && updatedFile.inferenceResult) ||
              (file.inferenceResult && updatedFile.inferenceResult && 
               file.inferenceResult.timestamp !== updatedFile.inferenceResult.timestamp)
            )) {
              // Only update the inference result, keep the rest the same
              return {
                ...file,
                inferenceResult: updatedFile.inferenceResult,
                // Preserve the existing media URLs to prevent re-rendering
                downloadUrl: file.downloadUrl
              };
            }
            return file;
          });
        }
        
        // If no changes, return the previous state to prevent re-render
        return prevQueue;
      });
    } catch (error) {
      console.error("Error fetching inference updates:", error);
    }
  };

  return (
    <div className="App">
      <div className="white-container">
      <header className="App-header">
        {/* Logo */}
        <img src="/logo.png" className="App-logo" alt="Momenta Logo" />

        {/* Explanation text under the logo/title */}
        <p className="explanation">
          Deepfake Audio Detection on AVS leverages AI to identify and protect against synthetic voice scams in real-time.
        </p>

        {/* Title */}
        <h1 className="gradient-text">Audio Uploader</h1>
        
        {/* Container for instruction text and Choose File */}
        <div className="upload-instruction-container">
          <span className="upload-instruction">
            Upload a video or audio you want to verify
          </span>
          <div className="upload-section">
            {/* Label styled as a white/purple-outlined button */}
            <label className="buttonWhite" htmlFor="file-input">
              Choose File
            </label>

            {/* Hidden file input */}
            <input
              id="file-input"
              type="file"
              accept=".wav, .mp4"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Preview */}
        {selectedFile && (
          <div className="preview">
            <h3>Preview:</h3>
            {selectedFile.type === 'video/mp4' || selectedFile.name.toLowerCase().endsWith('.mp4') ? (
              <video width="320" height="240" controls src={URL.createObjectURL(selectedFile)}>
                Your browser does not support the video tag.
              </video>
            ) : selectedFile.type === 'audio/wav' || selectedFile.name.toLowerCase().endsWith('.wav') ? (
              <audio controls src={URL.createObjectURL(selectedFile)}>
                Your browser does not support the audio element.
              </audio>
            ) : null}
          </div>
        )}

        {/* Upload button */}
        {selectedFile && (
          <div className="upload-button-container">
            <button className="buttonGradient" onClick={handleUpload}>
              Upload
            </button>
          </div>
        )}

        {/* Status message */}
        <p className="status">{uploadStatus}</p>

        {/* Queued files */}
        <h2>Queued Files</h2>
        {isLoading && queue.length === 0 ? (
          <p>Loading...</p>
        ) : (
          <ul className="file-list">
            {queue.map((file, index) => {
              const lowerName = file.originalname.toLowerCase();
              const mediaKey = `media-${file.originalname}-${index}`;
              return (
                <li key={`file-${file.originalname}-${index}`} className="file-item">
                  <div className="file-info">
                    <strong>{file.originalname}</strong>
                    {file.inferenceResult && (
                      <div className={`inference-result ${file.inferenceResult.isHuman ? 'human' : 'synthetic'}`}>
                        <strong>Voice detected:</strong> {file.inferenceResult.isHuman ? 'Human' : 'Synthetic AI'}
                      </div>
                    )}
                    <div className="media-container">
                      {lowerName.endsWith('.mp4') ? (
                        <video width="320" height="240" controls key={mediaKey}>
                          <source src={file.downloadUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : lowerName.endsWith('.wav') ? (
                        <audio controls key={mediaKey}>
                          <source src={file.downloadUrl} type="audio/wav" />
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <span>{file.originalname}</span>
                      )}
                    </div>
                    <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" className="download-link">
                      Download {file.originalname}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </header>
      </div>
    </div>
  );
}

export default App;