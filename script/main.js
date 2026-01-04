/* ===============================
   main.js
   =============================== */

/* ---------- Global State ---------- */
let audioCtx = null;
let isRunning = false;
let currentWaveform = "sine";

/* ADSR Envelope Parameters */
const envParams = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.2
};

/* Poly voices */
const voices = new Map();

/* ---------- DOM ---------- */
const startBtn = document.getElementById("startBtn");
const yAssign  = document.getElementById("yAssign");

/* ADSR sliders */
const attack  = document.getElementById("attack");
const decay   = document.getElementById("decay");
const sustain = document.getElementById("sustain");
const release = document.getElementById("release");


const ballSizeSlider = document.getElementById("ballSize");
const ballSizeVal = document.getElementById("ballSizeVal");

ballSizeSlider.addEventListener("input", e => {
  const size = Number(e.target.value);
  ballSizeVal.textContent = size;

  setBallRadius(size);
});

const keyButtonsEl = document.getElementById("keyButtons");

const KEY_LIST = [
  { name: "C", key: "c", freq: 261.63 },
  { name: "D", key: "d", freq: 293.66 },
  { name: "E", key: "e", freq: 329.63 },
  { name: "F", key: "f", freq: 349.23 },
  { name: "G", key: "g", freq: 392.00 },
  { name: "A", key: "a", freq: 440.00 },
  { name: "B", key: "b", freq: 493.88 }
];

const waveformTypes = ["sine", "square", "sawtooth", "triangle"];

const waveformStates = {
  sine: true,
  square: false,
  sawtooth: false,
  triangle: false
};


const keyState = {};
const noteState = {}; // note on/off

document.querySelectorAll(".key-btn").forEach(btn => {
  const key = btn.dataset.key;
  keyState[key] = key === 'c'; // Cのみtrue
  noteState[key] = false;

  btn.onclick = () => {
    if (noteState[key]) {
      noteOff(key);
    }
    keyState[key] = !keyState[key];
    btn.classList.toggle("active", keyState[key]);
  }
});

document.querySelectorAll(".waveform-btn").forEach(btn => {
  btn.onclick = () => {
    const type = btn.dataset.waveform;

    // 発音中ならその波形全て note off して無効化
    if (waveformStates[type]) {
      voices.forEach((v, key) => {
        if (v.waveform === type) {
          noteOff(key);
        }
      });
    }

    waveformStates[type] = !waveformStates[type];
    btn.classList.toggle("active", waveformStates[type]);
  };
});

function setNoteButtonState(key, on) {
  const btn = document.querySelector(`.key-btn[data-key="${key}"]`);
  if (!btn) return;
  btn.classList.toggle("note-on", on);
}

function setWaveformPlaying(type, playing) {
  document
    .querySelector(`.waveform-btn[data-waveform="${type}"]`)
    ?.classList.toggle("playing", playing);
}

function isWaveformStillPlaying(type) {
  for (const v of voices.values()) {
    if (v.waveform === type) return true;
  }
  return false;
}




function onSideWallHit(side) {
  // 有効なKEYボタン一覧
  const activeKeys = KEY_LIST.filter(k => keyState[k.key]);
  if (activeKeys.length === 0) return;

  const activeWaveforms = waveformTypes.filter(w => waveformStates[w]);
  if (activeWaveforms.length === 0) return;

  // ランダムに1つ選ぶ
  const k = activeKeys[Math.floor(Math.random() * activeKeys.length)];
  const w = activeWaveforms[Math.floor(Math.random() * activeWaveforms.length)];

  if (noteState[k.key]) {
    noteOff(k.key);
  } else {
    noteOn(k.key, k.freq, w);
  }

}

Matter.Events.on(engine, "collisionStart", event => {
  if (!isRunning) return;

  event.pairs.forEach(pair => {
    const a = pair.bodyA;
    const b = pair.bodyB;

    // ボールと壁の組み合わせか？
    if (!isBallWallCollision(a, b)) return;

    const wall = a.label === "ball" ? b : a;

    // 左右の壁だけ反応
    if (wall.label === "wall-left" || wall.label === "wall-right") {
      onSideWallHit(wall.label);
    }
  });
});


/* ---------- Audio Nodes ---------- */
let master, analyser, lfo, lfoGain;

