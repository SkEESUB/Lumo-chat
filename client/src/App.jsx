import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import Home from './components/Home';
import ChatRoom from './components/ChatRoom';

function App() {
  return (
    <>
      {/* Premium Ambient Background Environment */}
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#020617_100%)] overflow-hidden select-none pointer-events-none">
        
        {/* Soft Blue Blob (Top Left) */}
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.2, 0.15] }} 
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }} 
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-500 rounded-full blur-[160px]" 
        />
        
        {/* Soft Cyan Blob (Bottom Right) */}
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.15, 0.1] }} 
          transition={{ repeat: Infinity, duration: 25, ease: "easeInOut", delay: 2 }} 
          className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-cyan-500 rounded-full blur-[180px]" 
        />

        {/* Subtle Noise Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }}
        ></div>
      </div>
      
      <div className="min-h-screen flex items-center justify-center p-0 md:p-4 text-gray-100 font-sans selection:bg-cyan-500/30">
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomId" element={<ChatRoom />} />
          </Routes>
        </Router>
      </div>
    </>
  );
}

export default App;
