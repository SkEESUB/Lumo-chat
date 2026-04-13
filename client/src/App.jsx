import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import Home from './components/Home';
import ChatRoom from './components/ChatRoom';
import { requestNotificationPermission } from "./services/firebase";

function App() {
  React.useEffect(() => {
    const setRealHeight = () => {
      document.documentElement.style.height = window.innerHeight + "px";
    };

    setRealHeight();
    window.addEventListener("resize", setRealHeight);

    // 🔥 ADD THIS LINE (THIS IS YOUR MISSING PIECE)
    requestNotificationPermission();

    return () => window.removeEventListener("resize", setRealHeight);
  }, []);

  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<ChatRoom />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
