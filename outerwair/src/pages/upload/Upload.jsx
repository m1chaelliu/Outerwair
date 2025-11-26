import { useNavigate } from 'react-router-dom';
import './Upload.css';

export default function Upload() {
  const navigate = useNavigate();

  return (
    <div className="upload-container">
      <h1>Model Upload</h1>
      <p>Upload / Take a photo of your model</p>

      <div className="upload-area">
        {/* Add your upload functionality here */}
        <p>Drag and drop files or click to browse</p>
      </div>

      <button
        className="nav-button"
      >
        Photo mode
      </button>
      <button
        className="nav-button"
        onClick={() => navigate('/styler')}
      >
        Go to Styler →
      </button>
    </div>
  );
}
