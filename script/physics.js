const { Engine, Render, World, Bodies, Body, Runner } = Matter;
const WORLD_W = worldCanvas.width, WORLD_H = worldCanvas.height;
let ballRadius = 13;
const balls = [];
const wctx = worldCanvas.getContext("2d");
const rctx = reflectCanvas.getContext("2d");
const engine = Engine.create();
engine.gravity.y = 0;
Runner.run(Runner.create(), engine);

let drawStage;
const draws = {
  stage1: drawStage1,
  stage2: drawStage2,
  stage3: drawStage3,
  stage4: drawStage4,
  stage5: drawStage5,
  stage6: drawStage6,
  stage7: drawStage7,
  stage8: drawStage8
}

function loadStage(name) {
  drawStage = draws[name];
}

World.add(engine.world, [
  Bodies.rectangle(
    -20, WORLD_H/2, 40, WORLD_H,
    {
      isStatic: true, label: "wall-left", render: {visible: false}
    }
  ),
  Bodies.rectangle(
    WORLD_W + 20, WORLD_H/2, 40, WORLD_H,
    {
      isStatic: true, label: "wall-right", render: {visible: false}
    }
  ),
  Bodies.rectangle(
    WORLD_W/3*2, -20, WORLD_W/3*2, 40,
    {
      isStatic: true, label: "wall-top", render: {visible: false}
    }
  ),
  Bodies.rectangle(
    WORLD_W/3, WORLD_H + 20, WORLD_W/3*2, 40,
    {
      isStatic: true, label: "wall-bottom", render: {visible: false}
    }
  )
]);

function setBallCount(targetCount) {
  const current = balls.length;

  // 増やす
  if (targetCount > current) {
    for (let i = 0; i < targetCount - current; i++) {
      const ball = createBall(WORLD_W/2, WORLD_H/2);
      balls.push(ball);
      kickBall(ball, 0);
    }
  }

  // 減らす
  if (targetCount < current) {
    for (let i = 0; i < current - targetCount; i++) {
      const ball = balls.pop();
      World.remove(engine.world, ball);
    }
  }
}

function randomKickBall(way) {
  balls.forEach(v => kickBall(v, way));
}

function setBallRadius(newRadius) {
  ballRadius = newRadius;
  balls.forEach((ball, i) => changeRadius(ball, i));
}

function stopBalls() {
  balls.forEach(stopBall);
}

function handleCell(e) {
  const rect = worldCanvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (WORLD_W / rect.width);
  const cy = (e.clientY - rect.top) * (WORLD_H / rect.height);

  if (cx < WORLD_W/2) {
    randomKickBall(1);
  } else {
    randomKickBall(2);
  }
}

worldCanvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  handleCell(e);
});

Matter.Events.on(engine, "afterUpdate", () => {
  balls.forEach(warpBall);
});

Matter.Events.on(engine, "collisionStart", event => {
  event.pairs.forEach(pair => {
    const a = pair.bodyA;
    const b = pair.bodyB;

    if (a.label === "ball" && b.label === "ball"){
      onBallCollision();
    }
    else if (a.label === "ball" && b.label.startsWith("wall")){
      onSideWallCollision(b);
      if (b.label === "wall-bottom"){
        addRipple(a.position.x + 75,0);
      }
    }
    else if (b.label === "ball" && a.label.startsWith("wall")){
      onSideWallCollision(a);
      if (a.label === "wall-bottom"){
        addRipple(b.position.x + 75,0);
      }
    }
  });
});

function yNorm() {
  return 1 - Math.min(Math.max(balls[0].position.y / WORLD_H, 0), 1);
}

function xNorm() {
  return Math.min(Math.max(balls[0].position.x / WORLD_W, 0), 1);
}

function drawFrame(){
  wctx.strokeStyle = "#aaa";
  wctx.lineWidth = 0.5;

  wctx.beginPath();
  wctx.moveTo(WORLD_W/3*1, 0);
  wctx.lineTo(WORLD_W, 0);
  wctx.lineTo(WORLD_W, WORLD_H);
  wctx.stroke();

  wctx.moveTo(0, 0);
  wctx.lineTo(0, WORLD_H);
  wctx.lineTo(WORLD_W/3*2, WORLD_H);
  wctx.stroke();
}

function drawMoon(ball){
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

function drawBall(ball) {
  wctx.save();
  wctx.translate(ball.position.x, ball.position.y);
  wctx.rotate(ball.angle);

  wctx.fillStyle = "#7aa2ff";
  wctx.beginPath();
  wctx.arc(0, 0, ball.circleRadius, 0, Math.PI * 2);
  wctx.fill();

  wctx.restore();
}

function drawPhysics() {
  wctx.clearRect(0, 0, WORLD_W, WORLD_H);
  drawFrame();
  drawStage();

  if (stageSelect.value !== "stage5") {
    drawMoon(balls[0]);
    balls.slice(1).forEach(drawBall);
  }

  drawPerspectiveReflection();
  drawFadeReflection();
  if (stageSelect.value !== "stage5") {
    drawRipples();
  }

  posX.textContent = balls[0].position.x.toFixed(1);
  posY.textContent = balls[0].position.y.toFixed(1);

  requestAnimationFrame(drawPhysics);
}

function setGravity(v) {
  engine.gravity.y = v;
}

function initPhysics() {
  const ball = createBall(WORLD_W/2, WORLD_H/2);
  balls.push(ball);

  loadStage("stage1");
  drawPhysics();
}