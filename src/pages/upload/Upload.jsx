import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Upload.css';

export default function Upload() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [photoMode, setPhotoMode] = useState(false);
  const [error, setError] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [photoSource, setPhotoSource] = useState(null); // 

  // ---- Camera ----
  const startCamera = async () => {
    try {
      setError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setError("Unable to access camera. Check permissions or HTTPS.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (photoMode) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [photoMode]);

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    context.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/png');
    setCapturedPhoto(dataUrl);
    setIsPreviewing(true);
    setPhotoMode(false);
    setPhotoSource('camera');
  };

  // ---- File upload & drag/drop ----
  const handleFileSelected = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file.");
      return;
    }

    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setCapturedPhoto(dataUrl);
      setIsPreviewing(true);
      setPhotoMode(false);
      setPhotoSource('file');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelected(file);
  };

  const handleUploadAreaClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    handleFileSelected(file);
  };

  // ---- Preview actions ----
  const handleCameraRetake = () => {
    setCapturedPhoto(null);
    setIsPreviewing(false);
    setPhotoSource(null);
    setPhotoMode(true);
  };

  const handleFileReselect = () => {
    setCapturedPhoto(null);
    setIsPreviewing(false);
    setPhotoSource(null);
    setPhotoMode(false);
  };

  const handleUsePhoto = () => {
    if (!capturedPhoto) return;

    // Pass the photo via navigation state instead of localStorage
    navigate('/styler', { state: { modelPhoto: capturedPhoto } });
  };

  return (
    <div className="upload-container">
      <h1>Select Avatar</h1>
      <p>Upload / Take a photo of your avatar</p>

      {/* ---- Preview screen ---- */}
      {isPreviewing && capturedPhoto && (
        <div className="preview-container">
          <img
            src={capturedPhoto}
            alt="Captured preview"
          />
          <div className="preview-buttons">
            {photoSource === 'camera' && (
              <button className="nav-button" onClick={handleCameraRetake}>
                Retake ↺
              </button>
            )}

            {photoSource === 'file' && (
              <button className="nav-button" onClick={handleFileReselect}>
                Reselect
              </button>
            )}

            <button className="nav-button" onClick={handleUsePhoto}>
              Use Photo →
            </button>
          </div>
        </div>
      )}

      {/* upload / camera UI */}
      {!isPreviewing && (
        <>

          {!photoMode && (
            <div
              className={`upload-area ${isDragging ? 'upload-area-dragging' : ''}`}
              onClick={handleUploadAreaClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging ? (
                <div className="upload-drop-indicator">
                  Drop your photo here
                </div>
              ) : (
                <p>Drag and drop photos here, or click to browse</p>
              )}
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />

          {photoMode && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
              <button
                className="nav-button"
                onClick={() => setPhotoMode(false)}
              >
                ← Back to Upload
              </button>
              <div></div>
              <div></div>
            </div>

          )}
          {photoMode && (
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  borderRadius: '8px',
                  marginTop: '1rem',
                }}
              />
              <button
                className="nav-button"
                style={{ marginTop: '1rem' }}
                onClick={handleTakePhoto}
              >
                Take Photo 📸
              </button>
            </div>
          )}
        </>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Footer buttons */}
      {!isPreviewing && !photoMode && (
        <button
          className="nav-button"
          onClick={() => setPhotoMode(true)}
        >
          Use Camera 📷
        </button>
      )}

      {/* <button
        className="nav-button"
        onClick={() => navigate('/styler')}
      >
        Go to Styler →
      </button> */}
    </div>
  );
}
