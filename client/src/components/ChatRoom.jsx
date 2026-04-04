import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket, connectSocket, disconnectSocket } from "../services/socket";

export default function ChatRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};

  // FIXED USER ID (NO DUPLICATE BUG)
  const userIdRef = useRef(localStorage.getItem("userId") || crypto.randomUUID());
  const userId = userIdRef.current;
  localStorage.setItem("userId", userId);

  // FIXED USER NAME (NO OVERRIDE BUG)
  const [username] = useState(() => {
    const name = state.username || localStorage.getItem("userName") || prompt("Enter name") || "Guest";
    localStorage.setItem("userName", name);
    return name;
  });

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ online: 0, idle: 0, offline: 0 });
  const [creator, setCreator] = useState("Unknown");

  useEffect(() => {
    connectSocket();

    socket.emit("join_room", {
      roomId,
      userId,
      name: username
    });

    socket.on("room_data", (data) => {
      if (!data) return;

      setUsers(data.users || []);
      setCounts(data.counts || {});
      setCreator(data.creator?.name || "Unknown");
    });

    socket.on("receive_message", (msg) => {
      if (!msg) return;

      setMessages(prev => [...prev, {
        id: msg.id,
        senderName: msg.senderName || "Unknown",
        text: msg.text || ""
      }]);
    });

    socket.on("load_messages", (msgs) => {
      setMessages(msgs || []);
    });

    return () => {
      disconnectSocket();
    };
  }, [roomId]);

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h2>Room: {roomId}</h2>
      <p>👤 Created by: {creator}</p>

      <p>
        🟢 {counts.online} Online | 🟡 {counts.idle} Idle | ⚫ {counts.offline} Offline
      </p>

      <hr />

      <h3>Users</h3>
      {users.map(u => (
        <div key={u.userId}>
          {u.name} - {u.status}
        </div>
      ))}

      <hr />

      <h3>Messages</h3>
      {messages.map(m => (
        <div key={m.id}>
          <b>{m.senderName}:</b> {m.text}
        </div>
      ))}
    </div>
  );
}