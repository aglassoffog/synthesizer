// Canvasコンテキスト
const sctx = scope.getContext("2d");
const fctx = fft.getContext("2d");
const xyCtx = xy.getContext("2d");

// データ配列
let timeData = new Float32Array(2048);
let freqData = new Uint8Array(1024);
let xyData = new Uint8Array(1024);
let xyOffset = 32;

const triggerLevel = 0;
const samplesToDraw = 1024;

function findTriggerIndex(data){
  for(let i=1;i<data.length;i++){
    if(data[i-1]<triggerLevel && data[i]>=triggerLevel) return i;
  }
  return 0;
}

/* ======= Scope ======= */
function drawGrid(){
  sctx.strokeStyle="#033"; sctx.lineWidth=1;
  const divX=10, divY=4;
  for(let i=1;i<divX;i++){
    const x=(scope.width/divX)*i;
    sctx.beginPath(); sctx.moveTo(x,0); sctx.lineTo(x,scope.height); sctx.stroke();
  }
  for(let i=1;i<divY;i++){
    const y=(scope.height/divY)*i;
    sctx.beginPath(); sctx.moveTo(0,y); sctx.lineTo(scope.width,y); sctx.stroke();
  }
  sctx.strokeStyle="#055";
  sctx.beginPath(); sctx.moveTo(0,scope.height/2); sctx.lineTo(scope.width,scope.height/2); sctx.stroke();
}

/* ======= XYリサージュ ======= */
function drawXY(){
  if(!analyser) return;
  analyser.getByteTimeDomainData(xyData);

  xyCtx.fillStyle = "rgba(0,0,0,0.25)";
  xyCtx.fillRect(0,0,xy.width,xy.height);

  xyCtx.strokeStyle="#033"; xyCtx.lineWidth=1;
  for(let i=1;i<4;i++){
    const p=(xy.width/4)*i;
    xyCtx.beginPath(); xyCtx.moveTo(p,0); xyCtx.lineTo(p,xy.height); xyCtx.stroke();
    xyCtx.beginPath(); xyCtx.moveTo(0,p); xyCtx.lineTo(xy.width,p); xyCtx.stroke();
  }

  xyCtx.strokeStyle="#055";
  xyCtx.beginPath(); xyCtx.moveTo(xy.width/2,0); xyCtx.lineTo(xy.width/2,xy.height); xyCtx.stroke();
  xyCtx.beginPath(); xyCtx.moveTo(0,xy.height/2); xyCtx.lineTo(xy.width,xy.height/2); xyCtx.stroke();

  xyCtx.strokeStyle="#00ff88"; xyCtx.lineWidth=1.5; xyCtx.beginPath();
  for(let i=0;i<xyData.length-xyOffset;i++){
    const xVal=(xyData[i]-128)/128;
    const yVal=(xyData[i+xyOffset]-128)/128;
    const x=xy.width/2 + xVal*xy.width/2;
    const y=xy.height/2 - yVal*xy.height/2;
    i===0 ? xyCtx.moveTo(x,y) : xyCtx.lineTo(x,y);
  }
  xyCtx.stroke();
}

/* ======= メイン描画ループ ======= */
function drawLoop(){
  requestAnimationFrame(drawLoop);
  if(!audioCtx) return;

  // Scope
  analyser.getFloatTimeDomainData(timeData);
  const start = findTriggerIndex(timeData);
  sctx.fillStyle="rgba(0,0,0,0.25)"; sctx.fillRect(0,0,scope.width,scope.height);
  drawGrid();
  sctx.strokeStyle="#0f0"; sctx.lineWidth=2; sctx.beginPath();
  for(let i=0;i<samplesToDraw;i++){
    const idx=(start+i)%timeData.length;
    const v=timeData[idx];
    const x=(i/samplesToDraw)*scope.width;
    const y=scope.height/2 - v*scope.height/2;
    i===0 ? sctx.moveTo(x,y) : sctx.lineTo(x,y);
  }
  sctx.stroke();

  // FFT
  analyser.getByteFrequencyData(freqData);
  fctx.fillStyle="black"; fctx.fillRect(0,0,fft.width,fft.height);
  const barWidth = fft.width / freqData.length;
  for(let i=0;i<freqData.length;i++){
    const h=(freqData[i]/255)*(fft.height-20);
    fctx.fillStyle="#08f";
    fctx.fillRect(i*barWidth, fft.height-h-20, barWidth,h);
  }

  // XY
  drawXY();
}
