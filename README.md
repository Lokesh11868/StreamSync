# StreamSync 

 A modern, full-featured group video calling web application that offers seamless real-time communication with advanced features like live transcription, AI-powered meeting summaries, screen sharing, instant chat messaging, and secure file sharing. Built with cutting-edge technologies such as the Agora SDK, Deepgram AI, and Cloudinary, it delivers high-quality video and audio, end-to-end encryption, all accessible directly from your browser.

---

## Features
- Real-time video calls (Agora Web SDK)
- Real-time chat (Agora RTM )
- Live transcription (Deepgram Speech-to-Text)
- AI-powered meeting summaries (Google Gemini API)
- File sharing (Cloudinary integration)
- Member Management
- Device Control (Toggle Camera, Screen Share, Microphone)
- Works on desktop and mobile

---

## Technologies Used
- **Frontend:** HTML, CSS, JavaScript
  - [AgoraRTC_N-4.14.0.js](client/js/AgoraRTC_N-4.14.0.js) (video/audio)
  - [agora-rtm-sdk-1.5.1.js](client/js/agora-rtm-sdk-1.5.1.js) (real-time messaging)
  - Custom JS for room, lobby, file sharing, and audio processing
- **Backend:** Node.js, Express
  - [@deepgram/sdk](https://www.npmjs.com/package/@deepgram/sdk) (live transcription)
  - [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (Gemini API for summaries)
  - [agora-access-token](https://www.npmjs.com/package/agora-access-token) (token generation)
  - [cloudinary](https://www.npmjs.com/package/cloudinary) (file uploads)
  - [ws](https://www.npmjs.com/package/ws) (WebSocket server for transcription)
  - [multer](https://www.npmjs.com/package/multer) (file upload handling)
  - [cors](https://www.npmjs.com/package/cors)
  - [dotenv](https://www.npmjs.com/package/dotenv)
- **Deployment:** Render (backend), Vercel (frontend)

---

## Environment Variables
Create a `.env` file in the `server/` directory with the following variables:

```
APP_ID=your-agora-app-id
APP_CERTIFICATE=your-agora-app-certificate
DEEPGRAM_API_KEY=your-deepgram-api-key
GEMINI_API_KEY=your-google-gemini-api-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
PORT=3000 # or your preferred port
```

---

## Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd ChatNest-main
   ```
2. **Backend setup:**
   - Go to the `server/` folder:
     ```bash
     cd server
     npm install
     ```
   - Create a `.env` file as described above.
   - Start the backend:
     ```bash
     node server.js
     ```
3. **Frontend setup:**
   - Open `client/index.html` in your browser for the lobby.
   - Open `client/room.html` to join a room directly.

---

## Deployment

### Backend (Render)
- Push the `server/` folder to GitHub.
- Create a new Web Service on [Render](https://render.com/).
- Set environment variables in the Render dashboard (see above).
- Deploy and note your Render backend URL.

### Frontend (Vercel)
- Push the whole project (including `client/`) to GitHub.
- Import the repo in [Vercel](https://vercel.com/).
- Set the project root to `client/`.
- **Build Command:** *(leave blank)*
- **Output Directory:** `.`
- Deploy and use the Vercel URL for your frontend.

---

## Keeping Backend Awake
- Use [UptimeRobot](https://uptimerobot.com/) to ping your Render backend every 5 minutes to prevent it from sleeping.

---

## Credits
- Built with Agora, Deepgram, Google Gemini, Cloudinary, and open web technologies.
- UI/UX inspired by modern video conferencing tools.

---
