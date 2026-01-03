let audioCtx = null;
let analyser = null;
let master = null;
let lfo = null;
let lfoGain = null;

let voices = new Map();
let envOn = true;
let powerOn = false;

const powerBtn = document.getElementById("powerBtn");
const envBtn = document.getElementById("envBtn");

powerBtn.onclick = initAudio;
envBtn.onclick = ()=>{
  envOn = !envOn;
  envBtn.textContent = envOn ? "ON" : "OFF";
};

function getWaveform(){
  const radios = document.getElementsByName("waveform");
  for(let i=0;i<radios.length;i++) if(radios[i].checked) return radios[i].value;
  return "sine";
}

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
  powerOn = true; powerBtn.textContent = "ON";

  drawLoop();
  modLoop();
}

// Polyphonic
const keyMap = { a:261.63,b:293.66,c:329.63,d:349.23,e:392,f:440,g:493.88,h:523.25 };
window.addEventListener("keydown", e=>{
  if(!powerOn || e.repeat) return;
  const k = e.key.toLowerCase();
  if(!keyMap[k]) return;
  kickBall();
  noteOn(k,keyMap[k]);
});
window.addEventListener("keyup", e=>{
  if(!powerOn) return;
  noteOff(e.key.toLowerCase());
});

// Y modulation
function yNorm(){ return Math.min(Math.max(ball.position.y/400,0),1); }
function modLoop(){
  if(!audioCtx) return;
  voices.forEach(v=>{
    const y = yNorm();
    if(document.getElementById("yAssign").value==="pitch"){
      v.osc.frequency.setValueAtTime(v.baseFreq*Math.pow(2,(0.5-y)), audioCtx.currentTime);
      lfoGain.gain.value=0;
    } else if(document.getElementById("yAssign").value==="vibrato"){
      lfoGain.gain.value = y*20;
    } else{
      v.osc.frequency.setValueAtTime(v.baseFreq, audioCtx.currentTime);
      lfoGain.gain.value=0;
    }
  });
  requestAnimationFrame(modLoop);
}

// noteOn / noteOff
function noteOn(key,freq){
  if(voices.has(key)) return;
  const osc = audioCtx.createOscillator();
  osc.type = getWaveform();
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
    const level = document.getElementById("yAssign").value==="env" ? 0.2+y*0.8 : 1;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now+0.01);
  }

  voices.set(key,{osc,gain,baseFreq:freq});
}

function noteOff(key){
  const v = voices.get(key); if(!v) return;
  const now = audioCtx.currentTime;
  if(envOn){
    const y=yNorm();
    const rel=document.getElementById("yAssign").value==="env" ? 0.05+y*1.2 : 0.1;
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now+rel);
    v.osc.stop(now+rel+0.02);
  } else v.osc.stop();
  voices.delete(key);
}
