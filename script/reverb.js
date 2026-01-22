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

function setupReverb(){
  reverb = createReverb();

  reverb.convolver.buffer = generateHallImpulse(baseReverbDecay, 2);

  reverb.tone.type = "lowpass";
  reverb.wetGain.gain.value = baseReverbSend;
  reverb.tone.frequency.value = baseReverbTone;

  // 出力
  reverb.output.connect(master);
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
