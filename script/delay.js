function createDelay(){
  const input = audioCtx.createGain();
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  const node = audioCtx.createDelay(2.0);
  const feedback = audioCtx.createGain();
  const output = audioCtx.createGain();

  input.connect(dryGain);
  input.connect(node);

  node.connect(feedback);
  feedback.connect(node);
  node.connect(wetGain);

  dryGain.connect(output); 
  wetGain.connect(output);

  return {
    input,
    dryGain,
    node,
    feedback,
    wetGain,
    output
  }
}

function setupDelay(){
  delay = createDelay();

  delay.node.delayTime.value = baseDelayTime;
  delay.feedback.gain.value = baseDelayFeedback;
  delay.wetGain.gain.value = baseDelaySend;

  delay.output.connect(master);
}

function setDelayTime(v){
  delay.node.delayTime.setTargetAtTime(v, audioCtx.currentTime, 0.01);
}

function setDelayFeedback(v){
  delay.feedback.gain.setTargetAtTime(v, audioCtx.currentTime, 0.01);
}

function setDelaySend(v){
  const now = audioCtx.currentTime;
  delay.wetGain.gain.cancelScheduledValues(now);
  delay.wetGain.gain.setTargetAtTime(v, now, 0.01);
}

function boostDelayFeedback() {
  const now = audioCtx.currentTime;
  delay.wetGain.gain.cancelScheduledValues(now);
  delay.wetGain.gain.setTargetAtTime(baseDelaySend, now, 0.01);
  delay.wetGain.gain.setTargetAtTime(0.0, now + 0.01, baseDelayTime);
}
