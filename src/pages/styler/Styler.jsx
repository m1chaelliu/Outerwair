// src/Styler.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Styler.css';

export default function Styler() {
  const navigate = useNavigate();
  const [basePhoto, setBasePhoto] = useState(null);
  const [clothingItems, setClothingItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Tops');
  const modelAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedPhoto = localStorage.getItem('modelPhoto');
    if (savedPhoto) {
      setBasePhoto(savedPhoto);
    }

    // Load saved clothing items from localStorage
    const savedItems = localStorage.getItem('clothingItems');
    if (savedItems) {
      setClothingItems(JSON.parse(savedItems));
    }
  }, []);

  const handleGoBackToUpload = () => {
    navigate('/upload');
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPendingUpload(event.target.result);
      setShowUploadModal(true);
      setItemName('');
      setItemCategory('Tops');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveClothingItem = () => {
    if (!itemName.trim() || !pendingUpload) return;

    const newItem = {
      id: Date.now(),
      name: itemName.trim(),
      category: itemCategory,
      image: pendingUpload,
    };

    const updatedItems = [...clothingItems, newItem];
    setClothingItems(updatedItems);
    localStorage.setItem('clothingItems', JSON.stringify(updatedItems));

    setShowUploadModal(false);
    setPendingUpload(null);
    setItemName('');
  };

  const handleCancelUpload = () => {
    setShowUploadModal(false);
    setPendingUpload(null);
    setItemName('');
  };

  const handleClearAllItems = () => {
    if (clothingItems.length === 0) {
      alert('No items to clear.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete all ${clothingItems.length} clothing item${clothingItems.length === 1 ? '' : 's'}? This action cannot be undone.`
    );

    if (confirmed) {
      setClothingItems([]);
      localStorage.removeItem('clothingItems');
    }
  };

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('clothingItem', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  // Stubbed API function for combining images
  const combineImages = async (modelImage, clothingImage) => {
    // Replace with actual API call
    console.log('API Call: Combining images...');
    console.log('Model Image:', modelImage.substring(0, 50) + '...');
    console.log('Clothing Image:', clothingImage.substring(0, 50) + '...');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For now, return a mock result
    return {
      success: true,
      combinedImage: modelImage, // Stub: just return the model image
      message: 'Images combined successfully (stub)',
    };
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const itemData = e.dataTransfer.getData('clothingItem');
    if (!itemData) return;

    const item = JSON.parse(itemData);

    // Call the API to combine images
    setIsProcessing(true);
    try {
      const result = await combineImages(basePhoto, item.image);

      if (result.success) {
        // Update the base photo with the combined result
        setBasePhoto(result.combinedImage);

        console.log('Successfully combined images:', result.message);
      }
    } catch (error) {
      console.error('Error combining images:', error);
      alert('Failed to combine images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = selectedCategory === 'All'
    ? clothingItems
    : clothingItems.filter(item => item.category === selectedCategory);

  return (
    <div className="styler-container">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="styler-modal-overlay">
          <div className="styler-modal">
            <h3>Add Clothing Item</h3>

            {pendingUpload && (
              <div className="styler-modal-preview">
                <img src={pendingUpload} alt="Preview" className="styler-modal-image" />
              </div>
            )}

            <div className="styler-modal-form">
              <label htmlFor="item-name">
                Item Name
                <input
                  id="item-name"
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Blue Denim Jacket"
                  autoFocus
                />
              </label>

              <label htmlFor="item-category">
                Category
                <select
                  id="item-category"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                >
                  <option value="Tops">Tops</option>
                  <option value="Bottoms">Bottoms</option>
                  <option value="Outerwear">Outerwear</option>
                  <option value="Shoes">Shoes</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </label>
            </div>

            <div className="styler-modal-actions">
              <button
                className="styler-modal-button secondary"
                onClick={handleCancelUpload}
                type="button"
              >
                Cancel
              </button>
              <button
                className="styler-modal-button primary"
                onClick={handleSaveClothingItem}
                disabled={!itemName.trim()}
                type="button"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="styler-wardrobe">
        <header className="styler-wardrobe-header">
          <button
            className="styler-icon-button"
            type="button"
            onClick={handleFileUploadClick}
            title="Upload clothing item"
          >
            📁 Upload Photos
          </button>
          <button className="styler-icon-button" type="button">
            🔗 Link Photos
          </button>
          <button className="styler-icon-button" type="button">
            📸 Snap a Picture
          </button>
          <button
            className="styler-icon-button"
            type="button"
            onClick={handleClearAllItems}
            title="Clear all items"
          >
            🗑️
          </button>
        </header>

        {/* Category list */}
        <div className="styler-categories">
          {['All', 'Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'].map(category => (
            <button
              key={category}
              className={`styler-category ${selectedCategory === category ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div className="styler-items-list">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="styler-item"
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
              >
                <img src={item.image} alt={item.name} className="styler-item-image" />
                <div className="styler-item-info">
                  <div className="styler-item-name">{item.name}</div>
                  <div className="styler-item-category">{item.category}</div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ opacity: 0.6 }}>
              No items in this category.
            </p>
          )}
        </div>

        {/* Preview area*/}
        <div className="styler-preview">
          <h3 style={{color:'#363636'}}>Preview</h3>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Your Model</h2>
          <button
            className="styler-icon-button"
            type="button"
            onClick={handleGoBackToUpload}
            title="Go back to upload"
          >
            ← Back to Upload
          </button>
        </div>

        {basePhoto ? (
          <div
            ref={modelAreaRef}
            className={`styler-model-wrapper ${isDraggingOver ? 'dragging-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <img
              src={basePhoto}
              alt="Base model"
              className="styler-model-photo"
            />

            {/* Processing overlay */}
            {isProcessing && (
              <div className="styler-processing-overlay">
                <div className="styler-spinner"></div>
                <p>Combining images...</p>
              </div>
            )}

            {/* Drop indicator */}
            {!isProcessing && isDraggingOver && (
              <div className="styler-model-overlay">
                <div className="styler-drop-indicator">
                  Drop here to try on
                </div>
              </div>
            )}

            {!isProcessing && !isDraggingOver && (
              <div className="styler-model-overlay">
                <p style={{ opacity: 0.7 }}>
                  Drag clothing items here to try them on
                </p>
              </div>
            )}
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
