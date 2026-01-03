const { Engine, Render, World, Bodies, Body, Runner } = Matter;
const W = 400, H = 400;

const engine = Engine.create();
engine.gravity.y = 0;

const worldCanvas = document.getElementById("world");

Render.run(Render.create({
  canvas: worldCanvas,
  engine,
  options:{ width:W, height:H, wireframes:false, background:"#000" }
}));

const runner = Runner.create();
Runner.run(runner, engine);

const ball = Bodies.circle(W/2,H/2,15,{
  restitution:1,
  friction:0,
  frictionStatic:0,
  frictionAir:0
});

World.add(engine.world, [
  ball,
  Bodies.rectangle(W/2,-20,W,40,{isStatic:true}),
  Bodies.rectangle(W/2,H+20,W,40,{isStatic:true}),
  Bodies.rectangle(-20,H/2,40,H,{isStatic:true}),
  Bodies.rectangle(W+20,H/2,40,H,{isStatic:true})
]);

function kickBall(){
  Body.setVelocity(ball,{x:0,y:0});
  Body.setAngularVelocity(ball,0);
  const f = 0.012;
  Body.applyForce(ball, ball.position,{
    x:Math.cos(Math.PI/4)*f,
    y:Math.sin(Math.PI/4)*f
  });
}

// XY表示更新
(function xyLoop(){
  const posX = document.getElementById("posX");
  const posY = document.getElementById("posY");
  posX.textContent = ball.position.x.toFixed(1);
  posY.textContent = ball.position.y.toFixed(1);
  requestAnimationFrame(xyLoop);
})();

const gravitySlider = document.getElementById("gravity");
const gravityVal = document.getElementById("gravityVal");
gravitySlider.oninput = e=>{
  engine.gravity.y = +e.target.value;
  gravityVal.textContent = (+e.target.value).toFixed(2);
};
