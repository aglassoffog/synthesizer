const { Engine, Render, World, Bodies, Body, Runner } = Matter;
const WORLD_W = worldCanvas.width, WORLD_H = worldCanvas.height;
const FFT_W = fftCanvas.width + 2, FFT_H = fftCanvas.height;
const HOLE_W = WORLD_W - FFT_W, HOLE_H = WORLD_H;
const BALL_SPEED = 5;
let ballRadius = 13;
const obstacleRadius = 4;
const GRID_X = FFT_W + 51;
const GRID_W = 246;
const GRID_XC = 14;
const GRID_YC = 42;
const angleRad = -(Math.PI/6);
const gridObstacles = new Map();
const wctx = worldCanvas.getContext("2d");
const cellW = GRID_W / GRID_XC;
const cellH = HOLE_H / GRID_YC;

const engine = Engine.create();
engine.gravity.y = 0;
engine.positionIterations = 8;
engine.velocityIterations = 6;

const render = Render.create({
  canvas: worldCanvas,
  engine,
  options:{ width:WORLD_W, height:WORLD_H, wireframes:false, background:"transparent" }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

function createBall(x, y) {
  return Bodies.circle(x, y, ballRadius, {
    restitution: 1,
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0,
    // inertia: Infinity,
    render: {visible: false},
    label: "ball"
  });
}

let ball = createBall(WORLD_W - HOLE_W/2, WORLD_H/2);

const wallLeft = Bodies.rectangle(
  FFT_W - 20, (WORLD_H - FFT_H)/2 + FFT_H, 40, WORLD_H - FFT_H,
  {
    isStatic: true, label: "wall-left", render: {visible: false}
  }
);

const wallLeft2 = Bodies.rectangle(
  -20, FFT_H/2, 40, FFT_H,
  {
    isStatic: true, label: "wall-left", render: {visible: false}
  }
);

const wallRight = Bodies.rectangle(
  WORLD_W + 20, HOLE_H / 2, 40, HOLE_H * 2,
  {
    isStatic: true, label: "wall-right", render: {visible: false}
  }
);

const wallTop = Bodies.rectangle(
  FFT_W / 2, -2, FFT_W, 4,
  {
    isStatic: true, label: "wall-top", render: {visible: false}
  }
);

const wallBottom = Bodies.rectangle(
  FFT_W / 2, FFT_H + 20, FFT_W, 40,
  {
    isStatic: true, label: "wall-bottom", render: {visible: false}
  }
);

const leftSlope = Matter.Bodies.fromVertices(
  FFT_W + 67,
  (HOLE_H-FFT_H)/2 + FFT_H + 59,
  [
    { x: 0,   y: ((HOLE_H-FFT_H)/2)},
    { x: 197,  y: ((HOLE_H-FFT_H)/2)},
    { x: 0, y: -(HOLE_H-FFT_H)/2}
  ],
  {
    isStatic: true,
    label: "wall-left",
    render: {visible: false},
    restitution: 0.85
  },
  true
);

const rightSlope = Matter.Bodies.fromVertices(
  WORLD_W - 114,
  HOLE_H/2 - 100,
  [
    { x: 0,   y: (HOLE_H/2)},
    { x: 0,  y: -(HOLE_H/2)+1},
    { x: -345, y: -(HOLE_H/2)+1}
  ],
  {
    isStatic: true,
    label: "wall-right",
    render: {visible: false},
    restitution: 0.85
  },
  true
);

World.add(engine.world, [
  ball,
  wallLeft,
  wallLeft2,
  // wallRight,
  wallTop,
  wallBottom,
  leftSlope,
  rightSlope
]);

function toggleCell(gx, gy) {
  const key = `${gx},${gy}`;

  // すでに障害物がある → 削除
  if (gridObstacles.has(key)) {
    const body = gridObstacles.get(key);
    World.remove(engine.world, body);
    gridObstacles.delete(key);
    return;
  }

  const cx = (gx * cellW) + (cellW / 2) + GRID_X;
  const cy = (gy * cellH) + (cellH / 2);

  const dx = cx - (FFT_W+HOLE_W/2);
  const dy = cy - (HOLE_H/2);

  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // 新しく障害物を作る
  const body = Bodies.circle(
    dx * cos - dy * sin + HOLE_W/2 + FFT_W,
    dx * sin + dy * cos + HOLE_H/2,
    obstacleRadius,
    {
      isStatic: true, label: "obstacle",  render: { visible: false }
    }
  );

  World.add(engine.world, body);
  gridObstacles.set(key, body);
}

let isDragging = false;
let touchedCells = new Set();

worldCanvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  isDragging = true;
  touchedCells.clear();
  handleCell(e);
});

