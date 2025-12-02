// src/Styler.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Styler.css';
import { combineImagesWithGemini, dataUrlToBase64, base64ToDataUrl, analyzeClothingImage } from './geminiApi';

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
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const modelAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);

  // Camera state and refs (required by camera handlers/modal)
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraCapturedPhoto, setCameraCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Bubbles state: persisted positions and dragging refs
  const [bubblePositions, setBubblePositions] = useState({}); // { [itemId]: { left: '10%', top: '120%' } }
  const draggingRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

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

    try {
      const raw = localStorage.getItem('bubblePositions');
      if (raw) setBubblePositions(JSON.parse(raw));
    } catch (e) {
      // ignore malformed saved positions
    }

    // Load isFirstTime from localStorage
    // const savedFirstTime = localStorage.getItem('isFirstTime');
    // if (savedFirstTime === 'false') {
    //   setIsFirstTime(false);
    // }
  }, []);

  const handleGoBackToUpload = () => {
    navigate('/upload');
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageDataUrl = event.target.result;
      setPendingUpload(imageDataUrl);
      setShowUploadModal(true);
      setItemName('');
      setItemCategory('Tops');
      setIsGeneratingTitle(true);

      // Automatically generate title and category from image
      try {
        const base64Image = dataUrlToBase64(imageDataUrl);
        const { title, category } = await analyzeClothingImage(base64Image);
        setItemName(title);
        setItemCategory(category);
      } catch (error) {
        console.error('Failed to generate title and category:', error);
        // If generation fails, just leave defaults for manual entry
      } finally {
        setIsGeneratingTitle(false);
      }
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

  // Use Gemini API to combine images
  const combineImages = async (modelImage, clothingImage) => {
    try {
      // Convert data URLs to base64 (remove data:image/png;base64, prefix)
      const modelBase64 = dataUrlToBase64(modelImage);
      const clothingBase64 = dataUrlToBase64(clothingImage);

      // Generate the combined image using Gemini
      const resultBase64 = await combineImagesWithGemini(modelBase64, clothingBase64);

      // Convert back to data URL for display
      const combinedImage = base64ToDataUrl(resultBase64);

      return { success: true, combinedImage };
    } catch (e) {
      console.error('combineImages error', e);
      return { success: false, error: e.message || String(e) };
    }
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
        setBasePhoto(result.combinedImage);
        // persist combined model so it remains after reloads
        try { localStorage.setItem('modelPhoto', result.combinedImage); } catch (_) {}

        // Mark that user has combined images at least once
        setIsFirstTime(false);
        // try { localStorage.setItem('isFirstTime', 'false'); } catch (_) {}

        console.log('Successfully combined images');
      } else {
        console.error('Combine failed:', result.error);
        alert('Failed to combine images: ' + (result.error || 'unknown'));
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

  const startCamera = async () => {
    try {
      setCameraError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setCameraStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setCameraError('Unable to access camera. Check permissions or HTTPS.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
      setCameraCapturedPhoto(null);
      setCameraError('');
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen]);

  const handleOpenCamera = () => {
    setIsCameraOpen(true);
  };

  const handleCloseCamera = () => {
    setIsCameraOpen(false);
  };

  const handleCaptureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/png');
    setCameraCapturedPhoto(dataUrl);

    stopCamera();
  };

  const handleCameraRetake = () => {
    setCameraCapturedPhoto(null);
    startCamera();
  };

  const handleCameraUsePhoto = async () => {
    if (!cameraCapturedPhoto) return;
    setPendingUpload(cameraCapturedPhoto);
    setItemName('');
    setItemCategory('Tops');
    setIsCameraOpen(false);
    setShowUploadModal(true);
    setIsGeneratingTitle(true);

    // Automatically generate title and category from image
    try {
      const base64Image = dataUrlToBase64(cameraCapturedPhoto);
      const { title, category } = await analyzeClothingImage(base64Image);
      setItemName(title);
      setItemCategory(category);
    } catch (error) {
      console.error('Failed to generate title and category:', error);
      // If generation fails, just leave defaults for manual entry
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const handleEquipSelectedItem = async () => {
    if (!selectedItem || !basePhoto || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await combineImages(basePhoto, selectedItem.image);

      if (result.success) {
        setBasePhoto(result.combinedImage);
        localStorage.setItem('modelPhoto', result.combinedImage);

        setIsFirstTime(false);
        // try { localStorage.setItem('isFirstTime', 'false'); } catch (_) {}

        console.log('Successfully combined images:', result.message);
      }
    } catch (error) {
      console.error('Error combining images:', error);
      alert('Failed to combine images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveSelectedItem = () => {
    if (!selectedItem) return;
    setShowDeleteModal(true);
  };

  const handleCancelRemoveItem = () => {
    setShowDeleteModal(false);
  };

  const handleConfirmRemoveItem = () => {
    if (!selectedItem) return;

    const updatedItems = clothingItems.filter(
      (item) => item.id !== selectedItem.id
    );

    setClothingItems(updatedItems);
    localStorage.setItem('clothingItems', JSON.stringify(updatedItems));

    setSelectedItem(null);
    setShowDeleteModal(false);
  };

  // pointer drag handlers
  const handlePointerDownBubble = (e, itemId) => {
    e.preventDefault();
    draggingRef.current = { id: itemId };
    setDraggingId(itemId);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e) => {
    const drag = draggingRef.current;
    if (!drag || !modelAreaRef.current) return;
    const rect = modelAreaRef.current.getBoundingClientRect();
    const leftPct = ((e.clientX - rect.left) / rect.width) * 100;
    const topPct = ((e.clientY - rect.top) / rect.height) * 100;

    const updated = { ...bubblePositions };
    updated[drag.id] = { left: `${leftPct}%`, top: `${topPct}%` };
    setBubblePositions(updated);
  };

  const onPointerUp = (e) => {
    const drag = draggingRef.current;
    if (!drag) return;

    const rect = modelAreaRef.current?.getBoundingClientRect();
    const updated = { ...bubblePositions };

    if (rect) {
      const leftPct = ((e.clientX - rect.left) / rect.width) * 100;
      const topPct = ((e.clientY - rect.top) / rect.height) * 100;
      updated[drag.id] = { left: `${leftPct}%`, top: `${topPct}%` };
    }

    saveBubblePositions(updated);

    draggingRef.current = null;
    setDraggingId(null);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  // persist positions
  const saveBubblePositions = (newPositions) => {
    setBubblePositions(newPositions);
    try { localStorage.setItem('bubblePositions', JSON.stringify(newPositions)); } catch (_) {}
  };

  // Default bubble positions by category (percent relative to model wrapper)
  const getBubblePosition = (category, index, total) => {
    let baseLeft = 50;
    let baseTop = 50;
    switch (category) {
      case 'Tops': baseTop = -12; baseLeft = 50; break;
      case 'Outerwear': baseTop = 8; baseLeft = 112; break;
      case 'Accessories': baseTop = 8; baseLeft = -12; break;
      case 'Bottoms': baseTop = 112; baseLeft = 50; break;
      case 'Shoes': baseTop = 125; baseLeft = 78; break;
      default: baseTop = 50; baseLeft = 50;
    }
    const spreadPx = 18;
    const offset = (index - (total - 1) / 2) * spreadPx;
    return { left: `calc(${baseLeft}% + ${offset}px)`, top: `${baseTop}%` };
  };

  // Group clothing items by category for bubble layout
  const grouped = clothingItems.reduce((acc, it) => {
    (acc[it.category] = acc[it.category] || []).push(it);
    return acc;
  }, {});

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
      {/* Camera Modal for Snap a Picture */}
      {isCameraOpen && (
        <div className="styler-modal-overlay">
          <div className="styler-modal">
            <h3>Snap a Picture</h3>

            {cameraError && (
              <p style={{ color: 'red', marginBottom: '0.5rem' }}>{cameraError}</p>
            )}

            {!cameraCapturedPhoto ? (
              <div className="styler-modal-preview">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="styler-modal-video"
                />
              </div>
            ) : (
              <div className="styler-modal-preview">
                <img
                  src={cameraCapturedPhoto}
                  alt="Captured preview"
                  className="styler-modal-image"
                />
              </div>
            )}

            <div className="styler-modal-actions">
              {!cameraCapturedPhoto ? (
                <>
                  <button
                    className="styler-modal-button secondary"
                    type="button"
                    onClick={handleCloseCamera}
                  >
                    Cancel
                  </button>
                  <button
                    className="styler-modal-button primary"
                    type="button"
                    onClick={handleCaptureFromCamera}
                  >
                    Capture
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="styler-modal-button secondary"
                    type="button"
                    onClick={handleCameraRetake}
                  >
                    Retake
                  </button>
                  <button
                    className="styler-modal-button primary"
                    type="button"
                    onClick={handleCameraUsePhoto}
                  >
                    Use Photo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                  placeholder={isGeneratingTitle ? "Generating title..." : "e.g., Blue Denim Jacket"}
                  autoFocus
                  disabled={isGeneratingTitle}
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
                disabled={!itemName.trim() || isGeneratingTitle}
                type="button"
              >
                {isGeneratingTitle ? 'Generating...' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="styler-modal-overlay">
          <div className="styler-modal">
            <h3 style={{color:'black'}}>
              Remove Clothing Item</h3>

            <div className="styler-modal-preview">
              <img
                src={selectedItem.image}
                alt={selectedItem.name}
                className="styler-modal-image"
              />
            </div>

            <p style={{color:'black', textAlign: 'center', marginTop: '0.5rem' }}>
              Are you sure you want to remove <strong>{selectedItem.name}</strong> from your wardrobe?
              This action cannot be undone.
            </p>

            <div className="styler-modal-actions">
              <button
                className="styler-modal-button secondary"
                type="button"
                onClick={handleCancelRemoveItem}
              >
                Cancel
              </button>
              <button
                className="styler-modal-button primary"
                type="button"
                onClick={handleConfirmRemoveItem}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

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
          <button
            className="styler-icon-button"
            type="button"
            onClick={handleOpenCamera}
            title="Snap a clothing photo"
          >
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
                className={`styler-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => handleItemClick(item)}
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
          <h3 style={{ color: '#363636' }}>Preview</h3>
          <div className="styler-preview-box">
            {selectedItem ? (
              <div className="styler-preview-content">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="styler-preview-image"
                />
                <div className="styler-preview-info">
                  <div className="styler-preview-name">{selectedItem.name}</div>
                  <div className="styler-preview-category">{selectedItem.category}</div>
                </div>
              </div>
            ) : (
              <p style={{ opacity: 0.6 }}>Select an item to preview it.</p>
            )}
          </div>
          <div className="styler-preview-actions">
            <button
              className="styler-action-button"
              type="button"
              onClick={handleEquipSelectedItem}
              disabled={!selectedItem || !basePhoto || isProcessing}
            >
              {isProcessing ? 'Equipping...' : 'Equip'}
            </button>
            <button
              className="styler-action-button secondary"
              type="button"
              onClick={handleRemoveSelectedItem}
              disabled={!selectedItem}
            >
              Remove
            </button>
          </div>
        </div>
      </div>


      <div className="styler-model-area">
        <h2 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Your Model</h2>

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
                <p>Combining images...Please wait</p>
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

            {!isProcessing && !isDraggingOver && isFirstTime && (
              <div
                className="styler-model-overlay styler-model-overlay-temp"
                title="Drag clothing items here to try them on"
                style={{ pointerEvents: 'auto' }}
              >
              </div>
            )}

            {/* Bubbles overlay: show uploaded clothing icons around the model */}
            {clothingItems && clothingItems.length > 0 && (
              <div className="bubbles-overlay" aria-hidden={false}>
                {['Tops','Outerwear','Accessories','Bottoms','Shoes'].map((cat) => {
                  const list = grouped[cat] || [];
                  return list.map((item, idx) => {
                    const saved = bubblePositions[item.id];
                    const pos = saved || getBubblePosition(cat, idx, list.length);
                    return (
                      <div
                        key={item.id}
                        className={`bubble bubble-${cat.toLowerCase()} ${draggingId === item.id ? 'dragging' : ''}`}
                        style={{ left: pos.left, top: pos.top }}
                        title={`${item.name} (${item.category})`}
                        onPointerDown={(e) => handlePointerDownBubble(e, item.id)}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="bubble-img styler-bubble-image"
                          onClick={() => setSelectedItem(item)}
                        />
                      </div>
                    );
                  });
                })}
              </div>
            )}
          </div>
        ) : null}

        {basePhoto && (
          <button
            className="styler-icon-button"
            type="button"
            onClick={handleGoBackToUpload}
            title="Go back to upload model"
            style={{ marginTop: '1rem' }}
          >
            ← Change Model
          </button>
        )}

        {!basePhoto && (
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
              ← Back to Upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
