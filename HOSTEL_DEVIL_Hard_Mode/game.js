(()=>{'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),W=960,H=540,GROUND=470,KEY='hostelDevil_v1';
const names=['Orientation','Mess Hall','Warden Patrol','The Fake Shortcut','Monsoon Hostel','Lights Out','Laundry Disaster','Exam Night','The Endless Corridor','Final Checkout'];
const quips=['Bro trusted hostel infrastructure 💀','Warden has entered the chat.','Attendance: 0%. Survival: 0%.','Mess food was not the biggest danger.','Your roommate is laughing right now.','Skill issue, certified by the principal.','Even the watchman gave up.','Hostel life builds character. And rage.','You have been promoted to permanent resident.','That floor had other plans.'];
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}let unlocked=Math.max(1,Number(saved.unlocked)||1),deaths=Math.max(0,Number(saved.deaths)||0),level=1,active=false,dead=false,won=false,frame=0,last=0,muted=!!saved.muted;
let player,platforms,spikes,fallers,movers,triggered,exit,decor,checkpoint,toastTimer=0,theme=0,variant=0;const keys={left:false,right:false,jump:false};let jumpLatch=false;let audio;
const $=id=>document.getElementById(id);const rnd=(a,b)=>a+Math.random()*(b-a);function store(){try{localStorage.setItem(KEY,JSON.stringify({unlocked,deaths,muted}))}catch{}}function beep(freq=280,duration=.09,type='square'){if(muted)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function toast(msg){const t=$('toast');t.textContent=msg;t.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.style.display='none',1700)}
function rect(x,y,w,h,kind='solid'){return{x,y,w,h,kind,alive:true,vy:0,delay:0}}function spike(x,y,w=38,h=26){return{x,y,w,h,active:true}}function moving(x,y,w=45,h=45,axis='x',range=90,speed=2){return{x,y,w,h,ox:x,oy:y,axis,range,speed,t:0,active:true}}
function setup(n){level=n;theme=Math.floor((n-1)/5)%8;variant=(n-1)%12;frame=0;dead=false;won=false;active=true;triggered={};player={x:43,y:GROUND-36,w:27,h:36,vx:0,vy:0,onGround:false,prevY:0};platforms=[rect(0,GROUND,960,70)];spikes=[];fallers=[];movers=[];exit={x:894,y:GROUND-68,w:39,h:68};decor=[];checkpoint=0;
const gap=(x,w)=>{platforms.push(rect(x,GROUND,w,70,'gap'));};const p=(x,y,w=90)=>platforms.push(rect(x,y,w,18));
switch(n){
case 1:gap(350,105);spike(550,GROUND-25,42);p(695,405,105);movers.push(moving(740,GROUND-35,30,35,'x',30,1.6));break;
case 2:gap(235,110);gap(630,105);spike(455,GROUND-25,78);p(315,392,90);movers.push(moving(785,GROUND-35,30,35,'x',35,1.8));break;
case 3:spike(290,GROUND-25,60);spike(580,GROUND-25,65);gap(720,85);movers.push(moving(445,GROUND-47,36,47,'x',105,2.7));break;
case 4:gap(340,120);gap(735,90);p(480,392,105);spike(610,GROUND-25,45);movers.push(moving(255,GROUND-34,32,34,'x',42,2));break;
case 5:gap(230,110);gap(540,125);p(370,390,95);p(690,395,90);spike(815,GROUND-25,38);break;
case 6:spike(240,GROUND-25,50);gap(455,125);spike(740,GROUND-25,70);movers.push(moving(635,GROUND-38,30,38,'x',42,2.1));break;
case 7:gap(300,110);gap(650,110);p(450,385,100);spike(815,GROUND-25,38);movers.push(moving(540,GROUND-40,40,40,'y',80,2.5));break;
case 8:spike(220,GROUND-25,60);gap(400,115);spike(640,GROUND-25,55);p(760,390,75);movers.push(moving(570,GROUND-37,32,37,'x',40,2.4));break;
case 9:gap(270,105);gap(560,115);movers.push(moving(420,GROUND-40,38,40,'x',85,2.9));p(730,390,80);spike(820,GROUND-25,35);break;
case 10:gap(220,105);gap(470,110);gap(745,95);spike(370,GROUND-25,45);p(605,390,80);movers.push(moving(620,GROUND-35,30,35,'y',45,2.4));break;
default:{
 // Seeded generation means every room has a reproducible, learnable layout.
 let seed=(n*2654435761)>>>0;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 // Each lane is spaced so jumps remain within the player's physical range.
 // Higher levels add tighter timing and extra moving hazards, not impossible chasms.
 const difficulty=Math.min(12,Math.floor((n-11)/5));
 const segments=[205,365,525,685];
 for(let i=0;i<4;i++){
   const x=segments[i]+Math.floor(rand()*17),r=rand();
   if(r<.42){
     gap(x,Math.min(122,88+Math.floor(rand()*17)+difficulty*2));
     if(rand()<.35)p(x+18,385-Math.floor(rand()*26),70);
   }else if(r<.85){
     spike(x,GROUND-25,Math.min(65,38+Math.floor(rand()*15)+difficulty));
   }else{
     p(x,385-Math.floor(rand()*30),72);
     spike(x+104,GROUND-25,30);
   }
 }
 // Patrols are positioned in separate lanes to avoid overlapping impossible clusters.
 const patrols=Math.min(3,1+Math.floor(difficulty/3));
 for(let i=0;i<patrols;i++){
   const px=[298,465,790][i],sz=30+Math.min(7,difficulty);
   movers.push(moving(px,GROUND-sz,sz,sz,i===1?'y':'x',24+Math.min(25,difficulty*3),1.7+Math.min(2,difficulty*.14)+rand()*.35));
 }
 // Bonus overhead hazards become more frequent deeper into endless mode.
 if(difficulty>=5&&rand()<.65)fallers.push(rect(640,-180,38,38,'fall'));
 break;
 }
}
updateUI();renderLevelButtons();$('overlay').classList.add('hidden');beep(480,.07)}
function updateUI(){$('levelStat').textContent=`ROOM ${String(level).padStart(2,'0')} / ∞`;$('deathStat').textContent=`💀 ${deaths} DEATHS`;$('bestStat').textContent=`🏆 BEST ${String(unlocked).padStart(2,'0')}`;$('levelName').textContent=`Room ${level}: ${roomName(level)}`;$('soundBtn').textContent=muted?'🔇 Muted':'🔊 Sound'}
const zones=['Midnight Canteen','Haunted Laundry','Rooftop Rush','Warden Headquarters','Exam Dimension','Monsoon Mayhem','Mess Kitchen','Basement Labyrinth'];
const adjectives=['Broken','Suspicious','Impossible','Cursed','Vanishing','Midnight','Reverse','Chaos','Secret','Unfair','Haunted','Final'];
function roomName(n){return names[n-1]||`${adjectives[(n-11)%adjectives.length]} ${zones[Math.floor((n-11)/5)%zones.length]}`}
function renderLevelButtons(){const el=$('levels');el.replaceChildren();const first=Math.max(1,Math.floor((level-1)/10)*10+1);for(let i=first;i<first+10;i++){const b=document.createElement('button');b.className='levelBtn'+(i===level?' current':'');b.textContent=i;b.disabled=i>unlocked;b.title=`Room ${i}: ${roomName(i)}`;b.onclick=()=>setup(i);el.append(b)}const next=document.createElement('span');next.className='levelPage';next.textContent=`  •  ${unlocked} unlocked  •  Endless rooms`;el.append(next)}
function overlay(tag,title,message,button,callback,share=false){$('overlayTag').textContent=tag;$('overlayTitle').textContent=title;$('overlayText').textContent=message;$('playBtn').textContent=button;$('playBtn').onclick=callback;$('overlayShare').style.display=share?'inline-block':'none';$('overlay').classList.remove('hidden')}
function die(){if(dead||won)return;dead=true;active=false;deaths++;store();updateUI();beep(130,.23,'sawtooth');const line=quips[(deaths+level*3)%quips.length];overlay('YOU DIED 💀',`ROOM ${level} GOT YOU`,`${line} · Total deaths: ${deaths}`, 'TRY AGAIN ↻',()=>setup(level),true)}
function finish(){if(won)return;won=true;active=false;beep(700,.12);setTimeout(()=>beep(950,.2),110);if(level===unlocked)unlocked++;store();updateUI();renderLevelButtons();overlay('ROOM CLEARED ✨',`ROOM ${level} SURVIVED`,`Next: ${roomName(level+1)}. Endless hostel madness continues!`,'NEXT ROOM →',()=>setup(level+1),true)}
function collide(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function events(){const x=player.x,n=level;
const once=(key,condition,fn)=>{if(condition&&!triggered[key]){triggered[key]=true;fn()}};
if(n===1){once('floor',x>230,()=>{spikes.push(spike(800,GROUND-25,45));toast('SURPRISE: EXTRA HOMEWORK!')})}
if(n===2){once('mess',x>380,()=>{fallers.push(rect(535,-75,65,65,'fall'));toast('MESS PLATE INCOMING!')})}
if(n===3){once('warden',x>510,()=>{movers.push(moving(770,GROUND-52,42,52,'x',85,3.2));toast('WARDEN ON DOUBLE SHIFT!')})}
if(n===4){once('fake',x>200,()=>{platforms.push(rect(560,GROUND,90,70,'gap'));toast('SHORTCUT = SCAM!')})}
if(n===5){once('rain',x>440,()=>{fallers.push(rect(755,-70,75,75,'fall'));toast('MONSOON SPECIAL DELIVERY!')})}
if(n===6){once('blackout',x>310,()=>{triggered.darkUntil=frame+150;toast('POWER CUT!')});once('spike',x>600,()=>{spikes.push(spike(860,GROUND-25,30));})}
if(n===7){once('laundry',x>190,()=>{fallers.push(rect(580,-80,65,65,'fall'));toast('FLYING LAUNDRY!')})}
if(n===8){once('exam',x>510,()=>{spikes.push(spike(830,GROUND-25,36));toast('SURPRISE EXAM!')})}
if(n===9){once('corridor',x>700,()=>{exit.x=760;toast('EXIT MOVED. OF COURSE.')})}
if(n===10){once('warden2',x>335,()=>{movers.push(moving(680,GROUND-48,44,48,'x',85,3));toast('FINAL BOSS: WARDEN!')});once('last',x>685,()=>{spikes.push(spike(845,GROUND-25,28));toast('ONE LAST TRAP!')})}
if(n>10){const mode=n%7;once('surprise',x>390,()=>{if(mode===0||mode===3){fallers.push(rect(700,-85,48,48,'fall'));toast('WARDEN DROPPED A SURPRISE!')}else if(mode===1||mode===5){spikes.push(spike(828,GROUND-25,29));toast('BONUS TRAP UNLOCKED!')}else if(mode===2){movers.push(moving(760,GROUND-45,35,45,'x',65,2.8));toast('NIGHT WATCHMAN INCOMING!')}else if(mode===4){triggered.darkUntil=frame+125;toast('ELECTRICITY BILL UNPAID!')}else {exit.x=840;toast('EXIT SHIFTED! NICE TRY!')}})}}
function update(dt){if(!active)return;frame++;const scale=Math.min(2,dt/16.67);player.prevY=player.y;const dir=(keys.right?1:0)-(keys.left?1:0);player.vx=dir*4.25;if(keys.jump&&!jumpLatch&&player.onGround){player.vy=-12.3;player.onGround=false;beep(430,.055)}jumpLatch=keys.jump;player.x+=player.vx*scale;player.x=Math.max(0,Math.min(W-player.w,player.x));player.vy=Math.min(15,player.vy+.58*scale);player.y+=player.vy*scale;player.onGround=false;
for(const q of platforms){if(q.kind==='gap')continue;if(player.vy>=0&&player.prevY+player.h<=q.y+12&&player.y+player.h>=q.y&&player.x+player.w>q.x&&player.x<q.x+q.w){let inGap=false;if(q.y===GROUND){inGap=platforms.some(g=>g.kind==='gap'&&player.x+player.w>g.x+4&&player.x<g.x+g.w-4)}if(!inGap){player.y=q.y-player.h;player.vy=0;player.onGround=true}}}
if(player.y>H+20){die();return}events();for(const s of spikes){if(s.active&&collide(player,{x:s.x+5,y:s.y+6,w:s.w-10,h:s.h-6})){die();return}}
for(const f of fallers){f.vy=Math.min(13,f.vy+.32*scale);f.y+=f.vy*scale;if(collide(player,f)){die();return}}
for(const m of movers){m.t+=.022*m.speed*scale;m.x=m.ox+(m.axis==='x'?Math.sin(m.t)*m.range:0);m.y=m.oy+(m.axis==='y'?Math.sin(m.t)*m.range:0);if(collide(player,m)){die();return}}
if(collide(player,exit)){finish()}}
function round(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function draw(){ctx.clearRect(0,0,W,H);const palettes=[
['#101a35','#243b65','#fbbf72','#85ddff'],['#102c38','#22556a','#f7cb84','#67f4d4'],
['#301d35','#66415e','#ffb0a8','#e6b4ff'],['#102d31','#26574f','#c9ed8e','#9ef8c6'],
['#231b42','#534273','#f6b9ff','#b8a0ff'],['#30291d','#635138','#ffcf80','#fff0a3'],
['#17284c','#335987','#91d9ff','#9bbfff'],['#331c37','#693d65','#ff9ec1','#ffb5df']];
const c=palettes[theme],t=performance.now()*.001;
let bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,c[0]);bg.addColorStop(.72,c[1]);bg.addColorStop(1,'#101324');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
glow(770,95,300,c[2]+'22');glow(170,270,300,c[3]+'14');
// Stars and floating dust create depth without image downloads.
for(let i=0;i<50;i++){let xx=(i*173+37)%960,yy=(i*97+17)%390;ctx.globalAlpha=.15+.26*(1+Math.sin(t*1.2+i))/2;ctx.fillStyle='#fff';ctx.fillRect(xx,yy,i%7===0?3:2,i%7===0?3:2)}ctx.globalAlpha=1;
// Layered campus silhouette, window lights and rooftop antennas.
for(let layer=0;layer<2;layer++){for(let i=0;i<14;i++){const xx=i*82-20+(layer?24:0),ht=110+((i*41+layer*67)%100),yy=GROUND-ht;round(xx,yy,70,ht+10,layer?3:7,layer?'#18253e88':'#101c33aa');ctx.fillStyle=layer?c[2]+'38':c[3]+'20';for(let j=0;j<3;j++)for(let k=0;k<2;k++){if((i+j+k+layer)%4!==0)round(xx+11+k*29,yy+20+j*29,13,16,2,layer?c[2]+'55':c[3]+'36')}}}
// Playable hallway with ceiling pipes, wall panels, posters and fluorescent lamps.
round(0,78,960,7,3,'#ffffff0a');round(0,418,960,7,3,'#ffffff12');
for(let i=0;i<7;i++){const xx=i*158+23;round(xx,92,125,7,4,'#091625');round(xx+12,94,100,3,2,c[3]+'aa');glow(xx+60,104,90,c[3]+'12')}
for(let i=0;i<5;i++){const xx=85+i*194;round(xx,236,103,122,8,'#10182f','#ffffff12');round(xx+8,245,87,105,5,c[1]+'88');round(xx+19,263,65,5,3,'#ffffff20');round(xx+19,282,48,5,3,'#ffffff13');round(xx+19,301,58,5,3,'#ffffff13')}
const posterColors=['#ffb36e','#a7f0cf','#c8a9ff'];for(let i=0;i<3;i++){let xx=177+i*300;ctx.save();ctx.translate(xx,171);ctx.rotate(Math.sin(i*9)*.05);round(-35,-30,70,65,4,posterColors[i]+'dc','#ffffff66');ctx.fillStyle='#172034';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText(['MESS','EXAMS','NO WIFI'][i],0,-6);ctx.font='bold 10px system-ui';ctx.fillText(['OPEN?','HELP!','RIP'][i],0,13);ctx.restore()}ctx.textAlign='left';
// Floor uses visible tile seams and danger-lit pits.
round(0,GROUND,960,70,0,'#27304b');round(0,GROUND,960,10,0,'#586783');for(let i=0;i<25;i++){ctx.fillStyle=i%2?'#ffffff08':'#00000010';ctx.fillRect(i*40,GROUND+12,39,58);ctx.fillStyle='#ffffff12';ctx.fillRect(i*40,GROUND+12,1,58)}
for(const g of platforms.filter(z=>z.kind==='gap')){const pit=ctx.createLinearGradient(0,GROUND,0,H);pit.addColorStop(0,'#070a15');pit.addColorStop(1,'#1c0b23');ctx.fillStyle=pit;ctx.fillRect(g.x,GROUND-1,g.w,72);glow(g.x+g.w/2,GROUND+8,48,'#ff547c44');round(g.x,GROUND-2,g.w,5,1,'#ff658e');for(let j=0;j<g.w;j+=22){ctx.fillStyle='#ff658e55';ctx.fillRect(g.x+j,GROUND+10,10,3)}}
for(const q of platforms.filter(z=>z.kind==='solid'&&z.y<GROUND)){round(q.x,q.y+5,q.w,q.h+4,4,'#101c2a88');round(q.x,q.y,q.w,q.h,4,'#90e9cd','#e3fff1');round(q.x+5,q.y+4,q.w-10,4,2,'#eafff3');for(let j=14;j<q.w;j+=27)round(q.x+j,q.y+12,11,2,1,'#266e70')}
// Danger hazards with bevels, eyes and pulsing highlights.
for(const s of spikes){const count=Math.max(1,Math.ceil(s.w/18)),sw=s.w/count;for(let i=0;i<count;i++){const x=s.x+i*sw;ctx.beginPath();ctx.moveTo(x,s.y+s.h);ctx.lineTo(x+sw/2,s.y);ctx.lineTo(x+sw,s.y+s.h);ctx.closePath();ctx.fillStyle='#ff658b';ctx.fill();ctx.beginPath();ctx.moveTo(x+sw*.22,s.y+s.h-3);ctx.lineTo(x+sw/2,s.y+8);ctx.lineTo(x+sw*.58,s.y+s.h-3);ctx.strokeStyle='#ffc4d2';ctx.lineWidth=2;ctx.stroke()}glow(s.x+s.w/2,s.y+8,35,'#ff5d7d25')}
for(const f of fallers){ctx.save();ctx.translate(f.x+f.w/2,f.y+f.h/2);ctx.rotate(Math.sin(t*3+f.x)*.08);round(-f.w/2,-f.h/2,f.w,f.h,8,'#f6ae63','#ffdb9e');round(-f.w/2+6,-f.h/2+6,f.w-12,7,3,'#ffe5b2');ctx.fillStyle='#35233a';ctx.textAlign='center';ctx.font='900 30px system-ui';ctx.fillText('!',0,10);ctx.restore()}
for(const m of movers){glow(m.x+m.w/2,m.y+m.h/2,65,'#ff638d33');round(m.x,m.y,m.w,m.h,9,'#fb668c','#ffb7ca');round(m.x+5,m.y+6,m.w-10,7,4,'#ffb6c8');round(m.x+8,m.y+17,7,8,2,'#1c1a32');round(m.x+m.w-15,m.y+17,7,8,2,'#1c1a32');round(m.x+13,m.y+m.h-11,m.w-26,4,2,'#1c1a32')}
// Exit has a bright portal and animated light.
glow(exit.x+exit.w/2,exit.y+exit.h/2,92,'#a8ffb744');round(exit.x-6,exit.y-6,exit.w+12,exit.h+12,9,'#d8ffe2','#f1fff1');round(exit.x,exit.y,exit.w,exit.h,5,'#133b3c');round(exit.x+6,exit.y+6,exit.w-12,exit.h-12,3,'#296b63');round(exit.x+10,exit.y+12,exit.w-20,exit.h-25,3,'#a3ffe17a');ctx.fillStyle='#fff7bc';ctx.beginPath();ctx.arc(exit.x+exit.w-10,exit.y+37,3.5,0,Math.PI*2);ctx.fill();round(exit.x-15,exit.y-33,exit.w+30,22,7,'#d2ffe0');ctx.fillStyle='#15463c';ctx.font='900 13px system-ui';ctx.textAlign='center';ctx.fillText('EXIT →',exit.x+exit.w/2,exit.y-17);ctx.textAlign='left';
// Animated student character: hair, backpack, hoodie, face and articulated feet.
const x=player.x,y=player.y,bob=player.onGround?Math.sin(t*13)*.9:0,walk=Math.abs(player.vx)>0&&player.onGround?Math.sin(t*17)*4:0;
ctx.save();ctx.translate(x,y+bob);glow(14,22,43,'#bca6ff20');round(-3,17,9,18,3,'#4a436f');round(3,16,23,18,5,'#b5a4ff','#ece4ff');round(7,19,15,11,3,'#7964c2');round(5,31+walk,8,6,2,'#f5f1ff');round(18,31-walk,8,6,2,'#f5f1ff');round(4,0,21,20,7,'#e8ae83','#ffe1b2');round(3,-4,23,9,4,'#20223d');round(3,0,6,7,2,'#20223d');round(8,9,4,5,2,'#fff');round(18,9,4,5,2,'#fff');round(10,11,2,3,1,'#24213d');round(20,11,2,3,1,'#24213d');round(13,16,7,2,1,'#ae654f');round(0,21,5,10,2,'#e8ae83');round(25,21,5,10,2,'#e8ae83');ctx.restore();
// In-game HUD glass chips.
round(14,12,304,61,13,'#081528ba','#ffffff26');ctx.fillStyle='#f4f6ff';ctx.font='900 15px system-ui';ctx.fillText('🏫  '+(level<=10?'HOSTEL BLOCK':zones[Math.floor((level-11)/5)%zones.length].toUpperCase())+'  ·  '+level,28,37);ctx.fillStyle='#b4c5d9';ctx.font='12px system-ui';ctx.fillText('HARD MODE · Time your jumps. Trust nothing.',28,57);
if(triggered.darkUntil&&frame<triggered.darkUntil){ctx.fillStyle='rgba(3,6,16,.88)';ctx.fillRect(0,0,W,H);ctx.save();ctx.globalCompositeOperation='destination-out';const beam=ctx.createRadialGradient(x+14,y+17,22,x+14,y+17,110);beam.addColorStop(0,'#000');beam.addColorStop(1,'transparent');ctx.fillStyle=beam;ctx.fillRect(x-100,y-95,240,240);ctx.restore();ctx.fillStyle='#fff';ctx.font='900 24px system-ui';ctx.textAlign='center';ctx.fillText('⚡ POWER CUT!',480,72);ctx.textAlign='left'}
}

function loop(t){const dt=last?Math.min(35,t-last):16.67;last=t;update(dt);draw();requestAnimationFrame(loop)}
function restart(){setup(level)}function shareText(){return `🏫 HOSTEL DEVIL 😈\nI reached Room ${level} in ENDLESS MODE with ${deaths} deaths 💀\nThink you can escape this cursed hostel?\n${location.href.split('#')[0]}`}
async function share(){const msg=shareText();if(navigator.share){try{await navigator.share({title:'HOSTEL DEVIL challenge',text:msg});return}catch(e){if(e.name==='AbortError')return}}try{await navigator.clipboard.writeText(msg);toast('CHALLENGE COPIED! SEND IT TO YOUR GANG')}catch{const a=document.createElement('textarea');a.value=msg;document.body.append(a);a.select();document.execCommand('copy');a.remove();toast('CHALLENGE COPIED!')}}
$('playBtn').onclick=()=>setup(1);$('restartBtn').onclick=restart;$('shareBtn').onclick=share;$('overlayShare').onclick=share;$('soundBtn').onclick=()=>{muted=!muted;store();updateUI();beep()};
const keymap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump'};window.addEventListener('keydown',e=>{if(keymap[e.code]){e.preventDefault();keys[keymap[e.code]]=true}if(e.code==='KeyR'&&!e.repeat)restart()});window.addEventListener('keyup',e=>{if(keymap[e.code]){e.preventDefault();keys[keymap[e.code]]=false}});window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);jumpLatch=false});
for(const b of document.querySelectorAll('[data-key]')){const k=b.dataset.key;const up=e=>{e.preventDefault();keys[k]=false;b.classList.remove('pressed')};b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[k]=true;b.classList.add('pressed')});b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',()=>{keys[k]=false;b.classList.remove('pressed')})}
setup(1);active=false;$('overlay').classList.remove('hidden');$('overlayTag').textContent='WELCOME TO HOSTEL';$('overlayTitle').textContent='ESCAPE IF YOU CAN.';$('overlayText').textContent='10 handcrafted rooms + endless generated trap rooms.  Move with arrows or A/D. Jump with Space, W or ↑. On mobile, use the touch buttons. Every room lies.';$('playBtn').textContent='START ESCAPE →';$('playBtn').onclick=()=>setup(1);requestAnimationFrame(loop);
})();
