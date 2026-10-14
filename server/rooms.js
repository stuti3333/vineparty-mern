const Room = require('./models/Room');
const mongoose = require('mongoose');

const now = () => Date.now();
const CODE = /^[A-Z0-9]{3,8}$/;

class LiveRoom {
  constructor(code, saved = {}) {
    this.code = code;
    this.users = new Map();
    this.host = saved.host || null;
    this.playlist = saved.playlist || [];
    this.idx = saved.idx || 0;
    this.pos = saved.pos || 0;
    this.playing = false;
    this.at = now();
    this.seq = 0;
    this.polls = saved.polls || [];
    this.chat = saved.chat || [];
    this.heat = saved.heat || [];
    this.n = saved.n || 0;
    this.timers = {};
  }
  online() {
    return [...this.users.values()].filter((u) => u.on);
  }
  state() {
    return {
      seq: this.seq,
      playing: this.playing,
      pos: this.pos,
      at: this.at,
      idx: this.idx,
      playlist: this.playlist,
      host: this.host,
      polls: this.polls,
      users: [...this.users.values()].map((u) => ({
        id: u.id,
        name: u.name,
        on: u.on,
      })),
    };
  }
  snapshot() {
    return {
      host: this.host,
      playlist: this.playlist,
      idx: this.idx,
      pos: this.pos,
      polls: this.polls,
      chat: this.chat.slice(-100),
      heat: this.heat.slice(-300),
      n: this.n,
    };
  }
  go(i) {
    const n = this.playlist.length;
    if (!n) return;
    this.idx = ((i % n) + n) % n;
    this.pos = 0;
    this.at = now();
    this.playing = true;
    this.heat = [];
  }
}

class Rooms {
  constructor() {
    this.map = new Map();
    this.saving = new Map();
  }
  dbReady() {
    return mongoose.connection.readyState === 1;
  }
  valid(code) {
    return CODE.test(code);
  }

  async fetch(code, create) {
    if (!this.valid(code)) return null;
    let R = this.map.get(code);
    if (R) return R;
    let saved = null;
    if (this.dbReady()) {
      try {
        const d = await Room.findOne({ code }).lean();
        saved = d && d.data;
      } catch (e) {
        console.warn('load failed:', e.message);
      }
    }
    R = this.map.get(code);
    if (R) return R;
    if (!saved && !create) return null;
    R = new LiveRoom(code, saved || {});
    this.map.set(code, R);
    return R;
  }
  async exists(code) {
    if (!this.valid(code)) return false;
    if (this.map.has(code)) return true;
    if (!this.dbReady()) return false;
    try {
      return !!(await Room.exists({ code }));
    } catch {
      return false;
    }
  }
  save(R) {
    if (!this.dbReady()) return;
    clearTimeout(this.saving.get(R.code));
    this.saving.set(
      R.code,
      setTimeout(() => {
        this.saving.delete(R.code);
        Room.updateOne(
          { code: R.code },
          { $set: { data: R.snapshot(), updatedAt: new Date() } },
          { upsert: true },
        ).catch((e) => console.warn('save failed:', e.message));
      }, 600),
    );
  }
  release(R) {
    clearTimeout(R.timers.gc);
    R.timers.gc = setTimeout(() => {
      if (!R.online().length) {
        this.save(R);
        this.map.delete(R.code);
      }
    }, 300000);
  }
  get size() {
    return this.map.size;
  }
}

module.exports = { Rooms, LiveRoom };
