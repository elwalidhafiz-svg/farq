import React, { useState } from 'react';
import axios from 'axios';
import StoryboardView from './components/StoryboardView';
import ExportButton from './components/ExportButton';
import './App.css';

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
      setError('يرجى اختيار ملف PDF فقط.');
      setFile(null);
    }
  };

  const handleGenerate = async () => {
    if (!file) { setError('يرجى اختيار ملف PDF أولاً.'); return; }
    setLoading(true);
    setError('');
    setScenes(null);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000,
      });
      setScenes(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="app-bg" />
      <div className="floating-orb orb-1" />
      <div className="floating-orb orb-2" />
      <div className="floating-orb orb-3" />

      <div className="app">
        <header className="app-header">
          <div className="header-badge">
            <span>✦</span> AI Storyboard Generator
          </div>
          <h1>Arabic Script to Storyboard</h1>
          <p>حوّل سكريبت إعلانك العربي إلى ستوري بورد مرئي بالذكاء الاصطناعي</p>
        </header>

        <section className="upload-section">
          <h2>ارفع السكريبت</h2>
          <div className="file-input-wrapper">
            <label className="file-drop-zone">
              <div className="drop-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <span className="drop-text-main">اختر ملف PDF</span>
              <span className="drop-text-sub">اضغط لاختيار الملف</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={loading}
              />
            </label>

            {file && (
              <span className="file-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {file.name}
              </span>
            )}

            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={!file || loading}
            >
              {loading ? '⏳ جاري المعالجة...' : '✦ توليد الستوري بورد'}
            </button>
          </div>
        </section>

        {error && (
          <div className="error-box">⚠ {error}</div>
        )}

        {loading && (
          <div className="loading-section">
            <div className="loading-visual">
              <div className="spinner-ring spinner-ring-1" />
              <div className="spinner-ring spinner-ring-2" />
              <div className="spinner-ring spinner-ring-3" />
            </div>
            <div className="loading-title">جاري معالجة السكريبت...</div>
            <div className="loading-sub">قد يستغرق هذا بضع دقائق</div>
            <div className="loading-steps">
              <div className="loading-step"><div className="step-dot" /> استخراج المشاهد</div>
              <div className="loading-step"><div className="step-dot" /> ترجمة الوصف بـ AI</div>
              <div className="loading-step"><div className="step-dot" /> توليد الصور</div>
            </div>
          </div>
        )}

        {scenes && !loading && (
          <>
            <ExportButton />
            <StoryboardView scenes={scenes} />
            <ExportButton />
          </>
        )}
      </div>
    </>
  );
}

export default App;
