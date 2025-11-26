import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1>Welcome to Outerwair</h1>
      <p>Team (E)ggcelent - Connor Chow, Michael Liu</p>

      <button
        className="nav-button"
        onClick={() => navigate('/upload')}
      >
        Go to Upload →
      </button>
    </div>
  );
}
