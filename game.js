/* School 125 — dependency-free Canvas game. All coordinates use the supplied atlas. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas.getContext('2d');
  const W = 1086, keys = new Set();
  let H = 430;
  const atlas = new Image(), hall = new Image(), teacher = new Image();
  const scenes = [
    {name:'Школьный двор', crop:[0,0,1086,377], start:235, min:228, max:833, feet:390, height:96, direction:1, goal:'Идите направо к школе →'},
    {name:'Главный вход', crop:[0,388,1086,351], start:265, min:255, max:720, feet:391, height:123, direction:1, target:545, goal:'Подойдите к входу', prompt:'Войти'},
    {name:'Холл · первый этаж', crop:[0,0,1536,1024], start:509, min:77, max:595, feet:461, height:119, direction:-1, target:80, goal:'Зайдите в кабинет 102', prompt:'Войти в кабинет 102'}
  ];
  const state = {phase:'loading', scene:0, x:235, facing:1, walking:false, walkTime:0, time:0, opacity:0, transitionTime:0, switched:false};
  let sprites = [], idle = [], walk = [], lastTime = 0;

  // Remove only border-connected gray from the reference's sprite strip.
  // Dark outlines seal the character, preserving the black trousers and hair.
  function extractSprite(x, width) {
    const height=153;
    const c=document.createElement('canvas'); c.width=width; c.height=height;
    const g=c.getContext('2d',{willReadFrequently:true});
    g.drawImage(teacher,x,654,width,height,0,0,width,height);
    const im=g.getImageData(0,0,width,height), p=im.data;
    const seen=new Uint8Array(width*height), queue=[];
    function add(i){if(i<0||i>=seen.length||seen[i])return;seen[i]=1;
      const n=i*4,r=p[n],b=p[n+2],green=p[n+1];
      if(Math.max(r,green,b)-Math.min(r,green,b)<25 && Math.min(r,green,b)>90 && Math.max(r,green,b)<205){queue.push(i);p[n+3]=0;}}
    for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}
    for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
    for(let n=0;n<queue.length;n++){const i=queue[n],col=i%width;if(col)add(i-1);if(col<width-1)add(i+1);add(i-width);add(i+width);}
    g.putImageData(im,0,0);return c;
  }
  function updateUI(){
    const nextH=state.scene===2?724:430;
    if(H!==nextH){H=nextH;canvas.height=H;canvas.style.aspectRatio=`${W} / ${H}`;}
    document.body.classList.toggle('in-hall',state.scene===2);
    const s=scenes[state.scene]; $('scene-label').textContent=s.name; $('chapter').textContent=`0${state.scene+1} / 03`;
    $('objective-text').textContent=s.goal;
    // The new hall image already includes its objective and controls.
    $('objective').hidden=state.phase!=='playing'||state.scene===2;
    $('direction-hint').hidden=state.phase!=='playing'||state.scene!==0;
    const near=state.phase==='playing'&&s.target!==undefined&&Math.abs(state.x-s.target)<62;
    $('prompt').hidden=!near;
    if(near)$('prompt-text').textContent=s.prompt;
  }
  function begin(){
    keys.clear();Object.assign(state,{phase:'playing',scene:0,x:scenes[0].start,facing:1,walking:false,walkTime:0,time:0,opacity:0});
    $('intro').hidden=true;$('ending').hidden=true;document.body.classList.add('playing');
    canvas.focus();updateUI();
  }
  function transition(){
    if(state.phase!=='playing')return;
    Object.assign(state,{phase:'transition',transitionTime:0,switched:false,walking:false});keys.clear();updateUI();
  }
  function interact(){const s=scenes[state.scene];if(state.phase==='playing'&&s.target!==undefined&&Math.abs(state.x-s.target)<62)transition();}
  function step(dt){
    state.time+=dt;
    if(state.phase==='playing'){
      const s=scenes[state.scene], dir=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
      const before=state.x;state.x=Math.max(s.min,Math.min(s.max,state.x+dir*154*dt));
      state.walking=Math.abs(state.x-before)>.01;if(dir)state.facing=dir;
      // Drive the gait by distance: two steps per 120 game pixels.
      if(state.walking)state.walkTime+=Math.abs(state.x-before)/120;else state.walkTime=0;
      if(state.scene===0&&state.x>=s.max)transition();
    }else if(state.phase==='transition'){
      state.transitionTime+=dt;const t=state.transitionTime;
      // A short turn towards the door, then a slow full-screen fade.
      state.opacity=Math.max(0,Math.min(1,(t-.45)/.95));
      if(t>=1.65&&!state.switched){
        state.switched=true;
        if(state.scene===2){
          state.phase='ended';state.opacity=1;keys.clear();
          window.location.assign('./congratulations/index.html');
        }
        else{state.scene++;const s=scenes[state.scene];state.x=s.start;state.facing=s.direction;state.walkTime=0;}
      }
      if(state.switched&&state.phase!=='ended'){
        state.opacity=1-Math.min(1,Math.max(0,(t-1.8)/.85));
        if(t>=2.65){state.phase='playing';state.opacity=0;}
      }
    }
    updateUI();
  }
  function drawLeg(source, sx, hipX, hipY, footX, footY){
    const length=27, dx=footX-hipX, dy=footY-hipY;
    const distance=Math.min(53.9,Math.hypot(dx,dy));
    const angle=Math.atan2(dy,dx)-Math.acos(distance/(2*length));
    const kneeX=hipX+Math.cos(angle)*length, kneeY=hipY+Math.sin(angle)*length;
    function bone(x,y,endX,endY,sy,sh){
      const d=Math.hypot(endX-x,endY-y), a=Math.atan2(endY-y,endX-x)-Math.PI/2;
      ctx.save();ctx.translate(x,y);ctx.rotate(a);
      ctx.drawImage(source,sx,sy,24,sh,-12,-2,24,d+4);
      ctx.restore();
    }
    bone(hipX,hipY,kneeX,kneeY,111,22);
    bone(kneeX,kneeY,footX,footY,130,23);
  }
  function drawTeacher(){
    const s=scenes[state.scene], scale=s.height/153;
    ctx.save();ctx.translate(Math.round(state.x),s.feet);
    ctx.fillStyle='#14181140';ctx.beginPath();ctx.ellipse(0,-1,20*scale,3.5,0,0,Math.PI*2);ctx.fill();
    ctx.scale(state.facing*scale,scale);ctx.translate(-41,-153);
    if(state.walking){
      const cycle=state.walkTime%1, phase=cycle*Math.PI*2;
      const bodyY=-Math.abs(Math.sin(phase))*2;
      const foot=offset=>{
        const p=(cycle+offset)%1;
        // Stance: planted foot travels back relative to the body.
        // Swing: it lifts, passes the supporting leg, and lands ahead.
        return p<.5?{x:18-72*p,y:151}:{x:-18+72*(p-.5),y:151-13*Math.sin((p-.5)*Math.PI*2)};
      };
      const rear=foot(.5),front=foot(0);
      drawLeg(idle[0],16,36,101+bodyY,41+rear.x,rear.y);
      drawLeg(idle[0],40,45,101+bodyY,41+front.x,front.y);
      const frame=walk[Math.floor(cycle*4)%4];
      // Keep the supplied walk head, torso, arms and bag; animate the legs independently.
      ctx.drawImage(frame,0,0,82,110,0,bodyY,82,110);
    }else{
      const breath=Math.sin(state.time*2.2), frame=idle[Math.floor(state.time*2.3)%3];
      // Feet stay planted while the chest, shoulders and head breathe.
      ctx.drawImage(idle[0],0,111,80,42,1,111,80,42);
      ctx.drawImage(frame,0,0,80,114,1+breath*.7,-1.5-breath*1.5,80,115.5+breath*1.5);
    }
    ctx.restore();
  }
  function render(){
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    if(!sprites.length)return;
    const s=scenes[state.scene],c=s.crop;
    ctx.imageSmoothingEnabled=false;
    // Fit each entire location; never crop out the hall or change its geometry.
    const scale=Math.min(W/c[2],H/c[3]),bw=c[2]*scale,bh=c[3]*scale;
    ctx.drawImage(state.scene===2?hall:atlas,...c,(W-bw)/2,(H-bh)/2,bw,bh);
    drawTeacher();
    $('veil').style.opacity=state.opacity;
  }
  function tick(now){const dt=Math.min((now-lastTime)/1000||0,.05);lastTime=now;step(dt);render();requestAnimationFrame(tick);}
  window.addEventListener('keydown',e=>{
    if(!['KeyA','KeyD','KeyE'].includes(e.code))return;
    if(state.phase==='playing'){e.preventDefault();if(e.code==='KeyE'){if(!e.repeat)interact();}else keys.add(e.code);}
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>{keys.clear();lastTime=performance.now();});
  document.querySelectorAll('[data-key]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(state.phase!=='playing')return;if(b.dataset.key==='KeyE')interact();else keys.add(b.dataset.key);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));
  });
  $('start').addEventListener('click',begin);$('restart').addEventListener('click',begin);
  function ready(){
    if(sprites.length||![atlas,hall,teacher].every(i=>i.complete&&i.naturalWidth))return;
    idle=[36,126,211].map(x=>extractSprite(x,80));
    walk=[324,418,510,608].map(x=>extractSprite(x,82));sprites=[...idle,...walk];
    state.phase='intro';$('start').disabled=false;$('start').textContent='Вернуться в школу';requestAnimationFrame(tick);
  }
  for(const img of [atlas,hall,teacher]){
    img.onload=ready;
    img.onerror=()=>{$('load-error').hidden=false;$('start').textContent='Ошибка загрузки';};
  }
  atlas.src=window.SCHOOL_ATLAS;
  hall.src=window.HALL_IMAGE;teacher.src=window.TEACHER_IMAGE;
})();
