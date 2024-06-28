// src/App.tsx
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import Lobby from "./pages/Lobby";
import Home from "./pages/Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
      </Routes>
    </Router>
  );
}

export default App;
