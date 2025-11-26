import './Styler.css';
import { useNavigate } from 'react-router-dom';


export default function Styler() {
  const navigate = useNavigate();

  return (
    <div className="styler-container">
      <h1>Style Yourself</h1>
      <p>Mix and match your uploaded items to create the perfect outfit</p>

      <div className="styler-workspace">
        {/* Add your styling functionality here */}
        <p className='black'>Your styling workspace</p>
      </div>

      <button
        className="nav-button"
        onClick={() => navigate('/')}
      >
        Back to Title Screen
      </button>

      <button
        className="nav-button"
        onClick={() => navigate('/upload')}
      >
        Change Model
      </button>
    </div>
  );
}
