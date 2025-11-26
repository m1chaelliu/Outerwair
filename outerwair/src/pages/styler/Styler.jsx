// src/Styler.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Styler.css';

export default function Styler() {
  const navigate = useNavigate();
  const [basePhoto, setBasePhoto] = useState(null);

  useEffect(() => {
    const savedPhoto = localStorage.getItem('modelPhoto');
    if (savedPhoto) {
      setBasePhoto(savedPhoto);
    }
  }, []);

  const handleGoBackToUpload = () => {
    navigate('/upload');
  };

  return (
    <div className="styler-container">
      <div className="styler-wardrobe">
        <header className="styler-wardrobe-header">
          <button className="styler-icon-button" type="button">
            📁
          </button>
          <button className="styler-icon-button" type="button">
            🔗
          </button>
          <button className="styler-icon-button" type="button">
            🧠
          </button>
        </header>

        {/* Category list */}
        <div className="styler-categories">
          <button className="styler-category active" type="button">All</button>
          <button className="styler-category" type="button">Tops</button>
          <button className="styler-category" type="button">Bottoms</button>
          <button className="styler-category" type="button">Outerwear</button>
          <button className="styler-category" type="button">Shoes</button>
          <button className="styler-category" type="button">Accessories</button>
        </div>

        {/* Items list */}
        <div className="styler-items-list">
          <p style={{ opacity: 0.6 }}>
            Clothing items will appear here.
          </p>
        </div>

        {/* Preview area*/}
        <div className="styler-preview">
          <h3>Preview</h3>
          <div className="styler-preview-box">
            <p style={{ opacity: 0.6 }}>Select an item to preview it.</p>
          </div>
          <div className="styler-preview-actions">
            <button className="styler-action-button" type="button" disabled>
              Equip
            </button>
            <button className="styler-action-button secondary" type="button" disabled>
              Remove
            </button>
          </div>
        </div>
      </div>


      <div className="styler-model-area">
        <h2>Your Model</h2>

        {basePhoto ? (
          <div className="styler-model-wrapper">
            <img
              src={basePhoto}
              alt="Base model"
              className="styler-model-photo"
            />

            {/* Placeholder for future equipped items & bubbles */}
            <div className="styler-model-overlay">
              <p style={{ opacity: 0.7 }}>
                Outfit overlays & bubbles will go here.
              </p>
            </div>
          </div>
        ) : (
          <div className="styler-no-photo">
            <p>No model photo found.</p>
            <p style={{ opacity: 0.7, marginTop: '0.25rem' }}>
              Go back to upload or take a photo to get started.
            </p>
            <button
              className="nav-button"
              type="button"
              onClick={handleGoBackToUpload}
              style={{ marginTop: '0.75rem' }}
            >
              Back to Upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