worldCanvas.addEventListener("pointermove", e => {
  if (!isDragging) return;
  handleCell(e);
});

window.addEventListener("pointerup", () => {
  isDragging = false;
});

worldCanvas.addEventListener("pointercancel", () => {
  isDragging = false;
});

function getCanvasPos(e) {
  const rect = worldCanvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (WORLD_W / rect.width);
  const cy = (e.clientY - rect.top) * (WORLD_H / rect.height);

  const dx = cx - (FFT_W+HOLE_W/2);
  const dy = cy - (HOLE_H/2);

  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);

  return {
    px: dx * cos - dy * sin + HOLE_W/2 + FFT_W,
    py: dx * sin + dy * cos + HOLE_H/2
  };
}

function handleCell(e) {
  const {px, py} = getCanvasPos(e);
  if (px < GRID_X){
    if (py < FFT_H){
      randomKickBall();
    }
    return;
  }
  if ((px < GRID_X + cellW*7) &&
      (py < 0)) {
        randomKickBall();
        return;
  }
  if (px > GRID_X + GRID_W) return;
  if (py < 0) return;
  if (py > WORLD_H - cellH*5) return;

  const gx = Math.floor((px - GRID_X) / cellW);
  const gy = Math.floor(py / cellH);
  const key = `${gx},${gy}`;

  if (touchedCells.has(key)) return;
  // touchedCells.clear();
  touchedCells.add(key);

  toggleCell(gx, gy);
}

function randomKickBall() {
  const angle = Math.random() * Math.PI * 2;
  const maxSpin = 0.1;
  const spin = (Math.random() * 2 - 1) * maxSpin;

  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setAngularVelocity(ball, spin);

  Body.setVelocity(ball, {
    x: Math.cos(angle) * BALL_SPEED,
    y: Math.sin(angle) * BALL_SPEED
  });
}

function setBallRadius(newRadius) {
  ballRadius = newRadius;
  const { x, y } = ball.position;
  const v = ball.velocity;
  const a = ball.angularVelocity;

  World.remove(engine.world, ball);
  ball = createBall(x, y);
  World.add(engine.world, ball);

  Body.setVelocity(ball, {
    x: v.x,
    y: v.y
  });
  Body.setAngularVelocity(ball, a);
}

function stopBall() {
  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setAngularVelocity(ball, 0);
}

Matter.Events.on(engine, "afterUpdate", () => {
  const { x, y } = ball.position;

  if (y < -ballRadius) {
    Body.setPosition(ball, {
      x: ((x - FFT_W) / 133 * 281) + FFT_W + 197,
      y: WORLD_H + ballRadius
    });
  }

  if (y > WORLD_H + ballRadius) {
    Body.setPosition(ball, {
      x: Math.min(555 - ballRadius*2, ((x - FFT_W - 197) / 281 * 133) + FFT_W),
      y: -ballRadius
    });
  }
});

Matter.Events.on(engine, "collisionStart", event => {
  event.pairs.forEach(pair => {
    const a = pair.bodyA;
    const b = pair.bodyB;

    if (
      (a.label === "ball" && b.label.startsWith("wall")) ||
      (b.label === "ball" && a.label.startsWith("wall"))
    ){
      const wall = a.label === "ball" ? b : a;
      onSideWallCollision(wall);
    }
    else if (b.label === "obstacle" || a.label === "obstacle"){
      Body.setVelocity(pair.bodyA, {
        x: pair.bodyA.velocity.x * 0.5,
        y: pair.bodyA.velocity.y * 0.5
      });
    }
  });
});

function yNorm() {
  return Math.min(Math.max(ball.position.y / HOLE_H, 0), 1);
}

