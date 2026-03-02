let S8_t = 0; // 進行（0〜1）
let S8_rotation = 0;
const S8_W = WORLD_W
const S8_H = WORLD_H/4;
const STAR_COUNT = 20;

const star = Array.from({ length: STAR_COUNT }, createStar);
function createStar() {
  return {
    x: Math.random() * S8_W,
    y: Math.random() * S8_H,
    r: 0.5 + Math.random(),
    life: 50 * Math.random()
  }
}

function drawStage8(){

  drawSky(S8_t);
  drawStar(S8_t);

  wctx.save();

  wctx.translate(WORLD_W / 2, WORLD_H);
  wctx.rotate(S8_rotation);
  wctx.translate(-WORLD_W / 2, -WORLD_H);

  drawSun();

  wctx.restore();

  if (S8_t < 1) {
    S8_t += 0.0002;
  } else {
    S8_t = 0;
  }
  S8_rotation = S8_t * Math.PI*2;

}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t)
  ];
}

function toCSS(c) {
  return `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
}

// 空のプリセット（上→下）
const skyStops = [
  { t: 0.0, colors: [[10,20,60],[20,40,120]] },      // 夜
  { t: 0.03, colors: [[255,140,100],[255,220,140]] },// 朝焼け
  { t: 0.06, colors: [[80,180,255],[255,255,255]] }, // 昼
  { t: 0.5, colors: [[80,180,255],[255,255,255]] },
  { t: 0.55, colors: [[255,40,40],[255,180,120]] },  // 夕焼け
  { t: 0.6, colors: [[0,0,0],[20,40,120]] },         // 夜
  { t: 1.0, colors: [[0,0,0],[20,40,120]] }
];

function getSkyColors(time) {
  for (let i = 0; i < skyStops.length - 1; i++) {
    const a = skyStops[i];
    const b = skyStops[i + 1];
    if (time >= a.t && time <= b.t) {
      const localT = (time - a.t) / (b.t - a.t);
      return [
        lerpColor(a.colors[0], b.colors[0], localT),
        lerpColor(a.colors[1], b.colors[1], localT)
      ];
    }
  }
  return skyStops[0].colors;
}

function drawSky(time) {
  const [top, bottom] = getSkyColors(time);

  const grad = wctx.createLinearGradient(0, 0, 0, WORLD_H);
  grad.addColorStop(0, toCSS(top));
  grad.addColorStop(1, toCSS(bottom));

  wctx.fillStyle = grad;
  wctx.fillRect(0, 0, WORLD_W, WORLD_H);
}

function drawSun() {
  const x = WORLD_W/2 - 260;
  const y = WORLD_H/2 + 200;

  const sun = wctx.createRadialGradient( x, y, 10, x, y, 40);
  sun.addColorStop(0, "rgba(255,255,200,1)");
  sun.addColorStop(1, "rgba(255,255,200,0)");

  wctx.fillStyle = sun;
  wctx.beginPath();
  wctx.arc(x, y, 40, 0, Math.PI*2);
  wctx.fill();
}

function drawStar(time){
  if (time > 0.7) {
    wctx.fillStyle = "white";

    for (let s of star) {
      wctx.beginPath();
      wctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      wctx.fill();

      s.life *= 0.99;

      if (s.life < 0.001) {
        Object.assign(s, createStar());
      }
    }

  }
}
