/* ================= Matter.js 物理設定 ================= */
const { Engine, Render, World, Bodies, Body, Runner } = Matter;

const PHYS_WIDTH = 400, PHYS_HEIGHT = 400;

const engine = Engine.create();
engine.gravity.y = 0;

Render.run(Render.create({
  canvas: world,
  engine,
  options:{ width:PHYS_WIDTH, height:PHYS_HEIGHT, wireframes:false, background:"#000" }
}));

const runner = Runner.create();
Runner.run(runner, engine);

const ball = Bodies.circle(PHYS_WIDTH/2, PHYS_HEIGHT/2, 15, {
  restitution:1, friction:0, frictionStatic:0, frictionAir:0
});

World.add(engine.world,[
  ball,
  Bodies.rectangle(PHYS_WIDTH/2,-20,PHYS_WIDTH,40,{isStatic:true}),
  Bodies.rectangle(PHYS_WIDTH/2,PHYS_HEIGHT+20,PHYS_WIDTH,40,{isStatic:true}),
  Bodies.rectangle(-20,PHYS_HEIGHT/2,40,PHYS_HEIGHT,{isStatic:true}),
  Bodies.rectangle(PHYS_WIDTH+20,PHYS_HEIGHT/2,40,PHYS_HEIGHT,{isStatic:true})
]);

function kickBall(){
  Body.setVelocity(ball,{x:0,y:0});
  Body.setAngularVelocity(ball,0);
  const f=0.012;
  Body.applyForce(ball, ball.position,{
    x:Math.cos(Math.PI/4)*f,
    y:Math.sin(Math.PI/4)*f
  });
}
