// Canvasコンテキスト
const sctx = scope.getContext("2d");
const fctx = fftCanvas.getContext("2d");
const xyCtx = xy.getContext("2d");

// データ配列
let timeData = new Float32Array(2048);
let freqData = new Uint8Array(1024);
let xyData = new Float32Array(2048);
let xyOffset = 64;

const triggerLevel = 0;
const samplesToDraw = 280;

function findTriggerIndex(data){
  let over = false;
  for(let i=1;i<data.length;i++){
    if(data[i-1] < -0.01){
      over = true;
    }
    if(data[i-1]<triggerLevel && data[i]>triggerLevel){
      if (over) {
        return i;
      }
    }
  }
  return 0;
}

/* ======= メイン描画ループ ======= */
function drawLoop(){
  requestAnimationFrame(drawLoop);
  if(!audioCtx) return;
  if(!analyser) return;

  // Scope
  analyser.getFloatTimeDomainData(timeData);
  const start = findTriggerIndex(timeData);
  sctx.clearRect(0,0,scope.width,scope.height);
  sctx.strokeStyle="gray";
  sctx.lineWidth=2;
  sctx.beginPath();
  if(start !== 0) {
    for(let i=0;i<samplesToDraw;i++){
      const idx=(start+i)%timeData.length;
      const v=timeData[idx];
      const x=(i/samplesToDraw)*scope.width;
      const y=scope.height/2 - v*scope.height/2;
      i===0 ? sctx.moveTo(x,y) : sctx.lineTo(x,y);
    }
    sctx.stroke();
  }

  // FFT
  const fftHeight = fftCanvas.height;
  analyser.getByteFrequencyData(freqData);
  fctx.clearRect(0,0,fftCanvas.width,fftCanvas.height);
  const barWidth = fftCanvas.width / freqData.length;
  for(let i=0;i<freqData.length;i++){
    const h=(freqData[i]/255)*(fftHeight-10);
    fctx.fillStyle="#08f";
    fctx.fillRect(i*barWidth, fftHeight-h-10, barWidth,h);
  }

  // XY
  analyser.getFloatTimeDomainData(xyData);
  xyCtx.clearRect(0,0,xy.width,xy.height);
  xyCtx.strokeStyle="#00ff88";
  xyCtx.lineWidth = 2;
  xyCtx.beginPath();
  for(let i=0;i<xyData.length-xyOffset;i++){
    const xVal=xyData[i];
    const yVal=xyData[i+xyOffset];
    if (xVal > 0.01 || xVal < -0.01) {
      const x=xy.width/2 + xVal*xy.width/2;
      const y=xy.height/2 - yVal*xy.height/2;
      i===0 ? xyCtx.moveTo(x,y) : xyCtx.lineTo(x,y);
    }
  }
  xyCtx.stroke();
}

