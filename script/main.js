/* ---------- Global State ---------- */
let audioCtx = null;
let isRunning = false;
let wakeLock = null;

/* Poly voices */
const voices = new Map();

/* ADSR Envelope Parameters */
const envParams = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.2
};

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
const keyState = {};
const noteState = {};
const waveformStates = {};

document.querySelectorAll(".key-btn").forEach(btn => {
  const key = btn.dataset.key;
  keyState[key] = key === 'c';
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
  const type = btn.dataset.waveform;
  waveformStates[type] = type === "sine";
  btn.onclick = () => {

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
  const btn = document.querySelector(`.waveform-btn[data-waveform="${type}"]`);
  if (!btn) return;
  btn.classList.toggle("playing", playing);
}

function isWaveformStillPlaying(type) {
  for (const v of voices.values()) {
    if (v.waveform === type) return true;
  }
  return false;
}

function triggerRandomNote() {
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

function onSideWallCollision(wall){
  if (!isRunning) return;

  if (wall.label === "wall-left" || wall.label === "wall-right") {
    triggerRandomNote();
  } else if (wall.label === "wall-top" || wall.label === "wall-bottom") {
    if (yAssign.value === "delay") {
      boostDelayFeedback();
    }
  }
}


/* ---------- Audio Nodes ---------- */
let master;
let filter, delay, reverb;
let analyser, lfo, lfoGain;
let baseFilterType = "lowpass";
let baseFilterFreq = 6000;
let baseFilterQ = 0.7;
let baseDelayTime = 0.3;
let baseDelayFeedback = 0.35;
let baseDelaySend = 0.4;
let baseReverbDecay = 2;
let baseReverbTone = 4500;
let baseReverbSend = 0.4;


/* ---------- Envelope ---------- */
attack.oninput  = e => envParams.attack  = +e.target.value;
decay.oninput   = e => envParams.decay   = +e.target.value;
sustain.oninput = e => envParams.sustain = +e.target.value;
release.oninput = e => envParams.release = +e.target.value;

/* ---------- Filter ---------- */
filterType.onchange = e => {
  baseFilterType = e.target.value;
  if (!filter) return;
  setFilterType(baseFilterType);
};

filterFreq.oninput = e => {
  baseFilterFreq = parseInt(e.target.value);
  if (!filter) return;
  setFilterFreq(baseFilterFreq);
};

filterQ.oninput = e => {
  baseFilterQ = parseFloat(e.target.value);
  if (!filter) return;
  setFilterQ(baseFilterQ);
};

/* ---------- Delay ---------- */
delayTime.oninput = e => {
  baseDelayTime = parseFloat(e.target.value);
  if (!delay) return;
  setDelayTime(baseDelayTime);
};

delayFb.oninput = e => {
  baseDelayFeedback = parseFloat(e.target.value);
  if (!delay) return;
  setDelayFeedback(baseDelayFeedback);
};

delaySend.oninput = e => {
  baseDelaySend = parseFloat(e.target.value);
  if (!delay) return;
  setDelaySend(baseDelaySend);
};

/* ---------- Reverb ---------- */
reverbDecay.onchange = e => {
  baseReverbDecay = parseFloat(e.target.value);
  if (!reverb) return;
  setReverbDecay(baseReverbDecay);
};

reverbTone.oninput = e => {
  baseReverbTone = parseInt(e.target.value);
  if (!reverb) return;
  setReverbTone(baseReverbTone);
};

reverbSend.oninput = e => {
  baseReverbSend = parseFloat(e.target.value);
  if (!reverb) return;
  setReverbSend(baseReverbSend);
};

/* ---------- Physics ---------- */
gravity.oninput = e => {
  const g = parseFloat(e.target.value);
  gravityVal.textContent = g.toFixed(2);
  setGravity(g);
};

ballSize.oninput = e => {
  const size = parseFloat(e.target.value);
  ballSizeVal.textContent = size;
  setBallRadius(size);
};

/* ---------- Audio Init ---------- */
async function initAudio() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  master = audioCtx.createGain();
  master.gain.value = 0.25;

  setupDelay();
  setupReverb();
  setupFilter();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  master.connect(analyser);

  const destination = audioCtx.createMediaStreamDestination();
  audioEl.srcObject = destination.stream;
  audioEl.play();
  analyser.connect(destination);

  /* LFO */
  lfo = audioCtx.createOscillator();
  lfo.frequency.value = 5;

  lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0;

  lfo.connect(lfoGain);
  lfo.start();

  await audioCtx.resume();

  drawLoop();
  modLoop();
}

drawPhysics();

/* ---------- Modulation Loop ---------- */
function modLoop() {
  if (!audioCtx) return;

  const y = yNorm();
  const now = audioCtx.currentTime;

  if (yAssign.value === "pitch") {
    voices.forEach(v => {
        v.osc.frequency.setValueAtTime(v.baseFreq * Math.pow(2, 0.5 - y), now);
    });
  }
  else if (yAssign.value === "vibrato") {
    lfoGain.gain.value = y * 20;
  }
  else if (yAssign.value === "filter") {
    const cutoff = 200 + (1 - y) * 12000;
    setFilterFreq(cutoff);
  }
  requestAnimationFrame(modLoop);
}

yAssign.onchange = () => {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  if (yAssign.value !== "pitch") {
    voices.forEach(v => {
      v.osc.frequency.setValueAtTime(v.baseFreq, now);
    });
  }

  if (yAssign.value !== "vibrato") {
      lfoGain.gain.value = 0;
  }

  if (yAssign.value !== "filter") {
    setFilterFreq(baseFilterFreq);
  }

  if (yAssign.value === "delay") {
    setDelaySend(0.0);
  } else {
    setDelaySend(baseDelaySend);
  }
};

/* ---------- Note Handling ---------- */
function noteOn(key, freq, waveform) {
  if (!isRunning || voices.has(key)) return;

  const osc = audioCtx.createOscillator();
  osc.type = waveform;
  osc.frequency.value = freq;

  const env = audioCtx.createGain();
  env.gain.value = 0;

  osc.connect(env);
  env.connect(filter.input);
  lfoGain.connect(osc.frequency);

  osc.start();

  const now = audioCtx.currentTime;
  const y = yNorm();

  const envAmount =
    yAssign.value === "env"
      ? (0.3 + y * 0.7)
      : 1;

  env.gain.cancelScheduledValues(now);
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(
    envAmount,
    now + envParams.attack
  );
  env.gain.linearRampToValueAtTime(
    envAmount * envParams.sustain,
    now + envParams.attack + envParams.decay
  );

  voices.set(key, {
    osc,
    env,
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

  v.env.gain.cancelScheduledValues(now);
  v.env.gain.setValueAtTime(v.env.gain.value, now);
  v.env.gain.linearRampToValueAtTime(0, now + rel);

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


startBtn.onclick = async () => {
  if (!isRunning) {
    // ===== START =====
    await initAudio();

    isRunning = true;
    startBtn.textContent = "STOP";
    startBtn.classList.toggle("active", true);

    if (delay) setDelayFeedback(baseDelayFeedback);

    randomKickBall();

    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch (err) {
    }

  } else {
    // ===== STOP =====
    isRunning = false;
    startBtn.textContent = "START";
    startBtn.classList.toggle("active", false);

    allNotesOff();
    stopBall();

    if (delay) setDelayFeedback(0);

    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
    }
  }
};

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;

  // SPACEキー
  if (e.code === "Space") {
    e.preventDefault(); // ページスクロール防止

    randomKickBall();
  }
});
