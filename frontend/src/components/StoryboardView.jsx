import React from 'react';

function StoryboardView({ scenes }) {
  if (!scenes || scenes.length === 0) return null;

  return (
    <div className="storyboard" id="storyboard-export">
      {scenes.map((scene, i) => (
        <div className="scene-card" key={scene.sceneNumber} style={{ animationDelay: `${i * 0.08}s` }}>
          <div className="scene-header">
            <span className="scene-number-badge">مشهد {scene.sceneNumber}</span>
            <span className="scene-header-title">Scene {scene.sceneNumber}</span>
          </div>
          <div className="scene-body">
            <div className="scene-descriptions">
              <div className="description-block">
                <h4>الصورة — Visual</h4>
                <p>{scene.visualDescription || '—'}</p>
              </div>
              <div className="description-block">
                <h4>الصوت — Audio</h4>
                <p>{scene.audioDescription || '—'}</p>
              </div>
            </div>

            {scene.englishPrompt && (
              <div className="english-prompt">
                <strong>Image Prompt:</strong> {scene.englishPrompt}
              </div>
            )}

            <div className="images-grid">
              {[0, 1, 2].map((idx) => (
                <div className="image-item" key={idx}>
                  {scene.images && scene.images[idx] ? (
                    <>
                      <img
                        src={scene.images[idx]}
                        alt={`Scene ${scene.sceneNumber} variation ${idx + 1}`}
                      />
                      <div className="image-label">Variation {idx + 1}</div>
                    </>
                  ) : (
                    <div className="image-placeholder">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span>غير متوفر</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StoryboardView;