function drawWall() {
  wctx.strokeStyle = "#555";
  //wctx.strokeStyle = "rgba(255,255,255,0.6)";
  wctx.lineWidth = 1;

  wctx.beginPath();
  wctx.moveTo(FFT_W, FFT_H);
  wctx.lineTo(FFT_W+197, WORLD_H);
  wctx.stroke();

  wctx.beginPath();
  wctx.moveTo(WORLD_W-345, 0);
  wctx.lineTo(WORLD_W, WORLD_H);
  wctx.stroke();
}

function drawGrid() {
  //world座標
  wctx.save();
  wctx.translate((WORLD_W - HOLE_W) + HOLE_W/2, HOLE_H/2);
  wctx.rotate(angleRad);
  wctx.translate(-(HOLE_W/2)-FFT_W, -(HOLE_H/2));

  wctx.strokeStyle = "rgba(255,255,255,0.2)";
  wctx.lineWidth = 1;

  for (let x = 0; x <= GRID_XC; x++) {
    // 縦線
    wctx.beginPath();
    wctx.moveTo(x * cellW + GRID_X, 0);
    wctx.lineTo(x * cellW + GRID_X, HOLE_H - cellH*5);
    wctx.stroke();
  }

  for (let y = 0; y < GRID_YC-4; y++) {
    // 横線
    wctx.beginPath();
    wctx.moveTo(GRID_X, y * cellH);
    wctx.lineTo(GRID_X + GRID_W, y * cellH);
    wctx.stroke();
  }

  wctx.restore();
}

function drawObstacles(){
  // world座標
  gridObstacles.forEach(v => {
    wctx.beginPath();
    wctx.arc(v.position.x, v.position.y, obstacleRadius, 0, Math.PI * 2);
    wctx.fillStyle = "#0ff";
    wctx.closePath();
    wctx.fill();
  });
}

function drawMoon(){
  wctx.save();
  wctx.translate(ball.position.x, ball.position.y);
  wctx.rotate(ball.angle);

  const moonGrad = wctx.createRadialGradient(
    -ballRadius * 0.3, -ballRadius * 0.3, ballRadius * 0.2,
    0, 0, ballRadius
  );

  moonGrad.addColorStop(0, "rgba(255, 253, 231, 1)");
  // moonGrad.addColorStop(0, "rgba(255,255,210,1)");
  // moonGrad.addColorStop(0, "rgba(255, 255, 200, 1)");

  // moonGrad.addColorStop(1, "rgba(230,220,140,1)");
  // moonGrad.addColorStop(1, "rgba(224, 211, 109, 1)");
  moonGrad.addColorStop(1, "rgba(238, 224, 119, 1)");
  // moonGrad.addColorStop(1, "rgba(255,255,180,1)");
  // moonGrad.addColorStop(1, "rgba(255, 255, 102, 1)");
  // moonGrad.addColorStop(1, "rgba(255, 255, 0, 1)");

  wctx.fillStyle = moonGrad;
  wctx.beginPath();
  wctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
  wctx.fill();

  // wctx.fillStyle = "rgba(200,190,120,0.35)";
  wctx.fillStyle = "rgba(170,160,100,0.45)";
  [
    // 内側
    { x:-0.35, y:-0.25, s:0.14 },
    { x: 0.25, y: 0.30, s:0.10 },
    { x:-0.10, y: 0.45, s:0.08 },

    // 中
    { x:  0.42, y: -0.20, s: 0.04 },
    { x:  0.10, y: -0.48, s: 0.05 },
    { x:  0.05, y:  0.18, s: 0.035 },

    // ほぼ縁
    // { x: 0.90, y: 0.05, s:0.11 },
    { x:-0.50, y: 0.80, s:0.03 },
    // { x: 0.05, y: 0.90, s:0.065 },

  ].forEach(c => {
    wctx.beginPath();
    wctx.arc(ballRadius * c.x, ballRadius * c.y, ballRadius * c.s, 0, Math.PI * 2);
    wctx.fill();
  });

  wctx.restore();
}

function drawPhysics(){
  requestAnimationFrame(drawPhysics);

  wctx.clearRect(0, 0, WORLD_W, WORLD_H);

  drawWall();
  drawGrid();
  drawObstacles();
  drawMoon();

  posX.textContent = ball.position.x.toFixed(1);
  posY.textContent = ball.position.y.toFixed(1);
}

function setGravity(v){
  engine.gravity.y = v;
}
