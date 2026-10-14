# 🍿 VineParty

### Synchronized watch parties. Better together.

VineParty is a real-time watch-party web application that lets friends watch videos together in a shared room. It combines synchronized playback, live chat, reactions, collaborative queues, polls, and room management in one interface.

**Built with the MERN stack, React, and Socket.IO.**

<!-- Replace these placeholders with your actual repository and deployment URLs. -->

([**🚀 Live Demo**](https://vineparty.netlify.app/)) · [Report a Bug](https://github.com/stuti3333/vineparty-mern/issues)

---

## ✨ Features

- **Synchronized Playback** — Coordinate play, pause, seeking, and queue transitions across participants.
- **Real-Time Communication** — Exchange messages and emoji reactions while watching.
- **Collaborative Queue** — Add videos, manage the playlist, and jump between queued items.
- **Discover Videos** — Browse available titles with search, category filters, rating filters, and sorting.
- **Interactive Polls** — Vote on questions and coordinate decisions such as skipping a video or pausing for a break.
- **Room Management** — Invite friends, track participants, and support host handover.
- **Reconnection Support** — Restore a returning participant's room identity and synchronize their state.
- **Performance Dashboard** — Inspect control latency, playback drift, network statistics, and room activity.
- **Responsive Video Controls** — Seek, toggle captions when available, mute, and enter fullscreen.

## 🛠️ Tech Stack

| Technology | Purpose                                      |
| ---------- | -------------------------------------------- |
| MongoDB    | Persistent data storage when configured      |
| Express.js | Backend API and HTTP server                  |
| React      | Frontend interface and component rendering   |
| Node.js    | Backend JavaScript runtime                   |
| Socket.IO  | Real-time communication between participants |
| Mongoose   | MongoDB object-document mapping              |

### Architecture

VineParty uses a client-server architecture. The React client communicates with the Express backend through HTTP endpoints and Socket.IO events.

The server maintains authoritative live room state, while MongoDB provides persistence when enabled. Clients use playback drift correction to keep their video positions aligned with the server's room state.

```text
                 ┌──────────────────────┐
                 │     React Client     │
                 │ Player · Chat · UI   │
                 └──────────┬───────────┘
                            │
                 HTTP + Socket.IO
                            │
                 ┌──────────▼───────────┐
                 │   Node.js + Express  │
                 │   Socket.IO Server   │
                 └──────────┬───────────┘
                            │
                  ┌─────────▼─────────┐
                  │   Room Engine     │
                  │ Authoritative     │
                  │ Live Room State   │
                  └─────────┬─────────┘
                            │
                  ┌─────────▼─────────┐
                  │ MongoDB / Mongoose│
                  │ Optional Storage  │
                  └───────────────────┘
```

_The diagram describes the intended architecture; exact persistence behavior depends on the server implementation and configuration._

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- MongoDB, if you want database persistence
- Git

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd VineParty
```

### 2. Install dependencies

```bash
npm run install-all
```

This command should install the server and client dependencies as configured by the root `package.json`.

### 3. Configure environment variables

Create your local environment file:

```bash
cp .env.example .env
```

Configure the variables required by your server. If your implementation supports in-memory operation, set:

```env
MONGODB_URI=off
```

**Note:** In-memory state may be lost when the server restarts. Use a configured database when persistent storage is required.

### 4. Start development servers

```bash
npm run dev
```

According to the project's current configuration:

- React frontend: `http://localhost:3001`
- Express backend: `http://localhost:3000`

The actual ports depend on the scripts and environment configuration in your repository.

## 🏗️ Production

To build the React frontend and start the Express server:

```bash
npm run build
npm start
```

In the combined deployment configuration, Express serves the compiled frontend from `client/build`.

The production server is expected to be available at:

`http://localhost:3000`

Make sure the frontend has been built and all required environment variables are configured before starting the production server.

## ☁️ Deployment

VineParty can be deployed as one application or as separate frontend and backend services.

### Frontend — Netlify

Configure the Netlify site with:

| Setting           | Value           |
| ----------------- | --------------- |
| Base directory    | `client`        |
| Build command     | `npm run build` |
| Publish directory | `build`         |

If your client uses `REACT_APP_API_URL`, configure it with your deployed backend's public URL.

### Backend — Render

Deploy the Node.js/Express server and configure the environment variables required by your implementation, including:

- `MONGODB_URI`, if using MongoDB
- `CLIENT_ORIGIN`, if used by your server for CORS
- Any other required server configuration

Ensure that the backend accepts connections from the deployed frontend and that Socket.IO is configured correctly for the production origin.

**Important:** React environment variables prefixed with `REACT_APP_` are embedded during the frontend build. Changes to these values require a new build and deployment. Never put private secrets in frontend environment variables.

## 🧪 Testing

Run the backend integration/load test:

```bash
npm start
```

In a separate terminal:

```bash
npm test
```

The documented test suite exercises multiple clients and control actions, including synchronization, reconnection, unknown-room rejection, and host handover. Its results are written to:

```text
test/results.json
```

Run the frontend test separately:

```bash
cd client
npm test
```

The documented UI smoke test covers the intro, home screen, filters, room creation, live state, and playback controls.

### Performance measurements

The project's existing local test report describes the following results:

| Metric                  |      Reported result |
| ----------------------- | -------------------: |
| Control propagation p50 |   Approximately 2 ms |
| Control propagation p95 | Approximately 4–5 ms |
| Control propagation p99 |   Approximately 8 ms |
| Test clients            |                   12 |
| Control actions         |                  300 |

These are reported localhost test measurements, not guarantees of real-world network performance.

Control-message latency and actual video synchronization drift are different measurements. Real-network jitter and end-to-end browser playback synchronization require separate testing.

## 🔧 Engineering Highlights

VineParty addresses several challenges involved in building synchronized, multi-user applications.

| Challenge                                    | Approach                                                             |
| -------------------------------------------- | -------------------------------------------------------------------- |
| Keeping playback positions aligned           | Server-authoritative playback state and client-side drift correction |
| Concurrent room actions                      | Ordered in-memory state updates                                      |
| Database latency on the synchronization path | Write-behind persistence strategy                                    |
| Reconnecting participants                    | Persistent user identity and seat recovery                           |
| Host disconnection                           | Delayed host handover                                                |
| Duplicate video-ended events                 | Idempotent queue advancement                                         |
| Joining an invalid room                      | Explicit room-not-found handling                                     |
| Real-time room updates                       | Socket.IO event broadcasting                                         |
| Misaligned playback controls                 | Shared room state and synchronized control actions                   |
| Inaccurate playback heat maps                | Heat buckets derived from actual activity                            |

These implementation details should be kept in sync with the actual codebase as the project evolves.

## 📁 Project Structure

```text
VineParty/
├── server/
│   ├── index.js
│   ├── socket.js
│   ├── rooms.js
│   └── models/
│       └── Room.js
├── client/
│   └── src/
│       ├── App.js
│       ├── components/
│       │   ├── Boot.js
│       │   ├── Intro.js
│       │   ├── Home.js
│       │   ├── Room.js
│       │   ├── Discover.js
│       │   ├── Details.js
│       │   ├── Modal.js
│       │   └── Fibers.js
│       ├── hooks/
│       │   └── useRoom.js
│       ├── lib/
│       └── data/
└── test/
    └── load.js
```

_This structure reflects the project's documented layout; adjust filenames if the repository has changed._

## 🎬 Video Playback

The project includes local poster artwork and demo videos.

Users can add a custom video through the queue using a direct HTTP(S) video URL, such as an accessible MP4 or WebM file.

Playback depends on browser compatibility, the media server's accessibility, supported formats, and applicable cross-origin restrictions. A movie title or a streaming-service webpage URL is not automatically a playable video source.

## 🔮 Potential Improvements

- Add automated end-to-end tests for synchronized playback.
- Test playback drift under simulated latency, packet loss, and jitter.
- Improve persistence and recovery across backend restarts.
- Add stronger validation and security controls for custom media URLs.
- Expand accessibility, responsive layout, and browser compatibility testing.

## 📄 License

Add your chosen license before distributing the project. If you intend to publish it as an open-source project, include a `LICENSE` file that specifies how others may use and modify the code.

---

**VineParty — less coordinating, more watching.** 🍿
