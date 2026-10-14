# VineParty — MERN edition

Synchronized watch parties. **M**ongoDB · **E**xpress · **R**eact · **N**ode (Socket.io for real-time).

## Run
```bash
npm run install-all          # server + client dependencies
cp .env.example .env         # MongoDB is optional: MONGODB_URI=off runs in memory
npm run dev                  # API http://localhost:3000  +  React http://localhost:3001
```
Production: `npm run build && npm start` → everything on http://localhost:3000 (Express serves `client/build`).
Invite other devices on your Wi-Fi by opening the app via your computer's network address; the invite dialog shows it.

## Tests
```bash
npm start            # in one terminal (MONGODB_URI=off is fine)
npm test             # 12 users, 300 control actions + failure scenarios → test/results.json
cd client && npm test   # UI smoke test: intro → home → filters → create room → live state → controls
```

## What was broken in the previous MERN port, and the fix
| Problem | Fix |
|---|---|
| `npm run build` failed: `./img/hall.jpg` not found (images lived in `public/`, imported from `src/`) | Images are referenced from `public/img` |
| `npm start` ran the old `ws` server, not the MERN one; two competing servers | One server: `server/index.js` (Express + Socket.io + Mongoose) |
| Clock offset never computed → drift correction compared against the wrong clock on any second device | NTP-style offset from the lowest-RTT of the last 8 pings |
| `sendCtl` sent `t: undefined` for play/pause → room position corrupted | Always sends the real position; `0` handled |
| Every action did `findOne` + `save` on MongoDB: lost updates under concurrency, DB latency on the sync path | In-memory authoritative state (one total order, `seq`); Mongo is write-behind persistence |
| Room schema/state mismatch (`currentIdx`, host object) and `next` stopped playback | One state shape; `next` is idempotent (`from` index) and keeps playing |
| Joining a non-existent room hung silently; others never saw joins/leaves | `Room not found` error; state is broadcast on every join/leave |
| Random user id on each reload, `crypto.randomUUID` crashes on plain-http LAN | Persistent id; no `randomUUID` — same id reclaims the same seat |
| Intro never advanced (`#track` inside a fixed stage), scenes swapped, wrong aspect ratios, **Enter button had no handler**, 60 fps `setState`, requestAnimationFrame loops stacking per render | Rebuilt: one rAF loop, refs only, correct order and ratios, working button |
| Hero/cards pointed at non-existent `*.jpg` next to the mp4s → blank posters | Local poster + hero art with per-movie SVG fallback and alt text |
| Discover section was static (search/chips did nothing) | Working fuzzy search, categories, rating filter and sort |
| Heat map used `Math.random()`; floating emoji never rendered; status stuck on "connecting…" | Real heat buckets, floating emoji, live status |
| `esc()` applied inside JSX (double escaping), chat via `document.querySelector` | React escapes; controlled inputs |
| Missing: GhostFibers background, boot splash, invite dialog, polls that act, host handover, reconnect | All present |
| Socket.io CORS allowed `localhost:3000` only (the dev client is on 3001); `required length:5` isn't a Mongoose option | Dev CORS open, `CLIENT_ORIGIN` in prod; `minlength/maxlength` |

New lobby photo: the marquee text is re-lettered with our own plates (`NOW SHOWING`, `WATCH TOGETHER`, `BEST TIMEPASS`, `VINEPARTY`). The photo still shows a real venue's building and posters.

## Measured (test/results.json — localhost, Node 22, 12 clients, 300 actions)
Control propagation p50 ≈ 2 ms, **p95 ≈ 4–5 ms**, p99 ≈ 8 ms (target ≤ 250 ms). 12 simultaneous seeks converge to one state; late join and reconnect restore state without duplicate seats; unknown room rejected; host handed over after the 8 s grace; 12 simultaneous "ended" reports advance the queue once.
Not measured here: real-network jitter and in-browser video drift (the correction loop targets ≤ 500 ms; the Stats tab shows live numbers).

## Structure
```
server/  index.js (Express, REST, static) · socket.js (events) · rooms.js (live engine + persistence) · models/Room.js
client/  src/App.js · components/ (Boot, Intro, Home, Room, Discover, Details, Modal, Fibers) · hooks/useRoom.js · lib/ · data/
test/    load.js
```
Posters are local files, the player streams open-licence demo videos; paste any direct mp4 URL in **Queue** to watch your own.
