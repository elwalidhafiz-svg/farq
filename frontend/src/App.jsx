import React, { useState } from 'react';
import axios from 'axios';
import StoryboardView from './components/StoryboardView';
import ExportButton from './components/ExportButton';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scenes, setScenes] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setError('');
    } else if (selected) {
      setError('Please select a PDF file.');
      setFile(null);
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }

    setLoading(true);
    setError('');
    setScenes(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000, // 10 minutes — HuggingFace can be slow
      });

      setScenes(response.data);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Arabic Script to Storyboard</h1>
        <p>Upload an Arabic advertising script (PDF) to generate a visual storyboard with AI-generated images.</p>
      </header>

      <section className="upload-section">
        <h2>Upload Script</h2>
        <div className="file-input-wrapper">
          <label className="file-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Choose PDF File
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={loading}
            />
          </label>

          {file && (
            <span className="file-name">{file.name}</span>
          )}

          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={!file || loading}
          >
            {loading ? 'Generating...' : 'Generate Storyboard'}
          </button>
        </div>
      </section>

      {error && (
        <div className="error-box">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="loading-section">
          <div className="spinner" />
          <p>Processing your script... This may take several minutes while images are being generated.</p>
        </div>
      )}

      {scenes && !loading && (
        <>
          <ExportButton disabled={false} />
          <StoryboardView scenes={scenes} />
          <ExportButton disabled={false} />
        </>
      )}
    </div>
  );
}

export default App;