/* ---------- UI Bindings ---------- */
attack.oninput  = e => envParams.attack  = +e.target.value;
decay.oninput   = e => envParams.decay   = +e.target.value;
sustain.oninput = e => envParams.sustain = +e.target.value;
release.oninput = e => envParams.release = +e.target.value;

/* ---------- Audio Init ---------- */
async function initAudio() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  master = audioCtx.createGain();
  master.gain.value = 0.25;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  master.connect(analyser);
  analyser.connect(audioCtx.destination);

  /* LFO */
  lfo = audioCtx.createOscillator();
  lfo.frequency.value = 5;

  lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0;

  lfo.connect(lfoGain);
  lfo.start();

  await audioCtx.resume();

  /* start loops */
  drawLoop();
  modLoop();
  xyLoop();
}

startBtn.onclick = async () => {
  if (!isRunning) {
    // ===== START =====
    await initAudio();

    isRunning = true;
    startBtn.textContent = "STOP";
    startBtn.classList.toggle("active", true);

    randomKickBall();

  } else {
    // ===== STOP =====
    isRunning = false;
    startBtn.textContent = "START";
    startBtn.classList.toggle("active", false);

    document.querySelectorAll(".key-btn").forEach(btn => {
      btn.classList.remove("note-on");
    });

    allNotesOff();
    stopBall();
  }
};

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;

  // SPACEキー
  if (e.code === "Space") {
    e.preventDefault(); // ページスクロール防止

    if (!isRunning) return;
    randomKickBall();
  }
});

/* ---------- Helpers ---------- */
function yNorm() {
  return Math.min(Math.max(ball.position.y / 400, 0), 1);
}

/* ---------- Note Handling ---------- */
function noteOn(key, freq, waveform) {
  if (!isRunning || voices.has(key)) return;

  const osc = audioCtx.createOscillator();
  osc.type = waveform;
  osc.frequency.value = freq;

  const gain = audioCtx.createGain();
  gain.gain.value = 0;

  osc.connect(gain);
  gain.connect(master);
  lfoGain.connect(osc.frequency);

  osc.start();

  const now = audioCtx.currentTime;
  const y = yNorm();

  const envAmount =
    yAssign.value === "env"
      ? (0.3 + y * 0.7)
      : 1;

  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(
    envAmount,
    now + envParams.attack
  );
  gain.gain.linearRampToValueAtTime(
    envAmount * envParams.sustain,
    now + envParams.attack + envParams.decay
  );

  voices.set(key, {
    osc,
    gain,
    baseFreq: freq,
    waveform
  });

  noteState[key] = true;
  setNoteButtonState(key, true);
  setWaveformPlaying(waveform, true);
}

function noteOff(key) {
  const v = voices.get(key);
  if (!v) return;

  const now = audioCtx.currentTime;
  const y = yNorm();

  const rel =
    yAssign.value === "env"
      ? envParams.release * (0.3 + y)
      : envParams.release;

  v.gain.gain.cancelScheduledValues(now);
  v.gain.gain.setValueAtTime(v.gain.gain.value, now);
  v.gain.gain.linearRampToValueAtTime(0, now + rel);

  v.osc.stop(now + rel + 0.02);
  voices.delete(key);

  noteState[key] = false;
  setNoteButtonState(key, false);

  if (!isWaveformStillPlaying(v.waveform)) {
    setWaveformPlaying(v.waveform, false);
  }
}

function allNotesOff() {
  voices.forEach((_, key) => noteOff(key));
}

/* ---------- Modulation Loop ---------- */
function modLoop() {
  if (!audioCtx) return;

  voices.forEach(v => {
    const y = yNorm();

    if (yAssign.value === "pitch") {
      v.osc.frequency.setValueAtTime(
        v.baseFreq * Math.pow(2, 0.5 - y),
        audioCtx.currentTime
      );
      lfoGain.gain.value = 0;
    }
    else if (yAssign.value === "vibrato") {
      lfoGain.gain.value = y * 20;
    }
    else {
      v.osc.frequency.setValueAtTime(
        v.baseFreq,
        audioCtx.currentTime
      );
      lfoGain.gain.value = 0;
    }
  });

  requestAnimationFrame(modLoop);
}
