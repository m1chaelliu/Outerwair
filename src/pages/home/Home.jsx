import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1>Welcome to Outerw<span className="gradient-ai">ai</span>r</h1>
      <p>Team <span className="gradient-ai">(E)</span>ggcelent - Connor Chow, Michael Liu, Elliott Chia, Han Yang</p>

      <button
        className="nav-button"
        onClick={() => navigate('/upload')}
      >
        Begin →
      </button>
    </div>
  );
}
