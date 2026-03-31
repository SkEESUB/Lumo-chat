# Real-Time Chat Application Implementation Plan

This document outlines the end-to-end plan to build the requested full-stack real-time chat application.

## User Review Required

> [!WARNING]
> **Cloudinary Credentials Needed:** To implement Step 5 (File & Image Sharing), we need access to a Cloudinary account. Could you please provide your Cloudinary `Cloud Name` and an `Upload Preset` (if we're doing client-side uploads) or your `API Key` and `API Secret` (if we handle uploads on the backend)?

> [!IMPORTANT]
> The app will be built exactly as requested, focusing heavily on modern, ultra-premium dark UI visuals, an aurora animated backdrop, glassmorphism, and smooth Socket.io real-time workflows without persistent databases.
> Is it okay to use **Vite** to initialize the React frontend?

## Proposed Changes

### 1. Workspace Foundation

We will initialize two main directories: `client` and `server`.

- `server/`: Node.js + Express backend setup.
- `client/`: React + Vite + Tailwind CSS + Framer Motion frontend.

---

### 2. Backend Architecture (Node.js/Express)

#### [NEW] `server/src/server.js`
Main entry point. Sets up Express, HTTP server, and Socket.IO. Handles CORS configuration.

#### [NEW] `server/src/roomManager.js`
In-memory room management logic. Functions to:
- Create a room (Generates unique Room ID + 6-digit passcode).
- Join a room (Validates passcode, enforces max 2-3 users limit).
- Leave a room (Removes user, implements smart delete if room is empty).
- Send initial connection data / validate rate limits.

#### [NEW] `server/src/socket.js`
Socket event handlers:
- `join_room`, `send_message`, `typing`, `disconnect`, `file_upload`.

---

### 3. Frontend Architecture (React/Vite)

#### [NEW] `client/src/App.jsx`
Main Application routing component. Switches between `Home` (Create/Join) and `ChatRoom` UI. Includes the animated aura background.

#### [NEW] `client/src/components/AnimatedBackground.jsx`
CSS/Framer motion component providing a subtle dark-themed aurora gradient / soft wave background.

#### [NEW] `client/src/components/Home.jsx`
Landing page featuring:
- Glassmorphism UI.
- "Create Room" button generating the roomId and passcode.
- "Join Room" form with Rate Limiting/Validation hints.

#### [NEW] `client/src/components/ChatRoom.jsx`
The main chat interface:
- Glassmorphism container.
- Chat message feed with auto-scrolling.
- Message Input + Upload Button + Send Button.
- Online Users count, typing indicators, and Room Link Copy feature.

#### [NEW] `client/src/services/socket.js`
Socket.IO client initialization and singleton manager.

#### [NEW] `client/src/services/cloudinary.js`
Helper service to securely upload images/files to Cloudinary and retrieve URLs to send as message payloads.

---

### 4. Implementation Steps

1. **Step 1 (Base):** Set up Node/Express backend + React/Vite frontend. Get basic Socket.io Ping/Pong working to verify connection.
2. **Step 2 (Rooms):** Build the server-side memory store for rooms. Create the join/create logic and implement the Home landing page UI.
3. **Step 3 (Real-Time):** Build the `ChatRoom` UI layout. Add bidirectional `chat_message` events and display them. Implement the auto-scroll.
4. **Step 4 (Smart Delete):** Add `disconnect` and `leave_room` event handlers. Remove rooms with 0 connected users to prevent memory leaks.
5. **Step 5 (Media Sharing):** Integrate Cloudinary upload. Update chat messages to render `<img />` tags or `<a href>` for files.
6. **Step 6 (UI Polish):** Implement the dark mode aurora wave background, ensure Tailwind typography and shadows pop effectively.
7. **Step 7 (Security):** Add `express-rate-limit` for initial room creations. Prevent socket flooding. Validate 6-digit pin.
8. **Step 8 (UX/Animations):** Add "typing..." indicators, user joined/left toasts, Framer Motion transitions, and connection recovery.

## Open Questions

1. For max users per room, the prompt mentions "2-3". Is it alright if I strictly cap it at **3 users**?
2. For Cloudinary uploads, I can configure the client to upload files directly (requires an *unsigned upload preset* in Cloudinary settings) to save backend bandwidth. Is this approach acceptable, or should all files pass through the Node.js server first?

## Verification Plan

### Automated / Manual Verification
- We will start the backend server (`npm run dev`) and frontend server (`npm run dev`).
- Open two separate browser contexts to test the app simultaneously.
- Verify room creation generates a valid 6-digit code.
- Verify attempting to join with an invalid code fails.
- Verify that real-time text and user joining/leaving events are broadcast correctly across browsers.
- Verify that clicking "Disconnect" triggers the smart room deletion when all users leave.
- Verify Cloudinary file uploads render correctly in the chat UI.
