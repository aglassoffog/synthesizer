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

let ball = createBall(WORLD_W/2, WORLD_H/2);
World.add(engine.world, [ball]);

let stageBodies = [];
const stages = {
  stage1() {
    return createStage1Bodies();
  },
  stage2() {
    return [];
  }
}

function loadStage(name) {
  stageBodies.forEach(b => World.remove(engine.world, b));
  stageBodies.length = 0;

  const newBodies = stages[name]();
  stageBodies.push(...newBodies);

  World.add(engine.world, stageBodies);

  Body.setPosition(ball, {
    x: WORLD_W / 2,
    y: WORLD_H / 2
  });
  Body.setVelocity(ball, { x: 0, y: 0 });
}
loadStage("stage1");

function handleCell(e) {
  randomKickBall();
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

worldCanvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  handleCell(e);
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
  });
});

function yNorm() {
  return Math.min(Math.max(ball.position.y / HOLE_H, 0), 1);
}

function drawBody(body) {
  const v = body.vertices;
  wctx.strokeStyle = "#555";
  //wctx.strokeStyle = "rgba(255,255,255,0.6)";
  wctx.lineWidth = 1;

  wctx.beginPath();
  wctx.moveTo(v[0].x, v[0].y);
  for (let i = 1; i < v.length; i++) {
    wctx.lineTo(v[i].x, v[i].y);
  }
  wctx.stroke();
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

  stageBodies.forEach(drawBody);
  drawMoon();

  posX.textContent = ball.position.x.toFixed(1);
  posY.textContent = ball.position.y.toFixed(1);
}

function setGravity(v){
  engine.gravity.y = v;
}
