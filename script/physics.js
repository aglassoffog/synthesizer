const { Engine, Render, World, Bodies, Body, Runner } = Matter;
const WORLD_W = worldCanvas.width, WORLD_H = worldCanvas.height;
const HOLE_W = 250, HOLE_H = 650;
const FFT_W = WORLD_W - HOLE_W, FFT_H = 220;
const BALL_SPEED = 5;
let ballRadius = 13;
const obstacleRadius = 4;
const GRID_X = 12;
const GRID_Y = 34;
const gridObstacles = new Map();

const wctx = worldCanvas.getContext("2d");

const cellW = HOLE_W / GRID_X;
const cellH = HOLE_H / GRID_Y;

const engine = Engine.create();
engine.gravity.y = 0;
engine.positionIterations = 8;
engine.velocityIterations = 6;

function drawGrid() {
  wctx.strokeStyle = "rgba(255,255,255,0.08)";
  wctx.lineWidth = 1;

  for (let x = 0; x < GRID_X; x++) {
    wctx.beginPath();
    wctx.moveTo(x * cellW + FFT_W, 0);
    wctx.lineTo(x * cellW + FFT_W, HOLE_H);
    wctx.stroke();
  }

  for (let y = 0; y <= GRID_Y; y++) {
    wctx.beginPath();
    wctx.moveTo(FFT_W, y * cellH);
    wctx.lineTo(WORLD_W, y * cellH);
    wctx.stroke();
  }
}

const render = Render.create({
  canvas: worldCanvas,
  engine,
  options:{ width:WORLD_W, height:WORLD_H, wireframes:false, background:"transparent" }
});

Matter.Events.on(render, "afterRender", drawGrid);
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

function createBall(x, y) {
  return Bodies.circle(x, y, ballRadius, {
    restitution: 1,
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0,
    inertia: Infinity,
    render: {
      fillStyle: "#ffff66",
      strokeStyle: "#fffde7",
      lineWidth: 1
    },
    label: "ball"
  });
}

let ball = createBall(WORLD_W - HOLE_W/2, WORLD_H/2);

const wallLeft = Bodies.rectangle(
  FFT_W - 20, -8, 40, (WORLD_H - FFT_H) * 2,
  {
    isStatic: true,
    label: "wall-left",
    render: {
        visible: false
    }
  }
);

const wallLeft2 = Bodies.rectangle(
  -20, WORLD_H - (FFT_H / 2), 40, FFT_H,
  {
    isStatic: true,
    label: "wall-left"
  }
);

const wallRight = Bodies.rectangle(
  WORLD_W + 20, HOLE_H / 2, 40, HOLE_H * 2,
  {
    isStatic: true,
    label: "wall-right"
  }
);

const wallTop = Bodies.rectangle(
  FFT_W / 2, WORLD_H - FFT_H - 20, FFT_W, 40,
  {
    isStatic: true,
    label: "wall-top",
    render: {
        visible: false
    }
  }
);

const wallBottom = Bodies.rectangle(
  FFT_W / 2, WORLD_H + 20, FFT_W, 40,
  {
    isStatic: true,
    label: "wall-bottom"
  }
);

World.add(engine.world, [
  ball,
  wallLeft,
  wallLeft2,
  wallRight,
  wallTop,
  wallBottom
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

  // 新しく障害物を作る
  const body = Bodies.circle(
    (gx * cellW) + (cellW / 2) + FFT_W,
    (gy * cellH) + (cellH / 2),
    obstacleRadius,
    {
      isStatic: true,
      render: {
        fillStyle: "#0ff",
        strokeStyle: "#0ff",
        lineWidth: 1,
      },
      label: "obstacle"
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
  return {
    x: (e.clientX - rect.left) * (WORLD_W / rect.width),
    y: (e.clientY - rect.top) * (WORLD_H / rect.height)
  };
}

function handleCell(e) {
  // const rect = worldCanvas.getBoundingClientRect();
  // const mx = e.clientX - rect.left;
  // const my = e.clientY - rect.top;
  const pos = getCanvasPos(e);
  if (pos.x < FFT_W) return;
  if (pos.x > WORLD_W) return;
  if (pos.y < 0) return;
  if (pos.y > WORLD_H) return;

  const gx = Math.floor((pos.x - FFT_W) / cellW);
  const gy = Math.floor(pos.y / cellH);
  const key = `${gx},${gy}`;
  if (touchedCells.has(key)) return;
  // touchedCells.clear();
  touchedCells.add(key);

  toggleCell(gx, gy);
}

function randomKickBall() {
  const angle = Math.random() * Math.PI * 2;

  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setAngularVelocity(ball, 0);

  Body.setVelocity(ball, {
    x: Math.cos(angle) * BALL_SPEED,
    y: Math.sin(angle) * BALL_SPEED
  });
}

function setBallRadius(newRadius) {
  ballRadius = newRadius;
  const { x, y } = ball.position;
  const v = ball.velocity;

  World.remove(engine.world, ball);
  ball = createBall(x, y);
  World.add(engine.world, ball);

  Body.setVelocity(ball, {
    x: v.x,
    y: v.y
  });
}

function stopBall() {
  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setAngularVelocity(ball, 0);
}

Matter.Events.on(engine, "afterUpdate", () => {
  const { x, y } = ball.position;

  if (y < -ballRadius) {
    Body.setPosition(ball, {
      x: x,
      y: WORLD_H + ballRadius
    });
  }

  if (y > WORLD_H + ballRadius) {
    Body.setPosition(ball, {
      x: x,
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

function xyLoop(){
  posX.textContent = ball.position.x.toFixed(1);
  posY.textContent = ball.position.y.toFixed(1);

  requestAnimationFrame(xyLoop);
}

const gravitySlider = document.getElementById("gravity");
const gravityVal = document.getElementById("gravityVal");
gravitySlider.oninput = e=>{
  engine.gravity.y = +e.target.value;
  gravityVal.textContent = (+e.target.value).toFixed(2);
};
