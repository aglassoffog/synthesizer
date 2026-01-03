/* ===============================
   main.js
   =============================== */

/* ---------- Global State ---------- */
let audioCtx = null;
let powerOn = false;
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
const powerBtn = document.getElementById("powerBtn");
const yAssign  = document.getElementById("yAssign");

/* ADSR sliders */
const attack  = document.getElementById("attack");
const decay   = document.getElementById("decay");
const sustain = document.getElementById("sustain");
const release = document.getElementById("release");

/* Waveform radios */
document.querySelectorAll("input[name='waveform']").forEach(r => {
  r.onchange = e => currentWaveform = e.target.value;
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

  powerOn = true;
  powerBtn.textContent = "ON";

  /* start loops */
  drawLoop();
  modLoop();
}

powerBtn.onclick = initAudio;

/* ---------- Helpers ---------- */
function yNorm() {
  return Math.min(Math.max(ball.position.y / 400, 0), 1);
}

/* ---------- Note Handling ---------- */
function noteOn(key, freq) {
  if (!powerOn || voices.has(key)) return;

  const osc = audioCtx.createOscillator();
  osc.type = currentWaveform;
  osc.frequency.value = freq;

  const gain = audioCtx.createGain();
  gain.gain.value = 0;

  osc.connect(gain);
  gain.connect(master);
  lfoGain.connect(osc.frequency);

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

  osc.start();

  voices.set(key, {
    osc,
    gain,
    baseFreq: freq
  });
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

/* ---------- Keyboard ---------- */
const keyMap = {
  a: 261.63,
  b: 293.66,
  c: 329.63,
  d: 349.23,
  e: 392.0,
  f: 440.0,
  g: 493.88,
  h: 523.25
};

window.addEventListener("keydown", e => {
  if (e.repeat || !powerOn) return;

  const k = e.key.toLowerCase();
  if (!keyMap[k]) return;

  kickBall();
  noteOn(k, keyMap[k]);
});

window.addEventListener("keyup", e => {
  if (!powerOn) return;
  noteOff(e.key.toLowerCase());
});
