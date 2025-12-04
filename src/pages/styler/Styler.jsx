// src/Styler.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Styler.css';
import { combineImagesWithGemini, dataUrlToBase64, base64ToDataUrl, analyzeClothingImage } from './geminiApi';

export default function Styler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [originalModelPhoto, setOriginalModelPhoto] = useState(null);
  const [addedClothingItems, setAddedClothingItems] = useState([]);

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

  useEffect(() => {
    // Get model photo from navigation state
    const photoFromState = location.state?.modelPhoto;
    if (photoFromState) {
      setCurrentPhoto(photoFromState);
      setOriginalModelPhoto(photoFromState);
    }

    // Load saved clothing items from localStorage
    const savedItems = localStorage.getItem('clothingItems');
    if (savedItems) {
      setClothingItems(JSON.parse(savedItems));
    }
  }, [location.state]);

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
    if (!itemName.trim() || !pendingUpload) {
      return;
    }

    const newItem = {
      id: Date.now(),
      name: itemName.trim(),
      category: itemCategory,
      image: pendingUpload,
    };

    const updatedItems = [...clothingItems, newItem];
    setClothingItems(updatedItems);

    try {
      localStorage.setItem('clothingItems', JSON.stringify(updatedItems));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);

      if (error.name === 'QuotaExceededError') {
        alert(
          'Storage limit exceeded! Your wardrobe has too many items.\n\n' +
          'Please delete some items to free up space, or use the "Clear All" button to start fresh.'
        );
      } else {
        alert('Failed to save item. Please try again.');
      }
    }

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
  const combineImages = async (modelImage, clothingImages) => {
    try {
      // Convert data URLs to base64 (remove data:image/png;base64, prefix)
      const modelBase64 = dataUrlToBase64(modelImage);

      // Convert clothing images array to base64 array
      const clothingBase64Array = Array.isArray(clothingImages)
        ? clothingImages.map(img => dataUrlToBase64(img))
        : [dataUrlToBase64(clothingImages)];

      // Generate the combined image using Gemini
      const resultBase64 = await combineImagesWithGemini(modelBase64, clothingBase64Array);

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

    // Calculate the updated list (same logic as handleAddClothingItem, but not async)
    // const updatedList = addedClothingItems.filter(existingItem =>
    //   existingItem.category !== item.category || existingItem.category === 'Accessories'
    // );
    const updatedList = [...addedClothingItems];
    updatedList.push(item);

    // Add item to the list of added clothing items (only one per category)
    handleAddClothingItem(item);

    // Call the API to combine images with all items
    setIsProcessing(true);
    try {
      // Always combine from the original model photo
      const clothingImages = updatedList.map(i => i.image);
      const result = await combineImages(originalModelPhoto, clothingImages);

      if (result.success) {
        setCurrentPhoto(result.combinedImage);

        // Mark that user has combined images at least once
        setIsFirstTime(false);

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
    if (!selectedItem || !currentPhoto || isProcessing) return;

    // Calculate the updated list (same logic as handleAddClothingItem, but not async)
    // const updatedList = addedClothingItems.filter(existingItem =>
    //   existingItem.category !== selectedItem.category || existingItem.category === 'Accessories'
    // );
    const updatedList = [...addedClothingItems];
    updatedList.push(selectedItem);

    // Add item to the list of added clothing items (only one per category)
    handleAddClothingItem(selectedItem);

    setIsProcessing(true);
    try {
      // Always combine from the original model photo
      const clothingImages = updatedList.map(i => i.image);
      const result = await combineImages(originalModelPhoto, clothingImages);

      if (result.success) {
        setCurrentPhoto(result.combinedImage);

        setIsFirstTime(false);

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

  const handleRemoveAddedItem = async (indexToRemove) => {
    // Remove the item from the list
    const updatedList = addedClothingItems.filter((_, index) => index !== indexToRemove);
    setAddedClothingItems(updatedList);

    // If there are still items left, regenerate the image with remaining items
    if (updatedList.length > 0) {
      setIsProcessing(true);
      try {
        if (!originalModelPhoto) return;

        const clothingImages = updatedList.map(i => i.image);
        const result = await combineImages(originalModelPhoto, clothingImages);

        if (result.success) {
          setCurrentPhoto(result.combinedImage);
        } else {
          console.error('Combine failed:', result.error);
          alert('Failed to regenerate image: ' + (result.error || 'unknown'));
        }
      } catch (error) {
        console.error('Error regenerating image:', error);
        alert('Failed to regenerate image. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // No items left, revert to original model photo
      if (originalModelPhoto) {
        setCurrentPhoto(originalModelPhoto);
      }
    }
  };

  const handleAddClothingItem = (item) => {
    setAddedClothingItems(prev => {
      // Remove any existing item of the same category, except for Accessories
      // const filteredItems = prev.filter(existingItem =>
      //   existingItem.category !== item.category || existingItem.category === 'Accessories'
      // );
      // Add the new item
      // return [...filteredItems, item];
      return [...prev, item];
    });
  };


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
            🗑️ Clear all items
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
            <p style={{ color: '#666' }}>
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
              <p style={{ color: '#666' }}>Select an item to preview it.</p>
            )}
          </div>
          <div className="styler-preview-actions">
            <button
              className="styler-action-button"
              type="button"
              onClick={handleEquipSelectedItem}
              disabled={!selectedItem || !currentPhoto || isProcessing}
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
        <h2 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Your Avatar</h2>

        {currentPhoto ? (
          <div
            ref={modelAreaRef}
            className={`styler-model-wrapper ${isDraggingOver ? 'dragging-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <img
              src={currentPhoto}
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
          </div>
        ) : null}

        {currentPhoto && (
          <>
            <button
              className="styler-icon-button"
              type="button"
              onClick={handleGoBackToUpload}
              title="Go back to upload model"
              style={{ marginTop: '1rem' }}
            >
              ← Change Avatar
            </button>

            {/* Added clothing items bubbles */}
            {addedClothingItems.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                {addedClothingItems.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className={`added-bubble added-bubble-${item.category.toLowerCase()}`}
                    title={`Click to remove ${item.name}`}
                    onClick={() => handleRemoveAddedItem(index)}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="bubble-img styler-bubble-image"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!currentPhoto && (
          <div className="styler-no-photo">
            <p>No model photo found.</p>
            <p style={{ color: '#666', marginTop: '0.25rem' }}>
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
