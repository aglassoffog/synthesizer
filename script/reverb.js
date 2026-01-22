function generateImpulse(duration = 3, decay = 2) {
  const rate = audioCtx.sampleRate;
  const length = rate * duration;
  const impulse = audioCtx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function generateHallImpulse(duration = 4, decay = 3) {
  duration = Math.max(0.1, Number(duration) || 0.1);

  const rate = audioCtx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = audioCtx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);

    for (let i = 0; i < length; i++) {
      const t = i / length;

      // 後半が強い Hall 用エンベロープ
      const env = Math.pow(1 - t, decay) * (0.3 + 0.7 * Math.sin(t * Math.PI));

      // 高域が徐々に減る
      const damping = 1 - t * 0.6;

      data[i] = (Math.random() * 2 - 1) * env * damping;
    }
  }

  return impulse;
}

function createReverb(){
  const input = audioCtx.createGain();
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  const convolver = audioCtx.createConvolver();
  const tone = audioCtx.createBiquadFilter();
  const output = audioCtx.createGain();


  input.connect(dryGain);
  input.connect(convolver);

  convolver.connect(tone);
  tone.connect(wetGain);

  dryGain.connect(output);
  wetGain.connect(output);

  return {
    input,
    dryGain,
    convolver,
    tone,
    wetGain,
    output
  };
}

function createCosmicReverb(){
  const input = audioCtx.createGain();
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  const convolver = audioCtx.createConvolver();
  const shimmerDelay = audioCtx.createDelay();
  const shimmerGain = audioCtx.createGain();
  const tone = audioCtx.createBiquadFilter();
  const output = audioCtx.createGain();

  shimmerDelay.delayTime.value = 0.01;
  shimmerGain.gain.value = 0.6;

  input.connect(dryGain);
  input.connect(convolver);

  convolver.connect(tone);
  tone.connect(shimmerDelay);
  shimmerDelay.connect(shimmerGain);
  shimmerGain.connect(convolver);
  convolver.connect(wetGain);

  dryGain.connect(output);
  wetGain.connect(output);

  return {
    input,
    dryGain,
    convolver,
    tone,
    wetGain,
    output
  };

}

function createNebulaReverb() {
  const input = audioCtx.createGain();
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  const preDelay = audioCtx.createDelay(1.0);
  const convolver = audioCtx.createConvolver();
  const tone = audioCtx.createBiquadFilter();
  const output = audioCtx.createGain();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();

  // 初期値
  preDelay.delayTime.value = 0.06;
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.02;

  input.connect(dryGain);
  input.connect(preDelay);

  lfo.connect(lfoGain);
  lfoGain.connect(preDelay.delayTime);
  lfo.start();

  preDelay.connect(convolver);
  convolver.connect(tone);
  tone.connect(wetGain);

  dryGain.connect(output);
  wetGain.connect(output);

  return {
    input,
    wetGain,
    convolver,
    tone,
    lfo,
    lfoGain,
    preDelay,
    output
  };
}


function setupReverb(){
  reverb = createReverb();
  // reverb = createCosmicReverb();
  // reverb = createNebulaReverb();

  reverb.convolver.buffer = generateHallImpulse(baseReverbDecay, 2);
  reverb.tone.type = "lowpass";
  reverb.tone.frequency.value = baseReverbTone;
  // reverb.tone.type = "highpass";
  // reverb.tone.frequency.value = 600;

  reverb.wetGain.gain.value = baseReverbSend;

  // 出力
  reverb.output.connect(delay.input);
}

function setReverbDecay(v) {
  // v: 0.5〜5.0
  reverb.convolver.buffer = generateImpulse(v, 3);
}

function setReverbTone(freq) {
  // 800〜8000
  reverb.tone.frequency.setTargetAtTime(
    freq,
    audioCtx.currentTime,
    0.3
  );
}

function setReverbSend(v) {
  // v: 0.0〜1.0
  reverb.wetGain.gain.value = v;
}
