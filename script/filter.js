function createFilter(){
  const input = audioCtx.createGain();
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  const tone = audioCtx.createBiquadFilter();
  const output = audioCtx.createGain();

  input.connect(dryGain);
  input.connect(tone);

  tone.connect(wetGain);

  dryGain.connect(output);
  wetGain.connect(output);

  return {
    input,
    dryGain,
    tone,
    wetGain,
    output
  }
}

function setupFilter(){
  filter = createFilter();

  filter.tone.type = baseFilterType;
  filter.tone.frequency.value = baseFilterFreq;
  filter.tone.Q.value = baseFilterQ;

  filter.wetGain.gain.value = 1;
  filter.dryGain.gain.value = 0;

  filter.output.connect(reverb.input);
}

function setFilterType(v){
  const now = audioCtx.currentTime;
  filter.wetGain.gain.cancelScheduledValues(now);
  filter.dryGain.gain.cancelScheduledValues(now);
  if (v === "off"){
    filter.wetGain.gain.setTargetAtTime(0, now, 0.01);
    filter.dryGain.gain.setTargetAtTime(1, now, 0.01);
  }else{
    filter.tone.type = v;
    filter.wetGain.gain.setTargetAtTime(1, now, 0.01);
    filter.dryGain.gain.setTargetAtTime(0, now, 0.01);
  }
}

function setFilterFreq(v){
  const now = audioCtx.currentTime;
  filter.tone.frequency.cancelScheduledValues(now);
  filter.tone.frequency.setTargetAtTime(
    v,
    now,
    0.01
  );
}

function setFilterQ(v){
  filter.tone.Q.setTargetAtTime(
    v,
    audioCtx.currentTime,
    0.01
  );
}