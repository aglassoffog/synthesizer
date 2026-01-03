/* ================= Audio & UI ================= */
let audioCtx = null;
let master = null;
let analyser = null;
let lfo = null;
let lfoGain = null;
let powerOn = false;
let envOn = true;
let voices = new Map();

/* Envelope ON/OFF */
envBtn.onclick = () => {
  envOn = !envOn;
  envBtn.textContent = envOn ? "ON" : "OFF";
};

/* Audio 初期化 */
async function initAudio(){
  if(audioCtx) return;

  audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  master = audioCtx.createGain();
  master.gain.value = 0.25;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  master.connect(analyser);
  analyser.connect(audioCtx.destination);

  // LFO
  lfo = audioCtx.createOscillator();
  lfo.frequency.value = 5;
  lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0;
  lfo.connect(lfoGain);
  lfo.start();

  // Audio unlock
  const unlock = audioCtx.createOscillator();
  const unlockGain = audioCtx.createGain();
  unlockGain.gain.value = 0;
  unlock.connect(unlockGain);
  unlockGain.connect(audioCtx.destination);
  unlock.start();
  unlock.stop(audioCtx.currentTime + 0.01);

  await audioCtx.resume();

  powerOn = true;
  powerBtn.textContent = "ON";

  drawLoop(); // 描画開始
}

/* POWER ボタン */
powerBtn.onclick = initAudio;

/* Gravity スライダー */
gravity.oninput = e => {
  engine.gravity.y = +e.target.value;
  gravityVal.textContent = (+e.target.value).toFixed(2);
};

/* XY正規化 */
function yNorm(){ return Math.min(Math.max(ball.position.y / 400, 0), 1); }

/* ノート ON/OFF */
function noteOn(key,freq){
  if(!powerOn || voices.has(key)) return;

  const osc = audioCtx.createOscillator();
  osc.type = waveform.value;
  osc.frequency.value = freq;

  const gain = audioCtx.createGain();
  gain.gain.value = envOn ? 0 : 1;

  osc.connect(gain);
  gain.connect(master);
  lfoGain.connect(osc.frequency);

  osc.start();

  if(envOn){
    const now = audioCtx.currentTime;
    const y = yNorm();
    const level = (yAssign.value==="env") ? (0.2 + y*0.8) : 1;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now+0.01);
  }

  voices.set(key,{osc,gain,baseFreq:freq});
}

function noteOff(key){
  const v = voices.get(key);
  if(!v) return;

  const now = audioCtx.currentTime;
  if(envOn){
    const y = yNorm();
    const rel = (yAssign.value==="env") ? (0.05 + y*1.2) : 0.1;
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now+rel);
    v.osc.stop(now + rel + 0.02);
  } else {
    v.osc.stop();
  }

  voices.delete(key);
}

/* Yモジュレーション */
function modLoop(){
  if(!audioCtx) return;

  voices.forEach(v => {
    const y = yNorm();
    if(yAssign.value==="pitch"){
      v.osc.frequency.setValueAtTime(v.baseFreq * Math.pow(2,(0.5 - y)), audioCtx.currentTime);
      lfoGain.gain.value = 0;
    } else if(yAssign.value==="vibrato"){
      lfoGain.gain.value = y*20;
    } else {
      v.osc.frequency.setValueAtTime(v.baseFreq, audioCtx.currentTime);
      lfoGain.gain.value = 0;
    }
  });

  requestAnimationFrame(modLoop);
}
modLoop(); // Yモジュレーション開始

/* キーボード */
const keyMap = { a:261.63,b:293.66,c:329.63,d:349.23,
                 e:392,f:440,g:493.88,h:523.25 };

window.addEventListener("keydown", e => {
  if(e.repeat) return;
  if(!powerOn) return;
  const k = e.key.toLowerCase();
  if(!keyMap[k]) return;
  kickBall();
  noteOn(k,keyMap[k]);
});

window.addEventListener("keyup", e => {
  if(!powerOn) return;
  noteOff(e.key.toLowerCase());
});

/* XY表示更新 */
(function xyLoop(){
  posX.textContent = ball.position.x.toFixed(1);
  posY.textContent = ball.position.y.toFixed(1);
  requestAnimationFrame(xyLoop);
})();
