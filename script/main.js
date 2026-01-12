/* ---------- Global State ---------- */
let audioCtx = null;
let isRunning = false;

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
const waveformStates = [];

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
    const w = waveformStates.find(w => w.type === type);
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
      triggerRandomNote();
    } else if (wall.label === "wall-top" || wall.label === "wall-bottom") {
      if (yAssign.value === "delay") {
        boostDelayFeedback();
      }
    }

  });
});


/* ---------- Audio Nodes ---------- */
let master, filter, filterGain, bypassGain;
let analyser, lfo, lfoGain;
let baseFilterFreq = 6000;

/* ---------- Envelope ---------- */
attack.oninput  = e => envParams.attack  = +e.target.value;
decay.oninput   = e => envParams.decay   = +e.target.value;
sustain.oninput = e => envParams.sustain = +e.target.value;
release.oninput = e => envParams.release = +e.target.value;

/* ---------- Delay ---------- */
let delayNode, delayFeedback, delayMixer;
let baseDelayTime = 0.3;
let baseDelayFeedback = 0.35;
let baseDelayMix = 0.4;

delayTime.oninput = e => {
  if (!delayNode) return;
  baseDelayTime = parseFloat(e.target.value);
  delayNode.delayTime.setTargetAtTime(baseDelayTime, audioCtx.currentTime, 0.01);
};

delayFb.oninput = e => {
  if (!delayFeedback) return;
  baseDelayFeedback = parseFloat(e.target.value);
  delayFeedback.gain.setTargetAtTime(baseDelayFeedback, audioCtx.currentTime, 0.01);
};

delayMix.oninput = e => {
  if (!delayMixer) return;
  baseDelayMix = parseFloat(e.target.value);
  delayMixer.gain.setTargetAtTime(baseDelayMix, audioCtx.currentTime, 0.01);
};

filterType.onchange = e => {
  if (!filter) return;
  const now = audioCtx.currentTime;
  filterGain.gain.cancelScheduledValues(now);
  bypassGain.gain.cancelScheduledValues(now);
  if (e.target.value === "off"){
    filterGain.gain.setTargetAtTime(0, now, 0.01);
    bypassGain.gain.setTargetAtTime(1, now, 0.01);
  }else{
    filter.type = e.target.value;
    filterGain.gain.setTargetAtTime(1, now, 0.01);
    bypassGain.gain.setTargetAtTime(0, now, 0.01);
  }
};

filterFreq.oninput = e => {
  if (!filter) return;
  baseFilterFreq = +e.target.value;
  filter.frequency.setTargetAtTime(baseFilterFreq, audioCtx.currentTime, 0.01);
};

filterQ.oninput = e => {
  if (!filter) return;
  filter.Q.setTargetAtTime(+e.target.value, audioCtx.currentTime, 0.01);
};

function boostDelayFeedback() {
  if (!audioCtx || !delayMixer) return;
  const now = audioCtx.currentTime;
  delayMixer.gain.cancelScheduledValues(now);
  delayMixer.gain.setTargetAtTime(baseDelayMix, now, 0.05);
  delayMixer.gain.setTargetAtTime(0.0, now + 0.05, baseDelayTime);
}

function setupDelay() {
  delayNode = audioCtx.createDelay(2.0);
  delayNode.delayTime.value = baseDelayTime;

  delayFeedback = audioCtx.createGain();
  delayFeedback.gain.value = baseDelayFeedback;

  delayMixer = audioCtx.createGain();
  delayMixer.gain.value = baseDelayMix;

  // feedback loop
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);

  // wet → mix
  delayNode.connect(delayMixer);
  delayMixer.connect(master);

  filterGain.connect(delayNode);
  bypassGain.connect(delayNode);
}

/* ---------- Audio Init ---------- */
async function initAudio() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  master = audioCtx.createGain();
  master.gain.value = 0.25;

  filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = baseFilterFreq;
  filter.Q.value = 0.7;

  filterGain = audioCtx.createGain();
  filterGain.gain.value = 1;
  bypassGain = audioCtx.createGain();
  bypassGain.gain.value = 0;

  filter.connect(filterGain);
  filterGain.connect(master);
  bypassGain.connect(master);

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

  setupDelay();
  drawLoop();
  modLoop();
  xyLoop();

}

/* ---------- Helpers ---------- */
function yNorm() {
  return Math.min(Math.max(ball.position.y / 400, 0), 1);
}

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
    const cutoff = 300 + (1 - y) * 8000;
    filter.frequency.setTargetAtTime(cutoff, now, 0.02);
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
    filter.frequency.setValueAtTime(baseFilterFreq, now);
  }

  if (yAssign.value === "delay") {
    delayMixer.gain.cancelScheduledValues(now);
    delayMixer.gain.setValueAtTime(0.0, now);
  } else {
    delayMixer.gain.cancelScheduledValues(now);
    delayMixer.gain.setValueAtTime(baseDelayMix, now);
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
  env.connect(filter);
  env.connect(bypassGain);
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

    if (delayFeedback) delayFeedback.gain.value = baseDelayFeedback;

    randomKickBall();

  } else {
    // ===== STOP =====
    isRunning = false;
    startBtn.textContent = "START";
    startBtn.classList.toggle("active", false);

    allNotesOff();
    stopBall();
    if (delayFeedback) delayFeedback.gain.value = 0;
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

ballSize.addEventListener("input", e => {
  const size = Number(e.target.value);
  ballSizeVal.textContent = size;

  setBallRadius(size);
});
