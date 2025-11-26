import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/home/Home';
import Upload from './pages/upload/Upload';
import Styler from './pages/styler/Styler';

function App() {
  /*
  import { GoogleGenAI } from "@google/genai";
  const ai = new GoogleGenAI({});
  async function main() {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Explain how AI works in a few words",
    });
    console.log(response.text);
  }
  await main();
  */

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/styler" element={<Styler />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App
