import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Users, Loader2, Sparkles } from 'lucide-react';
import Logo from './ui/Logo';

export default function Home() {
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    roomId: '',
  });

  const navigate = useNavigate();

  // Handle input change
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔥 CREATE ROOM (FIXED)
  const handleCreateRoom = async () => {
    console.log("🔥 Create button clicked");

    if (!formData.username.trim()) {
      setError('Please enter a display name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_BACKEND_URL || "https://lumo-backend-9lq7.onrender.com";

      // Ensure userId exists before navigating
      let uid = localStorage.getItem("userId");
      if (!uid) {
        uid = crypto.randomUUID();
        localStorage.setItem("userId", uid);
      }
      localStorage.setItem("userName", formData.username);

      const res = await fetch(`${API_URL}/api/rooms/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username || "guest"
        }),
      });

      if (!res.ok) throw new Error('Failed to create room');

      const data = await res.json();

      navigate(`/room/${data.roomId}`, {
        state: { username: formData.username, code: data.code }
      });


    } catch (err) {
      console.error("❌ ERROR:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // 🔥 JOIN ROOM (FIXED)
  const handleJoinRoom = () => {
    if (!formData.username.trim() || !formData.roomId.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    // Ensure userId exists before navigating
    let uid = localStorage.getItem("userId");
    if (!uid) {
      uid = crypto.randomUUID();
      localStorage.setItem("userId", uid);
    }
    localStorage.setItem("userName", formData.username);

    const roomId = formData.roomId.toUpperCase();

    navigate(`/room/${roomId}`, {
      state: { username: formData.username }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
      className="w-full max-w-lg px-4 flex items-center justify-center [perspective:1200px]"
    >
      <motion.div
        whileHover={{ rotateX: 2, rotateY: 2, scale: 1.01 }}
        animate={{ y: [0, -5, 0] }}
        transition={{ y: { repeat: Infinity, duration: 5, ease: "easeInOut" }, default: { type: "spring", stiffness: 400, damping: 30 } }}
        className="relative w-full p-10 md:p-14 rounded-[2.5rem] flex flex-col items-center bg-[rgba(255,255,255,0.06)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.1)] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.15)] overflow-hidden transition-shadow duration-500 hover:shadow-[0_40px_80px_-12px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.2)]"
      >
        {/* Premium Glass Inner Top Highlight */}
        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-[inherit]"></div>

        {/* Glow */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-br from-blue-500/10 to-cyan-400/5 blur-3xl rounded-full -translate-y-1/2 pointer-events-none"></div>

        {/* Lumo Logo */}
        <Logo className="w-32 md:w-40 lg:w-48 mb-6" />
        
        <h1 className="sr-only">
          Lumo
        </h1>
        <p className="text-gray-400 text-center mb-8 font-medium">
          Connect securely in real-time rooms.
        </p>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm text-center shadow-lg backdrop-blur-md"
          >
            {error}
          </motion.div>
        )}

        <div className="w-full space-y-5 relative z-10">

          {/* Username */}
          <div className="space-y-1.5 group">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              Display Name
            </label>
            <div className="relative group/input">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="How should we call you?"
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-600 px-5 py-3.5 rounded-xl focus:outline-none focus:bg-white/5 transition-all duration-300 shadow-inner peer"
              />
              {/* Glowing Bottom Border */}
              <div className="absolute inset-x-0 bottom-[1px] h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400 opacity-0 peer-focus:opacity-100 peer-focus:shadow-[0_2px_15px_rgba(34,211,238,0.8)] transition-all duration-500 pointer-events-none"></div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isJoinMode ? (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-5"
              >
                {/* Room ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                    Room ID
                  </label>
                  <div className="relative group/input">
                    <input
                      type="text"
                      name="roomId"
                      value={formData.roomId}
                      onChange={handleInputChange}
                      placeholder="e.g. A1B2C"
                      className="w-full uppercase bg-black/20 border border-white/10 text-white px-5 py-3.5 rounded-xl focus:outline-none focus:bg-white/5 transition-all duration-300 font-mono peer"
                    />
                    {/* Glowing Bottom Border */}
                    <div className="absolute inset-x-0 bottom-[1px] h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400 opacity-0 peer-focus:opacity-100 peer-focus:shadow-[0_2px_15px_rgba(34,211,238,0.8)] transition-all duration-500 pointer-events-none"></div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinRoom}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Users size={20} />}
                  {loading ? 'Joining...' : 'Join Room'}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <MessageSquare size={20} />}
                  {loading ? 'Starting...' : 'Start a Room'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle */}
        <div className="mt-8 pt-6 border-t border-white/10 w-full text-center">
          <button
            onClick={() => {
              setIsJoinMode(!isJoinMode);
              setError('');
            }}
            className="text-gray-400 hover:text-cyan-400 text-sm"
          >
            {isJoinMode
              ? "Create a new room instead →"
              : "Have a Room ID? Join here →"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}