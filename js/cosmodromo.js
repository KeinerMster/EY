(function(){
if(!window.THREE||!window.SIM)return;
document.getElementById('menu').classList.add('hidden');
var active=true,pend=null,cz=document.getElementById('cz');
var W=64,H=40,$=function(i){return document.getElementById(i)},cv=$('c');
var RES={hierro:['Hierro','#ff8a4c'],silicio:['Sílice','#3db5ff'],agua:['Hielo','#8ff3ff'],carbono:['Carbono','#9a82ff'],cobre:['Cobre','#d9822b'],titanio:['Titanio','#b9c4d0'],litio:['Litio','#f08ab8']};
var B={plat:{n:'Plataforma',c:{hierro:4}},torre:{n:'Torre',c:{hierro:10,silicio:3,titanio:2},s:1},tanque:{n:'Tanque',c:{hierro:8,silicio:2,litio:2},s:1},refineria:{n:'Refinería',c:{hierro:12,silicio:6,cobre:3},s:1},solar:{n:'Panel solar',c:{silicio:8,cobre:3}},para:{n:'Pararrayos',c:{cobre:5}},defl:{n:'Deflector',c:{hierro:12,carbono:2,titanio:2}},alm:{n:'Almacén',c:{hierro:10},s:1},cofre:{n:'Cofre',c:{hierro:6,cobre:1},s:1}};
var MAT={plat:'Hormigón armado',torre:'Acero + titanio',tanque:'Aluminio-litio',refineria:'Acero inoxidable',solar:'Silicio monocristalino',para:'Cobre',defl:'Acero refractario',alm:'Acero corrugado',cofre:'Acero ligero + bisagras de cobre'};
var RI={hierro:'🔩',silicio:'💎',agua:'🧊',carbono:'⚫',cobre:'🟠',titanio:'⚙️',litio:'🔋'};
var ROCKET={n:'Cohete',c:{hierro:40,silicio:20,carbono:10,titanio:8,litio:6}};
var P={tierra:{n:'Tierra',c:'#527b43',sky:0x7eaccd,well:60,d:1,r:{hierro:.24,silicio:.18,agua:.2,carbono:.08,cobre:.16,titanio:.08,litio:.06}},luna:{n:'Luna',c:'#777780',sky:0x03040c,well:12,d:1.1,r:{hierro:.26,silicio:.28,agua:.06,carbono:.04,cobre:.08,titanio:.22,litio:.06}},marte:{n:'Marte',c:'#9a5036',sky:0xb56d55,well:28,d:2,r:{hierro:.32,silicio:.14,agua:.16,carbono:.06,cobre:.1,titanio:.1,litio:.12}},venus:{n:'Venus',c:'#a97845',sky:0xc78f59,well:45,d:.7,r:{hierro:.26,silicio:.2,agua:.06,carbono:.14,cobre:.14,titanio:.1,litio:.1}}};
function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hs(s){var h=7;for(var i=0;i<s.length;i++)h=h*31+s.charCodeAt(i)|0;return h}
var S,tool='move',hov={x:-1,y:-1},down=false,keys={},L=null,acc=0,hudT=0,saveT=0,rsT=0,tgt=null,mine=null,prog=0,zm=1,gm={},nodeM=[],rocketM=null;
var viewMode='fps',fpsYaw=0,fpsPitch=-0.06,jumpY=0,jumpVel=0,jumpQueued=false,fpRay=new THREE.Raycaster(),fpCenter=new THREE.Vector2(0,0),touchLook=null,handSwing=0;
function fresh(){return{seed:(Math.random()*2147483647)|0,pl:'tierra',inv:{hierro:40,silicio:12,agua:0,carbono:0},fuel:0,w:{},built:false,px:32,py:20}}
try{var sv=localStorage.getItem('cosmo3d2');S=sv?JSON.parse(sv):fresh()}catch(e){S=fresh()}
if(!S||!S.w)S=fresh();if(!S.inv)S.inv={};for(var rk in RES)if(!Number.isFinite(S.inv[rk]))S.inv[rk]=0;if(!Number.isFinite(S.seed))S.seed=(Math.random()*2147483647)|0;if(!Number.isFinite(S.px)||!Number.isFinite(S.py)){S.px=32;S.py=20}
function shuffled(a,r){for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),v=a[i];a[i]=a[j];a[j]=v}return a}
function resourceZones(r){var zones=[],cols=8,rows=5;for(var zy=0;zy<rows;zy++)for(var zx=0;zx<cols;zx++)zones.push({id:zy*cols+zx,x0:zx*W/cols,x1:(zx+1)*W/cols,y0:zy*H/rows,y1:(zy+1)*H/rows,count:0});return shuffled(zones,r)}
function nodeSpot(r,z,n,minDist){for(var attempt=0;attempt<900;attempt++){var x=z.x0+.55+r()*(z.x1-z.x0-1.1),y=z.y0+.55+r()*(z.y1-z.y0-1.1);if(x<2||x>W-2||y<2||y>H-2)continue;if(Math.abs(x-W/2)<5&&Math.abs(y-H/2)<4)continue;var good=true;for(var i=0;i<n.length;i++)if(Math.hypot(n[i].x-x,n[i].y-y)<minDist){good=false;break}if(good)return{x:x,y:y}}return null}
function arrangeNodes(k,count){var r=rng((hs(k+'-resource-layout-v3')^S.seed)|0),zones=resourceZones(r),pos=[],minDist=3.55,maxPerZone=count>80?3:2;
// Fill each sector first so the whole map gets deposits instead of a few random clusters.
for(var pass=0;pass<maxPerZone&&pos.length<count;pass++){for(var zi=0;zi<zones.length&&pos.length<count;zi++){var z=zones[zi];if(z.count>pass)continue;var point=nodeSpot(r,z,pos,minDist);if(point){point.zone=z.id;pos.push(point);z.count++}}}
// In unusual geometry/old saves, make a final pass with a slightly looser threshold.
var attempts=0;while(pos.length<count&&attempts<12000){attempts++;var z=zones[Math.floor(r()*zones.length)];if(z.count>=maxPerZone)continue;var point=nodeSpot(r,z,pos,3.2);if(point){point.zone=z.id;pos.push(point);z.count++}}
return pos}
function gen(k){var r=rng((hs(k+'-resources-v3')^S.seed)|0),n=[],ks=Object.keys(P[k].r),positions=arrangeNodes(k,88);
for(var i=0;i<positions.length;i++){var v=r(),a=0,t=ks[0];for(var j=0;j<ks.length;j++){a+=P[k].r[ks[j]];if(v<=a){t=ks[j];break}}n.push({x:positions[i].x,y:positions[i].y,t:t,a:7+Math.floor(r()*9),t0:0,sz:.82+r()*.32})}
return{nodes:n,grid:{},rocket:null,mapV:4,chunks:{}}}
function wd(k){k=k||S.pl;var w=S.w[k];if(!w)w=S.w[k]=gen(k);if(!w.nodes)w.nodes=[];if(!w.grid)w.grid={};if(!w.chunks)w.chunks={};var ks=Object.keys(P[k].r),r=rng((hs(k+'-repair-nodes-v4')^S.seed)|0);w.nodes=w.nodes.filter(function(n){return n&&Number.isFinite(n.x)&&Number.isFinite(n.y)});w.nodes.forEach(function(n){if(!RES[n.t])n.t=ks[Math.floor(r()*ks.length)];if(!Number.isFinite(n.a)||n.a<0)n.a=7+Math.floor(r()*9);if(!Number.isFinite(n.sz))n.sz=.82+r()*.32;if(!Number.isFinite(n.t0))n.t0=0});if((w.mapV||0)<3){var pos=arrangeNodes(k,w.nodes.length);for(var i=0;i<Math.min(w.nodes.length,pos.length);i++){w.nodes[i].x=pos[i].x;w.nodes[i].y=pos[i].y}w.mapV=3}w.mapV=4;return w}
function dn(){return S.diff==null?1:S.diff}
function cm(){return[.7,1,1.4][dn()]}
function cap(){return inventorySlotCount()*64}
function fcap(){return 30+60*cnt('tanque')}
function cnt(t){var n=0,g=wd().grid;for(var k in g)if(g[k]===t)n++;return n}
function used(){var s=0;for(var k in S.inv)s+=S.inv[k];return s}
function afford(c){for(var k in c)if((S.inv[k]||0)<Math.ceil(c[k]*cm()))return false;return true}
function pay(c,m){for(var k in c)S.inv[k]+=m*Math.ceil(c[k]*cm())}
function msg(t){var e=$('toast');e.textContent=t;e.className='';clearTimeout(msg.t);msg.t=setTimeout(function(){e.className='h'},3200)}
function fcost(a,b){return Math.round((P[a].well+25*Math.abs(P[a].d-P[b].d)+8)*[.8,1,1.3][dn()])}
function chance(){return Math.min(.98,.7+.07*Math.min(3,cnt('para'))+.03*Math.min(5,cnt('defl')))}
function padCheck(){var w=wd(),ro=w.rocket,pl=cnt('plat'),on=!!ro&&w.grid[ro.x+','+ro.y]==='plat',tw=false;
if(ro)for(var k in w.grid)if(w.grid[k]==='torre'){var p=k.split(',');if(Math.abs(p[0]-ro.x)<=3&&Math.abs(p[1]-ro.y)<=3)tw=true}
var l=[[on,'Cohete sobre una plataforma en este planeta'],[pl>=4,'Al menos 4 plataformas ('+pl+'/4)'],[tw,'Torre a 3 casillas o menos del cohete']];
return{ok:l.every(function(x){return x[0]}),l:l}}
// ---- 3D
var scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(79,1,.1,400),rd=new THREE.WebGLRenderer({canvas:cv,antialias:true});
scene.add(cam);
var cosmoTouchDevice=!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches)||innerWidth<=760;rd.setPixelRatio(Math.min(devicePixelRatio||1,cosmoTouchDevice?1.35:2));rd.shadowMap.enabled=true;rd.shadowMap.type=THREE.PCFSoftShadowMap;rd.toneMapping=THREE.ACESFilmicToneMapping;rd.toneMappingExposure=0.92;rd.outputEncoding=THREE.sRGBEncoding;
(function(){var pg=new THREE.PMREMGenerator(rd),ec=document.createElement('canvas');ec.width=256;ec.height=128;var ex=ec.getContext('2d'),gr=ex.createLinearGradient(0,0,0,128);gr.addColorStop(0,'#bcd8ff');gr.addColorStop(.5,'#e8eef2');gr.addColorStop(1,'#5a5248');ex.fillStyle=gr;ex.fillRect(0,0,256,128);var et=new THREE.CanvasTexture(ec);et.mapping=THREE.EquirectangularReflectionMapping;scene.environment=pg.fromEquirectangular(et).texture})();
var hemi=new THREE.HemisphereLight(0xd8e5f1,0x4a4035,.72);scene.add(hemi);
var sun=new THREE.DirectionalLight(0xffe8cf,1.65);sun.position.set(10,22,8);sun.castShadow=true;sun.shadow.mapSize.set(cosmoTouchDevice?1024:2048,cosmoTouchDevice?1024:2048);var sc=sun.shadow.camera;sc.left=-22;sc.right=22;sc.top=16;sc.bottom=-16;sc.near=1;sc.far=60;sun.shadow.bias=-.0004;scene.add(sun);
var dyn=new THREE.Group();scene.add(dyn);
function terrainNoise(x,z,scale,seed){
 // La misma función determinista se ejecuta en WebAssembly y en el fallback JS.
 // Esto hace que la generación sea reproducible y evita costuras al cargar chunks.
 var core=window.CosmoCore;
 if(core&&typeof core.noise==='function')return core.noise(x,z,scale,seed);
 scale=Math.max(.000001,scale);var fx=x/scale,fz=z/scale,ix=Math.floor(fx),iz=Math.floor(fz),tx=fx-ix,tz=fz-iz;
 tx=tx*tx*(3-2*tx);tz=tz*tz*(3-2*tz);
 function hash(a,b){var h=(Math.imul(a|0,0x8da6b343)^Math.imul(b|0,0xd8163841)^Math.imul(seed|0,0xcb1ab31f))>>>0;h^=h>>>13;h=Math.imul(h,0x85ebca6b)>>>0;h^=h>>>16;h=Math.imul(h,0xc2b2ae35)>>>0;h^=h>>>16;return(h&0xffffff)/16777216-.5}
 var a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1),ab=a+(b-a)*tx,cd=c+(d-c)*tx;return ab+(cd-ab)*tz;
}
function terrainHeight0(x,z){
 // Suelo geológico con colinas de distintas escalas, microrelieve y una zona inicial estable.
 var rough=S.pl==='tierra'?1:S.pl==='marte'?1.25:S.pl==='luna'?.72:.9;
 var h=.12*Math.sin(x*.14+Math.sin(z*.075)*1.35)*Math.cos(z*.17)
  +.055*Math.sin((x+z)*.31+Math.sin(x*.10)*.7)
  +.024*Math.cos(z*.57-x*.49)
  +.15*Math.exp(-(((x+18)/8)*((x+18)/8)+((z-8)/6)*((z-8)/6))*1.2)
  -.105*Math.exp(-(((x-14)/7)*((x-14)/7)+((z+12)/5)*((z+12)/5))*1.1);
 h+=rough*(terrainNoise(x,z,10.5,11)*.46+terrainNoise(x,z,3.1,23)*.19+terrainNoise(x,z,1.25,37)*.055);
 var flat=Math.max(0,1-Math.hypot(x,z)/10);return h*(1-flat*.98)
}
var HC={},HN=0,WL=-.5;
function makeAtlas(){var c=document.createElement('canvas');c.width=32;c.height=16;var x=c.getContext('2d'),i,j,v,rr=rng(77);
 for(j=0;j<16;j++)for(i=0;i<32;i++){var side=i>=16;v=side?168+rr()*70:196+rr()*59;if(!side&&rr()<.12)v-=55;if(side&&rr()<.06)v-=80;x.fillStyle='rgb('+(v|0)+','+(v|0)+','+(v|0)+')';x.fillRect(i,j,1,1)}
 for(i=0;i<9;i++){var px=16+(rr()*13|0),py=rr()*13|0;x.fillStyle='rgb(105,105,105)';x.fillRect(px,py,2,2)}
 for(i=0;i<8;i++){x.fillStyle='rgb(255,255,255)';x.fillRect(rr()*15|0,rr()*15|0,1,1)}
 var t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;t.encoding=THREE.sRGBEncoding;return t}
var WMAT={tierra:new THREE.MeshStandardMaterial({color:0x2f6fbf,transparent:true,opacity:.74,roughness:.15,metalness:.1}),venus:new THREE.MeshStandardMaterial({color:0xff5a1a,emissive:0xff3a00,emissiveIntensity:1.2,roughness:.6})};
function terrainHeight(x,z){var fx=Math.floor(x),fz=Math.floor(z),k=S.pl+S.seed+'|'+fx+','+fz,b=HC[k];if(b===undefined){if(++HN>150000){HC={};HN=0}b=HC[k]=Math.round(terrainHeight0(fx+.5,fz+.5)*12)*.25}var w=S.w&&S.w[S.pl],e=w&&w.ed&&w.ed[fx+','+fz];return e?b+e*.5:b}
function rebuildAt(fx,fz){var done={};[[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var cx=Math.floor((fx+d[0])/TERRAIN_SIZE),cz=Math.floor((fz+d[1])/TERRAIN_SIZE),k=cx+','+cz;if(done[k]||!terrainChunks[k])return;done[k]=1;disposeTerrainChunk(terrainChunks[k]);terrainChunks[k]=makeTerrainChunk(cx,cz)})}
// Sonidos sintetizados (WebAudio, sin archivos)
var AC=null,snM=false,stT=0,mst=0,ROT={silicio:1,agua:1,litio:1,titanio:1};try{snM=localStorage.getItem('cosmo_mute')==='1'}catch(e){}
function snd(t,vol){if(snM)return;try{var VV=vol==null?1:vol;if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();var n=AC.currentTime;
 function tone(f,f2,d,ty,v,dl){v*=VV;var s=n+(dl||0),o=AC.createOscillator();o.type=ty;o.frequency.setValueAtTime(f,s);o.frequency.exponentialRampToValueAtTime(f2,s+d);var g=AC.createGain();g.gain.setValueAtTime(v,s);g.gain.exponentialRampToValueAtTime(.001,s+d);o.connect(g);g.connect(AC.destination);o.start(s);o.stop(s+d)}
 function noise(d,fq,v,dl,ft){v*=VV;var s0=n+(dl||0),b=AC.createBuffer(1,AC.sampleRate*d|0,AC.sampleRate),a=b.getChannelData(0);for(var i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length);var s=AC.createBufferSource();s.buffer=b;var f=AC.createBiquadFilter();f.type=ft||'lowpass';f.frequency.value=fq;var g=AC.createGain();g.gain.value=v;s.connect(f);f.connect(g);g.connect(AC.destination);s.start(s0)}
 if(t==='break'){noise(.16,900,.5);tone(120,50,.12,'square',.2)}
 else if(t==='place'){tone(200,120,.08,'square',.16);noise(.05,1200,.25)}
 else if(t==='stone'){noise(.2,800,.5);tone(100,50,.14,'square',.18);noise(.06,2500,.2,.02)}
 else if(t==='dirt'){noise(.18,420,.4);tone(80,50,.1,'sine',.2)}
 else if(t==='m_hierro'){tone(900,780,.25,'triangle',.28);tone(1800,1700,.35,'sine',.12,.01);noise(.05,4000,.25,0,'highpass')}
 else if(t==='m_cobre'){tone(660,620,.4,'sine',.25);tone(1320,1290,.3,'sine',.1,.01);noise(.04,3000,.15,0,'highpass')}
 else if(t==='m_titanio'){tone(420,400,.4,'triangle',.3);tone(1260,1200,.4,'sine',.1);tone(210,190,.3,'sawtooth',.06);noise(.05,2500,.2,0,'highpass')}
 else if(t==='m_carbono'){noise(.22,1300,.45);tone(110,60,.18,'square',.12)}
 else if(t==='m_silicio'){tone(2637,2600,.3,'sine',.12);tone(3520,3480,.25,'sine',.1,.02);tone(4186,4100,.2,'sine',.08,.04);noise(.08,6000,.35,0,'highpass')}
 else if(t==='m_agua'){noise(.12,5000,.4,0,'highpass');tone(1900,500,.1,'triangle',.15);tone(2800,2700,.15,'sine',.07,.05)}
 else if(t==='m_litio'){tone(1760,1740,.45,'sine',.12);tone(2349,2330,.4,'sine',.1,.05);tone(2960,2940,.35,'sine',.08,.1)}
 else if(t==='build'){tone(180,90,.2,'triangle',.3);tone(520,260,.12,'square',.08);noise(.08,3000,.2)}
 else if(t==='collect'){tone(660,990,.12,'sine',.2)}
 else if(t==='step'){noise(.05,500,.12)}
 else if(t==='click'){tone(520,420,.05,'square',.07)}
 else if(t==='chest_open'){tone(140,260,.35,'sawtooth',.08);noise(.15,700,.25)}
 else if(t==='chest_close'){noise(.12,500,.3);tone(90,60,.12,'square',.15)}
 else if(t==='move'){tone(900,1200,.05,'square',.06)}
 else if(t==='splash'){noise(.3,1800,.35);tone(300,120,.15,'sine',.1)}
 else if(t==='bird'){tone(2400,3200,.06,'sine',.06);tone(3000,2200,.09,'sine',.05)}
 else if(t==='cricket'){tone(4300,4300,.04,'square',.025);tone(4400,4400,.04,'square',.02)}
 else if(t==='wind'){noise(1.2,420,.09)}
 else if(t==='rumble'){noise(1.4,160,.25);tone(55,40,1,'sawtooth',.05)}
 else if(t==='win'){tone(523,520,.45,'triangle',.15);tone(659,655,.45,'triangle',.12);tone(784,780,.55,'triangle',.12)}
}catch(e){}}
function editBlock(w,tx,ty,d){var kw=(tx-W/2)+','+(ty-H/2),k=tx+','+ty;if(editBlock.last===k+d)return;editBlock.last=k+d;if(!w.ed)w.ed={};var cur=w.ed[kw]||0,nx=cur+d;
 if(nx>6||nx<-4){msg(d>0?'Altura máxima de construcción.':'Has llegado al fondo.');return}
 if(w.grid[k]||(w.rocket&&Math.abs(w.rocket.x-tx)<2&&Math.abs(w.rocket.y-ty)<2)){msg('Hay una estructura aquí.');return}
 var dist=Math.hypot(tx+.5-S.px,ty+.5-S.py);if(dist>7){msg('Demasiado lejos.');return}
 if(d>0&&dist<.9){msg('Aléjate para colocar un bloque.');return}
 for(var i=0;i<w.nodes.length;i++){var n=w.nodes[i];if(n.a>0&&Math.floor(n.x)===tx&&Math.floor(n.y)===ty)return}
 if(d>0){if((S.inv.silicio||0)<1){msg('Un bloque cuesta 1 💎 Sílice.');return}S.inv.silicio-=1;snd('place')}
 else{snd(S.pl==='tierra'?'dirt':'stone');if(used()<cap()){var ks=Object.keys(P[S.pl].r),rr=rng((hs(kw)^S.seed^(cur+9))|0)(),a=0,g=ks[0];for(var q=0;q<ks.length;q++){a+=P[S.pl].r[ks[q]];if(rr<=a){g=ks[q];break}}S.inv[g]+=1;msg('+1 '+RES[g][0]);setTimeout(function(){snd('m_'+g,.7)},110)}else msg('Inventario lleno: el bloque se pierde.')}
 if(nx===0)delete w.ed[kw];else w.ed[kw]=nx;rebuildAt(tx-W/2,ty-H/2);burst(tx+.5-W/2,terrainHeight(tx-W/2+.5,ty-H/2+.5)+.2,ty+.5-H/2,d<0?(S.pl==='tierra'?0x6b4a2a:0x8a7a70):0xcfd6dc,10)}
function dummyEnd(){}

// El terreno se genera por bloques alrededor del jugador; así no existe un borde visible al explorar.
var TERRAIN_SIZE=48,TERRAIN_SEG=48,terrainChunks={},terrainCenterKey='';
var terrainMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.99,metalness:0,vertexColors:true});terrainMat.map=makeAtlas();
// Procedural grass blades make Earth visibly green at ground level, not just a tinted flat texture.
// Geometry is batched once per terrain chunk to keep the open world lightweight.
function addEarthGrass(ground,cx,cz,centerX,centerZ){
 if(S.pl!=='tierra')return;
 var r=rng((hs('earth-grass-'+cx+'-'+cz+'-v2')^S.seed)|0),positions=[],colors=[];
 var palette=[0x285a26,0x34732c,0x467f31,0x5d913a,0x789f42,0x8eae4c];
 var tipLight=new THREE.Color(0xb0c963);
 function vertex(x,z,y,col){positions.push(x-centerX,-(z-centerZ),y);colors.push(col.r,col.g,col.b)}
 for(var i=0;i<470;i++){
  var x=cx*TERRAIN_SIZE+r()*TERRAIN_SIZE,z=cz*TERRAIN_SIZE+r()*TERRAIN_SIZE;
  // Keep the initial launch/work area clear; slightly clump grass so the surface reads as natural ground.
  if(Math.hypot(x,z)<4.9)continue;
  if(terrainNoise(x,z,6.8,89)>.30&&r()<.66)continue;
  var baseY=terrainHeight(x,z)+.012;
  for(var b=0;b<3;b++){
   var angle=r()*Math.PI*2,len=.105+r()*.16,width=.012+r()*.018;
   var sideX=Math.cos(angle+Math.PI/2)*width,sideZ=Math.sin(angle+Math.PI/2)*width;
   var leanX=Math.cos(angle)*len*.28,leanZ=Math.sin(angle)*len*.28;
   var col=new THREE.Color(palette[Math.floor(r()*palette.length)]),tip=col.clone().lerp(tipLight,.25);
   vertex(x-sideX,z-sideZ,baseY,col);
   vertex(x+sideX,z+sideZ,baseY,col);
   vertex(x+leanX,z+leanZ,baseY+len,tip);
  }
 }
 if(!positions.length)return;
 var grassGeo=new THREE.BufferGeometry();
 grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 grassGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 grassGeo.computeVertexNormals();
 var grass=new THREE.Mesh(grassGeo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.96,metalness:0}));
 grass.castShadow=false;grass.receiveShadow=false;grass.frustumCulled=true;grass.userData.earthGrass=true;
 ground.add(grass);
}
function makeTerrainChunk(cx,cz){
 var N=TERRAIN_SIZE,x0=cx*N,z0=cz*N,cX=(cx+.5)*N,cZ=(cz+.5)*N,HH=[],i,j;
 for(j=-1;j<=N;j++){HH[j+1]=[];for(i=-1;i<=N;i++)HH[j+1][i+1]=terrainHeight(x0+i+.5,z0+j+.5)}
 var BI={tierra:[[.3,.52,.2],[.45,.7,.26]],luna:[[.5,.5,.54],[.72,.72,.76]],marte:[[.6,.3,.2],[.8,.42,.27]],venus:[[.62,.42,.2],[.82,.58,.28]]}[S.pl];
 var SD=S.pl==='tierra'?[.4,.27,.16]:[BI[0][0]*.7,BI[0][1]*.7,BI[0][2]*.7],pos=[],nor=[],col=[],idx=[],uv=[],wp=[],wi=[];
 function quad(A,B,C,D,n,c){var u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],v=[C[0]-A[0],C[1]-A[1],C[2]-A[2]],d=(u[1]*v[2]-u[2]*v[1])*n[0]+(u[2]*v[0]-u[0]*v[2])*n[1]+(u[0]*v[1]-u[1]*v[0])*n[2],q=d<0?[A,D,C,B]:[A,B,C,D],o=pos.length/3;
  var u0=n[2]===1?0:.5;for(var k=0;k<4;k++){var UV=[[.01,.01],[.49,.01],[.49,.99],[.01,.99]][k];uv.push(u0+UV[0],UV[1]);pos.push(q[k][0],q[k][1],q[k][2]);nor.push(n[0],n[1],n[2]);col.push(c[0],c[1],c[2])}idx.push(o,o+1,o+2,o,o+2,o+3)}
 for(j=0;j<N;j++)for(i=0;i<N;i++){
  var wx=x0+i+.5,wz=z0+j+.5,h=HH[j+1][i+1],lx=i+x0-cX,lx1=lx+1,ya=-(j+z0+1-cZ),yb=-(j+z0-cZ);
  var tt=Math.max(0,Math.min(1,.5+(terrainNoise(wx,wz,38,5)+terrainNoise(wx,wz,9,17)*.45)*1.2+h*.25)),va=.9+((Math.sin(wx*12.9898+wz*78.233)*43758.5453)%1+1)%1*.2,c=[0,0,0],sc=[SD[0]*va,SD[1]*va,SD[2]*va];
  for(var q=0;q<3;q++)c[q]=(BI[0][q]+(BI[1][q]-BI[0][q])*tt)*va;
  var sn=h>.6;
  if(S.pl==='tierra'){if(h<WL+.3)c=[.84*va,.76*va,.48*va];else if(h>.95)c=[.95*va,.97*va,1*va];else if(sn){var m2=(h-.6)/.35;for(q=0;q<3;q++)c[q]=c[q]*(1-m2)+.6*va*m2}}
  else if(sn){var m3=Math.min(1,(h-.6)/.4);for(q=0;q<3;q++)c[q]=c[q]*(1-m3*.5)+.5*va*m3*.5}
  quad([lx,ya,h],[lx1,ya,h],[lx1,yb,h],[lx,yb,h],[0,0,1],c);
  if(h<WL&&WMAT[S.pl]){var wo=wp.length/3;wp.push(lx,ya,WL,lx1,ya,WL,lx1,yb,WL,lx,yb,WL);wi.push(wo,wo+1,wo+2,wo,wo+2,wo+3)}
  var nb=[[HH[j+1][i+2],[lx1,ya],[lx1,yb],[1,0,0]],[HH[j+1][i],[lx,ya],[lx,yb],[-1,0,0]],[HH[j+2][i+1],[lx,ya],[lx1,ya],[0,-1,0]],[HH[j][i+1],[lx,yb],[lx1,yb],[0,1,0]]];
  for(var e=0;e<4;e++){var hn=nb[e][0];if(hn<h-.001)quad([nb[e][1][0],nb[e][1][1],hn],[nb[e][2][0],nb[e][2][1],hn],[nb[e][2][0],nb[e][2][1],h],[nb[e][1][0],nb[e][1][1],h],nb[e][3],sc)}
 }
 var geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);
 var mesh=new THREE.Mesh(geo,terrainMat);mesh.rotation.x=-Math.PI/2;mesh.position.set(cX,0,cZ);mesh.receiveShadow=true;mesh.castShadow=true;mesh.frustumCulled=false;
 mesh.userData.terrainChunk=true;
 if(wp.length){var wg=new THREE.BufferGeometry(),wn=[];for(var z=0;z<wp.length/3;z++)wn.push(0,0,1);wg.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));wg.setAttribute('normal',new THREE.Float32BufferAttribute(wn,3));wg.setIndex(wi);var wm=new THREE.Mesh(wg,WMAT[S.pl]);wm.frustumCulled=false;mesh.add(wm)}
 scene.add(mesh);return mesh
}
function disposeTerrainChunk(mesh){scene.remove(mesh);mesh.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.userData&&o.userData.earthGrass&&o.material)o.material.dispose()})}
function updateTerrainChunks(force){
 if(force){for(var old in terrainChunks){disposeTerrainChunk(terrainChunks[old]);delete terrainChunks[old]}terrainCenterKey=''}
 var wx=T(S.px),wz=Z(S.py),cx=Math.floor(wx/TERRAIN_SIZE),cz=Math.floor(wz/TERRAIN_SIZE),key=cx+','+cz;
 if(!force&&key===terrainCenterKey)return;
 terrainCenterKey=key;
 var wanted={};
 for(var dz=-2;dz<=2;dz++)for(var dx=-2;dx<=2;dx++){
  var tx=cx+dx,tz=cz+dz,k=tx+','+tz;wanted[k]=1;
  if(!terrainChunks[k])terrainChunks[k]=makeTerrainChunk(tx,tz)
 }
 for(var old in terrainChunks)if(!wanted[old]){disposeTerrainChunk(terrainChunks[old]);delete terrainChunks[old]}
}
var sp=[],r0=rng(3);for(var i=0;i<500;i++){var a=r0()*6.28,b=Math.acos(r0()*.9+.1);sp.push(100*Math.sin(b)*Math.cos(a),100*Math.cos(b),100*Math.sin(b)*Math.sin(a))}
var sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
var stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:.5,fog:false}));scene.add(stars);
var texC={},bumpC={};
function gtex(k){
 if(texC[k])return texC[k];
 var c=document.createElement('canvas');c.width=c.height=512;
 var x=c.getContext('2d'),r=rng(hs(k+'-surface-texture')),p=P[k];
 if(k==='tierra'){
  // Periodic multiscale noise creates continuous soil mottling without obvious painted streaks.
  function field(cells){var data=new Float32Array(cells*cells);for(var i=0;i<data.length;i++)data[i]=r();return function(px,py){var ux=px/512*cells,uy=py/512*cells,ix=Math.floor(ux),iy=Math.floor(uy),fx=ux-ix,fy=uy-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);var x0=((ix%cells)+cells)%cells,x1=(x0+1)%cells,y0=((iy%cells)+cells)%cells,y1=(y0+1)%cells,a=data[y0*cells+x0],b=data[y0*cells+x1],cc=data[y1*cells+x0],d=data[y1*cells+x1];return(a+(b-a)*fx)*(1-fy)+(cc+(d-cc)*fx)*fy}}
  var f1=field(9),f2=field(23),f3=field(58),f4=field(150),img=x.createImageData(512,512),px=img.data;
  var br=parseInt(p.c.slice(1,3),16),bg=parseInt(p.c.slice(3,5),16),bb=parseInt(p.c.slice(5,7),16);
  for(var yy=0;yy<512;yy++)for(var xx=0;xx<512;xx++){var coarse=f1(xx,yy),mid=f2(xx,yy),small=f3(xx,yy),grain=f4(xx,yy);var v=(coarse-.5)*40+(mid-.5)*29+(small-.5)*18+(grain-.5)*11;var i=(yy*512+xx)*4;px[i]=Math.max(0,Math.min(255,br+v*1.12+(mid-.5)*3));px[i+1]=Math.max(0,Math.min(255,bg+v*.94+(coarse-.5)*4));px[i+2]=Math.max(0,Math.min(255,bb+v*.72+(small-.5)*3));px[i+3]=255}
  x.putImageData(img,0,0);
  // Blotches of compacted earth are wrapped over texture edges to prevent visible seams.
  function wrapEllipse(cx,cy,rx,ry,rot,fill){
   var xs=[0],ys=[0];if(cx-rx<0)xs.push(512);if(cx+rx>512)xs.push(-512);if(cy-ry<0)ys.push(512);if(cy+ry>512)ys.push(-512);
   x.fillStyle=fill;for(var xi=0;xi<xs.length;xi++)for(var yi=0;yi<ys.length;yi++){x.beginPath();x.ellipse(cx+xs[xi],cy+ys[yi],rx,ry,rot,0,Math.PI*2);x.fill()}
  }
  for(var e=0;e<230;e++){var xx2=r()*512,yy2=r()*512,rx=3+r()*24,ry=2+r()*13;var shade=r()<.58?'rgba(42,34,23,':'rgba(210,185,139,';var alpha=.045+r()*.085;wrapEllipse(xx2,yy2,rx,ry,r()*Math.PI,shade+alpha+')')}
  // Fine mineral grains plus larger embedded grit give the ground a readable scale.
  for(var g=0;g<2600;g++){var gx=r()*512,gy=r()*512,gs=.35+r()*1.45;wrapEllipse(gx,gy,gs,gs*(.45+r()*.7),r()*Math.PI,r()<.55?'rgba(37,31,23,'+(0.10+r()*.17)+')':'rgba(231,213,174,'+(0.08+r()*.18)+')')}
  for(var pe=0;pe<125;pe++){var ex=r()*512,ey=r()*512,er=1.4+r()*3.8;wrapEllipse(ex,ey,er,er*(.45+r()*.45),r()*Math.PI,r()<.5?'rgba(47,42,33,.28)':'rgba(220,203,166,.30)')}
  // Thousands of fine, muted green grass strokes break up bare dirt and give Earth a readable grassy surface.
  for(var blade=0;blade<6200;blade++){
   var gx=r()*512,gy=r()*512,len=1.5+r()*7.5,ang=(r()-.5)*Math.PI*2,dx=Math.cos(ang)*len*.5,dy=Math.sin(ang)*len;
   var shade=r();x.strokeStyle=shade<.34?'rgba(24,61,25,.47)':shade<.66?'rgba(47,96,34,.42)':shade<.87?'rgba(87,132,48,.42)':'rgba(166,191,91,.40)';
   x.lineWidth=.45+r()*.65;x.beginPath();x.moveTo(gx,gy);x.quadraticCurveTo(gx+dx*.35-r()*1.1,gy+dy*.58,gx+dx,gy+dy);x.stroke();
  }
  // Irregular mossy patches make the greens vary naturally instead of reading as a flat green paint.
  for(var moss=0;moss<105;moss++){
   var mx=r()*512,my=r()*512,mr=3+r()*17,mh=2+r()*10;
   wrapEllipse(mx,my,mr,mh,r()*Math.PI,r()<.5?'rgba(31,75,28,.15)':'rgba(127,164,67,.14)');
  }
 }else{
  x.fillStyle=p.c;x.fillRect(0,0,512,512);
  // Natural low-contrast mineral mottling.
  for(var i=0;i<1750;i++){var rad=2+r()*22,xx=r()*512,yy=r()*512;x.fillStyle=r()<.55?'rgba(12,10,8,'+(0.025+r()*.075)+')':'rgba(255,244,220,'+(0.015+r()*.05)+')';x.beginPath();x.ellipse(xx,yy,rad,rad*(.35+r()*.9),r()*3.14,0,Math.PI*2);x.fill()}
  for(var j=0;j<72;j++){x.strokeStyle=r()<.5?'rgba(20,18,15,.045)':'rgba(255,235,205,.035)';x.lineWidth=1+r()*3;x.beginPath();var yy2=r()*512;x.moveTo(0,yy2);x.bezierCurveTo(120,r()*512,360,r()*512,512,r()*512);x.stroke()}
  if(k!=='tierra'){for(var q=0;q<(k==='luna'?36:22);q++){var cx=r()*512,cyy=r()*512,rr=5+r()*31;var gr=x.createRadialGradient(cx-rr*.25,cyy-rr*.3,rr*.08,cx,cyy,rr);gr.addColorStop(0,'rgba(255,245,220,.02)');gr.addColorStop(.68,'rgba(20,16,12,.09)');gr.addColorStop(.82,'rgba(245,225,195,.16)');gr.addColorStop(1,'rgba(15,12,10,.04)');x.fillStyle=gr;x.beginPath();x.arc(cx,cyy,rr,0,Math.PI*2);x.fill();x.strokeStyle='rgba(25,20,16,.16)';x.lineWidth=1+r()*2;x.beginPath();x.arc(cx,cyy,rr*.78,0,Math.PI*2);x.stroke()}}
 }
 var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=8;t.repeat.set(k==='tierra'?8:7,k==='tierra'?8:7);texC[k]=t;
 // Use the soil texture as a restrained relief map, not a deep displacement-like bump.
 var bc=document.createElement('canvas');bc.width=bc.height=512;var bx2=bc.getContext('2d');bx2.drawImage(c,0,0);var bt=new THREE.CanvasTexture(bc);bt.wrapS=bt.wrapT=THREE.RepeatWrapping;bt.repeat.copy(t.repeat);bt.anisotropy=4;bumpC[k]=bt;return t
}
var terrainProps=new THREE.Group();scene.add(terrainProps);
function scatterTerrain(k){scatterTerrain0(k);scatterExtras(k);scatterDetail(k)}
function scatterTerrain0(k){
 while(terrainProps.children.length)terrainProps.remove(terrainProps.children[0]);
 var r=rng((hs(k+'-surface')^S.seed)|0),colors=k==='marte'?[0x6d3022,0x8c422c,0x9d5a3a]:k==='luna'?[0x666873,0x85858b,0x4d5058]:k==='venus'?[0x98602b,0xb87b37,0x704824]:[0x51483d,0x75664f,0x8c8067],rocks=[],world=wd(k);
 function closeToDeposit(x,z,d){for(var q=0;q<world.nodes.length;q++){var n=world.nodes[q];if(n.a>0&&Math.hypot(T(n.x)-x,Z(n.y)-z)<d)return true}return false}
 // Sparse, separated surface stones leave the collectible mineral clusters easy to see.
 for(var i=0;i<175;i++){
  var x=(r()*W-W/2),z=(r()*H-H/2);if(Math.hypot(x,z)<5.5)continue;
  var size=.07+Math.pow(r(),2)*.52,ok=true;
  if(closeToDeposit(x,z,1.25+size))continue;
  for(var q=0;q<rocks.length;q++)if(Math.hypot(rocks[q].x-x,rocks[q].z-z)<1.55+size){ok=false;break}if(!ok)continue;
  var geo=r()<.55?new THREE.DodecahedronGeometry(size,0):new THREE.IcosahedronGeometry(size,0),mat=new THREE.MeshStandardMaterial({color:colors[Math.floor(r()*colors.length)],roughness:.95,metalness:.01,flatShading:true});
  var rock=new THREE.Mesh(geo,mat);rock.rotation.set(r()*.7,r()*6.28,r()*.7);rock.scale.set(.7+r()*.9,.35+r()*.5,.7+r()*.8);rock.position.set(x,terrainHeight(x,z)+size*rock.scale.y*.72,z);rock.castShadow=true;rock.receiveShadow=true;terrainProps.add(rock);rocks.push({x:x,z:z})
 }
 // Fine gravel remains subtle and is kept away from the central work pad and deposits.
 for(var j=0;j<260;j++){var px=r()*W-W/2,pz=r()*H-H/2;if(Math.hypot(px,pz)<4.8||closeToDeposit(px,pz,.8))continue;var pr=.025+r()*.065,peb=new THREE.Mesh(new THREE.IcosahedronGeometry(pr,0),new THREE.MeshStandardMaterial({color:colors[Math.floor(r()*colors.length)],roughness:1,flatShading:true}));peb.scale.y=.35+r()*.4;peb.position.set(px,terrainHeight(px,pz)+pr*peb.scale.y*.72,pz);peb.rotation.y=r()*6.28;terrainProps.add(peb)}
}
var ICT={};function icoTex(k){if(ICT[k])return ICT[k];var c=document.createElement('canvas');c.width=c.height=96;var x=c.getContext('2d');x.fillStyle='rgba(8,14,26,.78)';x.beginPath();x.arc(48,48,44,0,7);x.fill();x.strokeStyle=RES[k][1];x.lineWidth=5;x.stroke();x.font='48px serif';x.textAlign='center';x.textBaseline='middle';x.fillText(RI[k],48,52);var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return ICT[k]=t}
var MC={},CT=null;
function ctex(){if(CT)return CT;var c=document.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d'),r=rng(9);x.fillStyle='#bbb';x.fillRect(0,0,128,128);for(var i=0;i<1400;i++){var v=120+r()*110|0;x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(r()*128,r()*128,1+r()*3,1+r()*3)}CT=new THREE.CanvasTexture(c);CT.wrapS=CT.wrapT=THREE.RepeatWrapping;CT.encoding=THREE.sRGBEncoding;return CT}
var PB={0x66727d:[.12,.82,1],0x7c8995:[.18,.72,1],0x8a5a34:[.28,.78,0],0x5d3a1f:[.22,.84,0],0xdde5ea:[.62,.28,0],0xf2f5f7:[.38,.32,0],0xc9442b:[.48,.48,0],0x1b3b72:[.72,.24,0],0x4a545e:[.7,.48,0],0xcfd8de:[.72,.3,0],0x2b2f33:[.55,.58,1],0xd4402a:[.48,.48,0]};
function M(c){if(MC[c])return MC[c];var p=PB[c]||[.5,.5,0],o={color:c,metalness:p[0],roughness:p[1],envMapIntensity:.5};if(!p[2]){var cc=new THREE.Color(c);cc.offsetHSL(0,.18,0);o.color=cc;o.emissive=cc.clone();o.emissiveIntensity=.12}if(p[2]){o.map=ctex();o.bumpMap=ctex();o.bumpScale=.8}return MC[c]=new THREE.MeshStandardMaterial(o)}
function sh(o){o.traverse(function(m){if(m.isMesh){m.castShadow=true;m.receiveShadow=true}})}
function bx(w,h,d,c,x,y,z){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(x,y,z);return m}
function cy(r,h,c,x,y,z,rt){var m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),M(c));m.position.set(x,y,z);return m}
function mkTile(t){var g=new THREE.Group();
if(t==='plat'){g.add(bx(1,.14,1,0x66727d,0,.07,0),bx(.84,.05,.84,0x7c8995,0,.15,0))}
else if(t==='torre'){g.add(bx(.3,3.4,.3,0xc9442b,-.3,1.7,0),bx(.3,3.4,.3,0xc9442b,.3,1.7,0));for(var i=0;i<6;i++)g.add(bx(.9,.06,.06,0xffd0c4,0,.4+i*.55,0));g.add(bx(1.3,.12,.12,0xff6b3d,.3,2.6,0))}
else if(t==='tanque'){g.add(cy(.4,1.3,0xdde5ea,0,.65,0),bx(.82,.14,.82,0xff6b3d,0,.5,0).clone());g.children[1].geometry=new THREE.CylinderGeometry(.42,.42,.14,12)}
else if(t==='refineria'){g.add(bx(.9,.8,.9,0x4a545e,0,.4,0),cy(.1,1.2,0x2f3840,.25,1.2,.25),bx(.3,.3,.05,0xffb347,-.2,.4,.46))}
else if(t==='solar'){var p=bx(.95,.05,.95,0x1b3b72,0,.45,0);p.rotation.x=-.4;g.add(p,cy(.04,.45,0xaaaaaa,0,.22,0))}
else if(t==='para'){g.add(cy(.03,2,0xcfd8de,0,1,0));var s=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),M(0xffd24a));s.position.y=2.05;g.add(s)}
else if(t==='defl'){g.add(bx(1,.1,1,0x2b2f33,0,.05,0),bx(.2,.12,.8,0xff9a2e,-.3,.1,0),bx(.2,.12,.8,0xff9a2e,.3,.1,0))}
else if(t==='cofre'){g.add(bx(.74,.4,.52,0x7a8794,0,.2,0),bx(.78,.16,.56,0x5b6772,0,.48,0),bx(.08,.42,.54,0xc98a3d,-.24,.21,0),bx(.08,.42,.54,0xc98a3d,.24,.21,0),bx(.12,.14,.06,0xffd24a,0,.4,.3))}
else if(t==='alm'){g.add(bx(.92,.7,.92,0x8a5a34,0,.35,0),bx(.95,.06,.95,0x5d3a1f,0,.72,0))}
return g}
function mkRocket(){
 var g=new THREE.Group();
 // Stainless/aluminium first stage with subtle panel seams.
 g.add(cy(.29,2.42,0xdde5ea,0,1.39,0));
 g.add(cy(.294,.035,0x66727d,0,.32,0),cy(.294,.035,0x66727d,0,.68,0),cy(.294,.035,0x66727d,0,1.92,0),cy(.294,.035,0x66727d,0,2.34,0));
 g.add(cy(.295,.09,0x7c8995,0,.15,0));
 var nose=new THREE.Mesh(new THREE.ConeGeometry(.29,.78,24),M(0xe8eef2));nose.position.y=2.99;g.add(nose);
 // Dark interstage band and lower engine skirt.
 g.add(cy(.30,.18,0x4a545e,0,.25,0));
 g.add(cy(.22,.22,0x2b2f33,0,.07,0));
 // Four simplified engine bells.
 for(var en=0;en<4;en++){var a=en*Math.PI/2,ex=Math.cos(a)*.13,ez=Math.sin(a)*.13;
  var bell=new THREE.Mesh(new THREE.CylinderGeometry(.045,.085,.18,12),M(0x2b2f33));bell.position.set(ex,-.09,ez);g.add(bell);
  var rim=cy(.087,.025,0x7c8995,ex,-.18,ez);g.add(rim)
 }
 // Small dark portholes, access panels and restrained warning bands.
 for(var w=0;w<3;w++){var win=new THREE.Mesh(new THREE.CircleGeometry(.045,16),new THREE.MeshStandardMaterial({color:0x173044,metalness:.7,roughness:.22}));win.position.set(0,1.55+w*.23,.292);g.add(win)}
 g.add(bx(.12,.23,.012,0xc9442b,.17,1.12,.294),bx(.06,.16,.012,0x66727d,-.15,1.25,.294));
 // Four aerodynamic grid/landing fins.
 for(var i=0;i<4;i++){var fin=bx(.16,.45,.055,0x4a545e,0,.48,0);var pivot=new THREE.Group();pivot.add(fin);fin.position.set(.31,.05,0);pivot.rotation.y=i*Math.PI/2;g.add(pivot)}
 var fl=new THREE.Mesh(new THREE.ConeGeometry(.20,1.25,14),new THREE.MeshBasicMaterial({color:0xffa34a,transparent:true,opacity:.85}));fl.rotation.x=Math.PI;fl.position.y=-.28;fl.visible=false;fl.name='fl';g.add(fl);
 return g
}
var pm=new THREE.Group();
pm.add(bx(.23,.12,.28,0x2b2f33,-.09,.08,.02),bx(.23,.12,.28,0x2b2f33,.09,.08,.02));
pm.add(bx(.38,.46,.25,0xe8eef2,0,.39,0));
pm.add(bx(.18,.38,.18,0xdde5ea,-.13,.39,0),bx(.18,.38,.18,0xdde5ea,.13,.39,0));
pm.add(bx(.22,.32,.18,0x4a545e,0,.43,-.2),bx(.3,.2,.12,0x2b2f33,0,.58,-.22));
var helmet=bx(.4,.4,.4,0xe8eef2,0,0,0);helmet.position.set(0,.79,0);pm.add(helmet);
var visor=bx(.3,.14,.05,0x152c40,0,0,0);visor.position.set(0,.8,.21);visor.rotation.x=0;pm.add(visor);
pm.add(bx(.1,.14,.035,0xd4402a,.17,.48,.135),bx(.12,.12,.04,0x1b3b72,-.17,.48,.135));
pm.add(bx(.035,.42,.025,0x66727d,-.07,.4,.135),bx(.035,.42,.025,0x66727d,.07,.4,.135));
var chestScreen=bx(.12,.09,.025,0x173044,0,.48,.145);pm.add(chestScreen);
var visorGlint=bx(.11,.018,.008,0x9dc8dc,0,.87,.235);visorGlint.rotation.z=-.2;pm.add(visorGlint);
sh(pm);scene.add(pm);
// Guante mecánico de expedición en cámara: silueta industrial propia de Cosmódromo.
var fpHand=new THREE.Group();
fpHand.add(bx(.19,.30,.19,0x17283b,0,0,0),bx(.15,.20,.16,0x596d80,0,-.19,-.035),bx(.16,.075,.12,0xd4402a,0,-.055,.075),bx(.075,.04,.025,0x8ed8e8,0,.025,.105),bx(.10,.05,.08,0x202f43,0,-.28,-.015));
fpHand.position.set(.47,-.37,-.68);fpHand.rotation.z=.14;sh(fpHand);cam.add(fpHand);
var ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.05,6,24),new THREE.MeshBasicMaterial({color:0xffd24a}));ring.rotation.x=Math.PI/2;ring.visible=false;scene.add(ring);
var ghost=new THREE.Mesh(new THREE.BoxGeometry(1,.3,1),new THREE.MeshBasicMaterial({color:0x57d39a,transparent:true,opacity:.45}));ghost.visible=false;scene.add(ghost);
var boom=new THREE.Mesh(new THREE.SphereGeometry(1,16,16),new THREE.MeshBasicMaterial({color:0xff8a2e,transparent:true}));boom.visible=false;scene.add(boom);
function T(x){return x-W/2}function Z(y){return y-H/2}
function nm(c,o){o=o||{};return new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:o.r==null?.45:o.r,metalness:o.m||.1,emissive:o.e==null?c:o.e,emissiveIntensity:o.i==null?.3:o.i,transparent:!!o.t,opacity:o.t||1})}
function mkNode(t){var g=new THREE.Group(),i,m;
if(t==='hierro'){m=new THREE.Mesh(new THREE.DodecahedronGeometry(.52,1),nm(0x6d5140,{r:.94,i:.025}));m.scale.set(1.1,.8,1);m.position.y=.4;g.add(m);
for(i=0;i<5;i++){var o=new THREE.Mesh(new THREE.IcosahedronGeometry(.13+i%2*.05),nm(0x986b4d,{m:.12,r:.88,i:.025}));o.position.set(Math.cos(i*1.3)*.42,.35+i%3*.14,Math.sin(i*1.3)*.4);g.add(o)}}
else if(t==='silicio'){for(i=0;i<5;i++){m=new THREE.Mesh(new THREE.OctahedronGeometry(.28),nm(0x7b9cae,{r:.22,m:.12,i:.05}));m.scale.set(.8,2.3-i*.2,.8);m.position.set(Math.cos(i*1.26)*.28*(i>0),.55+(i===0?.2:0)+.0,Math.sin(i*1.26)*.28*(i>0));m.rotation.z=(i>0?.35:0)*Math.cos(i);m.rotation.x=(i>0?.35:0)*Math.sin(i);g.add(m)}}
else if(t==='agua'){for(i=0;i<5;i++){m=new THREE.Mesh(new THREE.CylinderGeometry(.04,.2,1.1-i*.12,6),nm(0x9bbdc4,{r:.14,m:.05,i:.04,t:.78}));m.position.set(Math.cos(i*1.26)*.3*(i>0),.5-i*.04,Math.sin(i*1.26)*.3*(i>0));m.rotation.z=(i>0?.3:0)*Math.cos(i);m.rotation.x=(i>0?.3:0)*Math.sin(i);g.add(m)}}
else if(t==='cobre'){m=new THREE.Mesh(new THREE.DodecahedronGeometry(.5,1),nm(0x5a4a40,{r:.9,i:.02}));m.scale.set(1.15,.75,1);m.position.y=.34;g.add(m);for(i=0;i<6;i++){var v=new THREE.Mesh(new THREE.IcosahedronGeometry(.1+i%3*.03),nm(i%2?0x2f9e7a:0xc8742f,{r:.4,m:.75,i:.04}));v.position.set(Math.cos(i*1.05)*.4,.3+i%3*.12,Math.sin(i*1.05)*.38);g.add(v)}}
else if(t==='titanio'){for(i=0;i<4;i++){m=new THREE.Mesh(new THREE.BoxGeometry(.5-i*.06,.34,.4),nm(0x8d99a6,{r:.35,m:.85,i:.03}));m.position.set(Math.cos(i*1.6)*.25*(i>0),.17+i*.3,Math.sin(i*1.6)*.25*(i>0));m.rotation.set(i*.3,i*1.1,i*.2);g.add(m)}}
else if(t==='litio'){m=new THREE.Mesh(new THREE.DodecahedronGeometry(.48,0),nm(0xdfd7d2,{r:.85,i:.02}));m.scale.set(1.2,.7,1);m.position.y=.32;g.add(m);for(i=0;i<5;i++){var q2=new THREE.Mesh(new THREE.OctahedronGeometry(.13),nm(0xe88aa8,{r:.2,m:.1,i:.08,t:.9}));q2.scale.set(.7,1.9,.7);q2.position.set(Math.cos(i*1.26)*.34,.5,Math.sin(i*1.26)*.34);q2.rotation.z=Math.cos(i)*.4;g.add(q2)}}
else{for(i=0;i<3;i++){m=new THREE.Mesh(new THREE.DodecahedronGeometry(.4-i*.07),nm(0x39343d,{r:.82,m:.08,e:0x35303b,i:.025}));m.position.set(Math.cos(i*2.1)*.38*(i>0),.28+(i===0?.1:0),Math.sin(i*2.1)*.38*(i>0));m.rotation.set(i,i*2,0);g.add(m)}
for(i=0;i<3;i++){var q=new THREE.Mesh(new THREE.OctahedronGeometry(.1),nm(0x77717e,{r:.32,m:.1,i:.05}));q.position.set(Math.cos(i*2.4+1)*.3,.5+i*.08,Math.sin(i*2.4+1)*.3);g.add(q)}}
g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}

function resourceMarker(type){var tex=icoTex(type),mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}),sp=new THREE.Sprite(mat);sp.scale.set(.62,.62,1);sp.position.y=1.65;sp.userData.resourceMarker=true;return sp}
function makeNodeVisible(n){if(!n||n.a<=0||n.m)return;var m=mkNode(n.t);m.userData.resourceNode=n;m.position.set(T(n.x),terrainHeight(T(n.x),Z(n.y)),Z(n.y));m.rotation.y=n.x*7;m.add(resourceMarker(n.t));dyn.add(m);n.m=m}
function spawnChunk(cx,cy,w){var key=cx+','+cy;if(w.chunks[key])return;w.chunks[key]=1;var r=rng((hs(S.pl+'-chunk-'+key+'-v4')^S.seed)|0),ks=Object.keys(P[S.pl].r),added=0,tries=0;while(added<7&&tries++<180){var x=cx*24+2+r()*20,y=cy*24+2+r()*20,ok=true;if(Math.hypot(x-S.px,y-S.py)<5)continue;for(var i=0;i<w.nodes.length;i++)if(Math.hypot(w.nodes[i].x-x,w.nodes[i].y-y)<3.6){ok=false;break}if(!ok)continue;var v=r(),sum=0,t=ks[0];for(var j=0;j<ks.length;j++){sum+=P[S.pl].r[ks[j]];if(v<=sum){t=ks[j];break}}var n={x:x,y:y,t:t,a:7+Math.floor(r()*9),t0:0,sz:.82+r()*.32};w.nodes.push(n);makeNodeVisible(n);added++}}
function streamResources(){var w=wd(),cx=Math.floor(S.px/24),cy=Math.floor(S.py/24);for(var y=cy-1;y<=cy+1;y++)for(var x=cx-1;x<=cx+1;x++)spawnChunk(x,y,w)}
function loadWorld(){
while(dyn.children.length)dyn.remove(dyn.children[0]);gm={};nodeM=[];rocketM=null;var w=wd(),p=P[S.pl];
scene.background=new THREE.Color(p.sky);terrainMat.bumpMap=null;terrainMat.needsUpdate=true;updateTerrainChunks(true);
var fogColor=P[S.pl].sky;scene.fog=new THREE.Fog(fogColor,S.pl==='tierra'?48:35,S.pl==='venus'?72:105);
stars.visible=S.pl!=='tierra';scatterTerrain(S.pl);
w.nodes.forEach(function(n){n.m=null;if(n.a>0)makeNodeVisible(n)});
for(var k in w.grid)addTile(k,w.grid[k]);
if(w.rocket)setRocket(w.rocket)}
function addTile(k,t){var p=k.split(','),g=mkTile(t),x=T(+p[0]+.5),z=Z(+p[1]+.5);g.userData.tileKey=k;g.userData.tileType=t;g.position.set(x,terrainHeight(x,z),z);sh(g);dyn.add(g);gm[k]=g}
function setRocket(r){if(rocketM)dyn.remove(rocketM);rocketM=null;if(r){rocketM=mkRocket();rocketM.userData.isRocket=true;var rx=T(r.x+.5),rz=Z(r.y+.5);rocketM.position.set(rx,terrainHeight(rx,rz)+.15,rz);sh(rocketM);dyn.add(rocketM)}}
// ---- UI
var tb=$('tools');
// La barra de construcción anterior queda disponible en un cajón; la barra
// principal visible durante la partida es la barra rápida de 9 ranuras.
var toolDrawerOpen=false,toolDrawerButton=document.createElement('button');
toolDrawerButton.type='button';toolDrawerButton.className='s hud-tools-toggle';toolDrawerButton.id='hud-tools-toggle';
toolDrawerButton.textContent='⚒ Herramientas';toolDrawerButton.setAttribute('aria-expanded','false');
var botHead=document.createElement('div');botHead.id='hud-bottom-head';
botHead.appendChild($('hint'));botHead.appendChild(toolDrawerButton);$('bot').insertBefore(botHead,tb);
tb.style.display='none';
function setToolDrawer(open){toolDrawerOpen=!!open;tb.style.display=toolDrawerOpen?'flex':'none';toolDrawerButton.textContent=toolDrawerOpen?'✕ Cerrar herramientas':'⚒ Herramientas';toolDrawerButton.setAttribute('aria-expanded',String(toolDrawerOpen));cz.classList.toggle('hud-tools-open',toolDrawerOpen);}
toolDrawerButton.addEventListener('click',function(){setToolDrawer(!toolDrawerOpen)});
var engineBadge=document.createElement('span');engineBadge.id='engine-badge';engineBadge.textContent=window.CosmoCore&&window.CosmoCore.wasm?'NÚCLEO WASM':'NÚCLEO JS';$('pn').insertAdjacentElement('afterend',engineBadge);
var viewBtn=document.createElement('button');viewBtn.className='s';viewBtn.id='view-mode';viewBtn.type='button';viewBtn.textContent='Vista: Primera persona (V)';$('rs').parentNode.insertBefore(viewBtn,$('rs'));
var fpsReticle=document.createElement('div');fpsReticle.id='fps-reticle';fpsReticle.setAttribute('aria-hidden','true');fpsReticle.innerHTML='<i></i><b></b>';cz.appendChild(fpsReticle);
function setView(mode,notify){
 viewMode=mode==='orbit'?'orbit':'fps';
 cam.fov=viewMode==='fps'?79:50;cam.updateProjectionMatrix();
 viewBtn.textContent=viewMode==='fps'?'Vista: Primera persona (V)':'Vista: Seguimiento (V)';
 fpsReticle.style.display=viewMode==='fps'?'block':'none';
 if(viewMode==='orbit'&&document.pointerLockElement===cv&&document.exitPointerLock)document.exitPointerLock();
 if(viewMode==='orbit'){jumpY=0;jumpVel=0}
 if(notify!==false)msg(viewMode==='fps'?'Modo expedición: WASD, ratón, clic para minar y clic derecho para construir.':'Vista de seguimiento activada.');
}
viewBtn.addEventListener('click',function(){setView(viewMode==='fps'?'orbit':'fps')});
setView('fps',false);
// El avatar avanza hacia +Z cuando fpsYaw=0. Con esta parametrización,
// yaw creciente gira la mirada hacia +X (la izquierda de la pantalla), por eso
// el delta horizontal del puntero debe restarse. Ratón y tacto usan la misma función.
function rotateFPSFromPointer(dx,dy,sx,sy){fpsYaw-=dx*sx;fpsPitch-=dy*sy;fpsPitch=Math.max(-1.25,Math.min(1.15,fpsPitch));}
document.addEventListener('mousemove',function(e){if(viewMode!=='fps'||document.pointerLockElement!==cv)return;rotateFPSFromPointer(e.movementX,e.movementY,.0025,.0022);});
document.addEventListener('pointerlockchange',function(){if(viewMode==='fps'&&document.pointerLockElement===cv)msg('Ratón capturado · Esc libera el cursor.');});
var gb=document.createElement('button');gb.className='s';gb.id='gd';gb.textContent='❓ Guía (H)';$('rs').parentNode.insertBefore(gb,$('rs'));
var G=document.createElement('div');G.id='guide';G.className='h';
G.innerHTML='<div class="gbox"><button class="s" id="gx" style="float:right">✕ Cerrar</button><h2>🚀 Guía del juego</h2>'
+'<p>Eres el jefe de un cosmódromo. <b>Reúne materiales, diseña tu plataforma, construye el cohete y lánzalo</b> a otro planeta. Allí empiezas de cero.</p>'
+'<h3>Cómo se juega, paso a paso</h3><ol><li><b>Mina:</b> apunta a una roca o cristal y haz clic izquierdo (en móvil, usa el botón ⛏). La tecla <kbd>E</kbd> abre el inventario.</li><li><b>Construye la plataforma:</b> elige <i>Plataforma</i> en la barra inferior, apunta a un espacio libre y haz clic derecho (en móvil, usa +). Necesitas 4 o más.</li><li><b>Cohete:</b> elige <i>Cohete</i> y colócalo sobre una plataforma.</li><li><b>Torre:</b> colócala a 3 casillas o menos del cohete.</li><li><b>Combustible:</b> construye <i>Refinería + Panel solar</i> (misma cantidad) y <i>Tanques</i>. La refinería convierte Hielo en combustible.</li><li><b>Lanzar:</b> pulsa <i>Lanzar</i>, elige destino y pilota el vuelo en el simulador.</li></ol>'
+'<h3>Recursos</h3><div class="ggrid"><div class="gcard">🔩 <b>Hierro</b><br>Base de casi todo: plataformas, torres, tanques y cohete.</div><div class="gcard">💎 <b>Sílice</b><br>Paneles solares, refinería y electrónica del cohete.</div><div class="gcard">🧊 <b>Hielo</b><br>Se refina en combustible. Sin hielo no hay viaje.</div><div class="gcard">⚫ <b>Carbono</b><br>Fibra del cohete y deflectores de llama.</div></div>'
+'<h3>Módulos</h3><div class="ggrid"><div class="gcard"><b>⬛ Plataforma</b> · hormigón<br>Suelo del cohete.</div><div class="gcard"><b>🗼 Torre</b> · acero<br>Obligatoria para lanzar.</div><div class="gcard"><b>🛢️ Tanque</b> · aluminio<br>+60 de capacidad de combustible.</div><div class="gcard"><b>🏭 Refinería</b><br>Hielo → combustible. Necesita ☀️.</div><div class="gcard"><b>☀️ Panel solar</b><br>Da energía a la refinería.</div><div class="gcard"><b>⚡ Pararrayos</b><br>+7% de éxito al despegar (hasta 3).</div><div class="gcard"><b>🔥 Deflector</b><br>+3% de éxito (hasta 5).</div><div class="gcard"><b>📦 Almacén</b><br>+40 de espacio en la mochila.</div></div>'
+'<h3>Lanzamiento y vuelo</h3><p>Cuanto más seguro sea tu despegue, mejor. Si el lanzamiento falla, pierdes el cohete pero no la plataforma. En el simulador: <kbd>↑</kbd> o <kbd>W</kbd> más potencia, <kbd>↓</kbd> o <kbd>S</kbd> menos, <kbd>←</kbd> <kbd>→</kbd> para corregir rumbo y <kbd>Espacio</kbd> para estabilizar. Aterriza suave y recto.</p>'
+'<h3>Planetas</h3><p>Tierra, Luna, Marte y Venus tienen terreno y recursos distintos. Al llegar, tu carga viaja contigo; la plataforma no, así que tendrás que construir otra para volver.</p>'
+'<h3>Atajos</h3><p><kbd>WASD</kbd> mover · ratón mirar (clic en el mundo para capturarlo) · clic izq. minar · clic der. construir/poner bloques · <kbd>E</kbd> inventario (también <kbd>I</kbd>) · <kbd>Espacio</kbd> saltar · <kbd>Mayús</kbd> correr · <kbd>V</kbd> cambiar vista · <kbd>1</kbd>–<kbd>9</kbd> seleccionar barra rápida · rueda del ratón cambiar espacio · <kbd>H</kbd> guía. En móvil usa los controles táctiles y 🎒 para el inventario. Las herramientas de construcción están en el botón Herramientas.</p><div style="text-align:center;margin-top:14px"><button class="s" id="gok" style="background:#ff6b3d;border-color:#ff6b3d;color:#fff;padding:9px 22px">¡Entendido, a jugar!</button></div></div>';
cz.appendChild(G);
var fpsTouchControls=document.createElement('div');fpsTouchControls.id='fps-touch-controls';
fpsTouchControls.innerHTML='<div class="fps-pad"><button type="button" data-key="u" aria-label="Avanzar" title="Avanzar">▲</button><div><button type="button" data-key="l" aria-label="Mover a la izquierda" title="Izquierda">◀</button><button type="button" data-key="d" aria-label="Retroceder" title="Retroceder">▼</button><button type="button" data-key="r" aria-label="Mover a la derecha" title="Derecha">▶</button></div></div><div class="fps-actions"><button type="button" data-action="mine" aria-label="Picar (clic izquierdo)" title="Picar · clic izquierdo"><span>⛏</span><small>PICAR</small></button><button type="button" data-action="place" aria-label="Construir o poner bloque (clic derecho)" title="Construir / poner · clic derecho"><span>＋</span><small>PONER</small></button><button type="button" data-key="jump" aria-label="Saltar" title="Saltar"><span>↑</span><small>SALTAR</small></button><button type="button" data-key="s" aria-label="Correr" title="Correr"><span>⚡</span><small>CORRER</small></button><button type="button" data-action="inventory" aria-label="Abrir o cerrar inventario (E)" title="Inventario · E"><span>🎒</span><small>INVENTARIO</small></button></div>';
cz.appendChild(fpsTouchControls);
fpsTouchControls.addEventListener('pointerdown',function(e){var b=e.target.closest('button');if(!b)return;e.preventDefault();if(b.dataset.key){if(b.dataset.key==='jump')jumpQueued=true;else keys[b.dataset.key]=1}try{if(b.setPointerCapture)b.setPointerCapture(e.pointerId)}catch(ignore){}});
fpsTouchControls.addEventListener('pointerup',function(e){var b=e.target.closest('button');if(b&&b.dataset.key&&b.dataset.key!=='jump'){keys[b.dataset.key]=0}if(!b||!b.dataset.action)return;if(b.dataset.action==='inventory'){toggleInventory();return}if(IVP&&IVP.style.display==='flex')return;actFPS({button:b.dataset.action==='place'?2:0});});
fpsTouchControls.addEventListener('pointercancel',function(e){var b=e.target.closest('button');if(b&&b.dataset.key&&b.dataset.key!=='jump')keys[b.dataset.key]=0;});
function gtog(v){var show=(v===undefined?G.className==='h':v);if(show&&document.pointerLockElement===cv&&document.exitPointerLock)document.exitPointerLock();G.className=show?'':'h';try{localStorage.setItem('czguide','1')}catch(e){}}
gb.onclick=function(){gtog()};G.querySelector('#gx').onclick=G.querySelector('#gok').onclick=function(){gtog(false)};
try{if(!localStorage.getItem('czguide'))gtog(true)}catch(e){}
var IC={move:'🧭',plat:'⬛',torre:'🗼',tanque:'🛢️',refineria:'🏭',solar:'☀️',para:'⚡',defl:'🔥',alm:'📦',cofre:'🧰',break:'⛏️',block:'🧱',rocket:'🚀',del:'🧹',launch:'🛫'};
function mk(id,html,cls){var b=document.createElement('button');b.className='t '+(cls||'');b.dataset.id=id;var n=tb.children.length+1;b.innerHTML='<em>'+(IC[id]||'')+'</em><span>'+html+'</span><kbd>'+(n<=9?'⇧'+n:'')+'</kbd>';tb.appendChild(b)}
function cs(c){return Object.keys(c).map(function(k){return Math.ceil(c[k]*cm())+RI[k]}).join(' ')}
mk('move','Explorar<small>mover/minar</small>','on');
Object.keys(B).forEach(function(k){mk(k,B[k].n+'<small>'+cs(B[k].c)+'</small><small>'+MAT[k]+'</small>')});
mk('break','Picar<small>quita bloque · da recurso</small>');mk('block','Bloque<small>1 💎 · sube el terreno</small>');mk('rocket','Cohete<small>'+cs(ROCKET.c)+'</small><small>Aleación Al-Li + titanio</small>');mk('del','Demoler<small>50%</small>');mk('launch','Lanzar<small>despegue</small>','go');
tb.addEventListener('click',function(e){var b=e.target.closest('.t');if(!b)return;snd('click');var id=b.dataset.id;if(id==='launch'){setToolDrawer(false);openLaunch();return}
tool=id;Array.prototype.forEach.call(tb.children,function(x){x.classList.toggle('on',x.dataset.id===tool)});setToolDrawer(false)});
Object.keys(RES).forEach(function(k){var c=document.createElement('span');c.className='chip';c.id='c_'+k;c.innerHTML='<i>'+RI[k]+'</i><b></b>';$('chips').appendChild(c)});
function hud(){$('pn').textContent=P[S.pl].n;for(var k in RES)$('c_'+k).lastChild.textContent=RES[k][0]+' '+S.inv[k];
if(typeof renderHudHotbar==='function')renderHudHotbar();
var fc=fcap();S.fuel=Math.min(S.fuel,fc);$('fb').style.width=(S.fuel/fc*100)+'%';$('ft').textContent='Comb. '+Math.floor(S.fuel)+'/'+fc;
Array.prototype.forEach.call(tb.children,function(b){var id=b.dataset.id,c=id==='rocket'?ROCKET.c:B[id]&&B[id].c;if(c)b.classList.toggle('dis',!afford(c))});
var w=wd(),h;var Q=document.getElementById('quest');if(!Q){Q=document.createElement('div');Q.id='quest';cz.appendChild(Q)}
var st=[['Minar materiales (toca las rocas)',used()>45||cnt('plat')>0],['Construir 4 plataformas',cnt('plat')>=4],['Construir el cohete',!!w.rocket||S.built],['Levantar la torre',cnt('torre')>0],['Refinería + panel solar + tanque',cnt('refineria')>0&&cnt('solar')>0&&cnt('tanque')>0],['Reunir 30 de combustible',S.fuel>=30],['¡Lanzar al espacio!',false]],cur=-1,qh='<h4>Misión · '+P[S.pl].n+'</h4><ul style="margin:0;padding:0">';
st.forEach(function(x,i){if(!x[1]&&cur<0)cur=i;qh+='<li class="'+(x[1]?'done':i===cur?'cur':'')+'"><span>'+(x[1]?'✔':i===cur?'▶':'○')+'</span>'+x[0]+'</li>'});Q.innerHTML=qh+'</ul>';
if(!cnt('plat'))h='Empieza aquí: toca una roca gris (o pulsa E cerca) para minar Hierro. Luego construye Plataformas. Rueda del ratón = zoom.';
else if(!w.rocket)h='Construye el Cohete sobre una plataforma (Hierro, Silicio y Carbono).';
else if(!cnt('torre'))h='Añade una Torre junto al cohete y 4+ plataformas.';
else if(S.fuel<20)h='Combustible: Refinería + Panel solar (misma cantidad) y Tanques. La refinería convierte Hielo en combustible.';
else h='Combustible '+Math.floor(S.fuel)+'. Pararrayos y deflectores hacen el lanzamiento más seguro. Mochila '+used()+' objetos.';
$('hint').textContent=h}
function openLaunch(){var pc=padCheck(),ul=$('chk');ul.innerHTML='';
pc.l.forEach(function(x){var li=document.createElement('li');li.className=x[0]?'ok':'no';li.textContent=(x[0]?'✔ ':'✘ ')+x[1];ul.appendChild(li)});
var d=$('dest');d.innerHTML='';
Object.keys(P).forEach(function(k){if(k===S.pl)return;var c=fcost(S.pl,k),b=document.createElement('button');b.className='d';b.textContent=P[k].n+' · '+c+' combustible · lo pilotas tú';b.disabled=!pc.ok||S.fuel<c;b.onclick=function(){$('dlg').className='h';L={to:k,t:0,ok:Math.random()<chance(),stage:'up',from:S.pl};S.fuel-=c};d.appendChild(b)});
$('dlg').className=''}
$('cl').onclick=function(){$('dlg').className='h'};
var DN=['Fácil','Media','Difícil'],db=document.createElement('button');db.className='s';db.id='df';
function dtxt(){db.textContent='Dificultad: '+DN[dn()]}dtxt();$('rs').parentNode.insertBefore(db,$('rs'));var sb=document.createElement('button');sb.className='s';function stxt(){sb.textContent='Sonido: '+(snM?'No':'Sí')}stxt();sb.onclick=function(){snM=!snM;try{localStorage.setItem('cosmo_mute',snM?'1':'0')}catch(e){}stxt();snd('click')};$('rs').parentNode.insertBefore(sb,$('rs'));
db.onclick=function(){S.diff=(dn()+1)%3;dtxt();hud();msg('Dificultad '+DN[dn()]+': costos ×'+cm()+' · minería ×'+[1.5,1,.7][dn()]+' · combustible de vuelo ×'+[.8,1,1.3][dn()])};
$('rs').onclick=function(){if(rsT>performance.now()){try{localStorage.removeItem('cosmo3d2')}catch(e){}S=fresh();loadWorld();msg('Partida reiniciada');rsT=0;$('rs').textContent='Nueva partida'}
else{rsT=performance.now()+3000;$('rs').textContent='¿Seguro? Pulsa otra vez';setTimeout(function(){$('rs').textContent='Nueva partida'},3000)}};
function freeSpot(w){for(var r=0;r<12;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){var x=15+dx,y=9+dy;if(!w.grid[x+','+y])return{x:x,y:y}}return{x:Math.round(S.px),y:Math.round(S.py)}}
function updLaunch(dt){L.t+=dt;
if(L.stage==='up'&&L.t>3.4){hand(L);return}
else if(L.stage==='boom'&&L.t>2.2){wd(L.from).rocket=null;S.built=false;setRocket(null);boom.visible=false;L=null;msg('El cohete explotó. La plataforma sigue en pie: construye otro.')}
else if(L.stage==='travel'){$('tvb').style.backgroundSize=Math.min(100,L.t/3.5*100)+'% 100%';
if(L.t>3.5){wd(L.from).rocket=null;S.pl=L.to;var w=wd(),s=freeSpot(w);w.rocket={x:s.x,y:s.y};S.px=s.x+1.5;S.py=s.y+.5;mine=null;tgt=null;loadWorld();$('tv').className='h';msg('Aterrizaje en '+P[L.to].n+'. Mina materiales y construye una plataforma para volver.');L=null}}}
function hand(l){pend=l;L=null;active=false;cz.className='h';var fp=Math.min(100,Math.round((55+S.fuel/fcap()*45)*[1.25,1,.8][dn()]));window.SIM.launch(P[l.from].n,P[l.to].n,fp)}
window.onSimEnd=function(){var l=pend;pend=null;if(!l)return;var r=window.simResult||{ok:false,fuel:0};window.simResult=null;wd(l.from).rocket=null;
if(r.ok){S.pl=l.to;var w=wd(),s=freeSpot(w);w.rocket={x:s.x,y:s.y};S.px=s.x+1.5;S.py=s.y+.5;S.fuel=Math.round(r.fuel*.5);msg('Aterrizaste en '+P[l.to].n+'. Mina materiales y construye una plataforma para volver.')}
else{S.built=false;msg('Misión fallida: perdiste el cohete. Reconstruye en tu plataforma.')}
mine=null;tgt=null;active=true;cz.className='';loadWorld();hud();resize()};
// ---- input
var KM={KeyW:'u',ArrowUp:'u',KeyS:'d',ArrowDown:'d',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r',ShiftLeft:'s',ShiftRight:'s'};
addEventListener('keydown',function(e){if(!active||L)return;if(e.repeat&&(e.code==='KeyE'||e.code==='KeyI'))return;if(IVP&&IVP.style.display==='flex'){if(e.code==='Escape'||e.code==='KeyI'||e.code==='KeyE'){closeInv();e.preventDefault()}else if(/^Digit[1-9]$/.test(e.code)){S.selectedHotbar=+e.code.slice(5)-1;renderInv();renderHudHotbar();e.preventDefault()}return}if(e.code==='KeyH'){gtog();return}if(G.className!=='h'){if(e.code==='Escape')gtog(false);return}if(e.code==='KeyE'||e.code==='KeyI'){toggleInventory();e.preventDefault();return}if(/^Digit[1-9]$/.test(e.code)){if(e.shiftKey&&toolDrawerOpen){var toolIndex=+e.code.slice(5)-1;if(tb.children[toolIndex])tb.children[toolIndex].click()}else{S.selectedHotbar=+e.code.slice(5)-1;renderHudHotbar()}e.preventDefault();return}if(e.code==='Escape'){if(viewMode==='fps'&&document.pointerLockElement===cv&&document.exitPointerLock)document.exitPointerLock();if(tb.children[0])tb.children[0].click()}if(viewMode==='fps'&&e.code==='Space'){jumpQueued=true;e.preventDefault();return}if(KM[e.code]){keys[KM[e.code]]=1;mine=null;tgt=null;e.preventDefault()}});
addEventListener('keyup',function(e){if(KM[e.code])keys[KM[e.code]]=0});
addEventListener('blur',function(){keys={};down=false;touchLook=null});
function nearNode(){var b=null,bd=1.8;wd().nodes.forEach(function(n){var d=Math.hypot(n.x-S.px,n.y-S.py);if(n.a>0&&d<bd){bd=d;b=n}});return b}
var ray=new THREE.Raycaster(),pl0=new THREE.Plane(new THREE.Vector3(0,1,0),0),v3=new THREE.Vector3(),mv=new THREE.Vector2();
function wpos(e){mv.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1));ray.setFromCamera(mv,cam);if(!ray.ray.intersectPlane(pl0,v3))return null;return{x:v3.x+W/2,y:v3.z+H/2}}
function act(e){if(L||!active)return;var p=wpos(e);if(!p)return;var tx=Math.floor(p.x),ty=Math.floor(p.y);if(!Number.isFinite(tx)||!Number.isFinite(ty))return;var w=wd();
if(tool==='move'&&w.grid[tx+','+ty]==='cofre'){if(Math.hypot(tx+.5-S.px,ty+.5-S.py)>3.5){msg('Acércate al cofre.');return}openInv(tx+','+ty);return}
if(tool==='move'){var hit=null;w.nodes.forEach(function(n){if(n.a>0&&Math.hypot(n.x-p.x,n.y-p.y)<1.45)hit=n});if(hit){mine=hit;prog=0;tgt={x:hit.x,y:hit.y}}else{mine=null;tgt={x:p.x,y:p.y}}return}
var k=tx+','+ty;
if(tool==='break'||tool==='block'){editBlock(w,tx,ty,tool==='break'?-1:1);return}
if(tool==='del'){if(w.rocket&&w.rocket.x===tx&&w.rocket.y===ty){pay(ROCKET.c,.5);w.rocket=null;S.built=false;setRocket(null);return}
var t=w.grid[k];if(t){if(t==='cofre'&&chestCount(w,k)>0){msg('Vacía el cofre antes de demolerlo.');return}if(t==='plat'&&w.rocket&&w.rocket.x===tx&&w.rocket.y===ty)return;pay(B[t].c,.5);delete w.grid[k];dyn.remove(gm[k]);delete gm[k];for(var r in S.inv)S.inv[r]=Math.floor(S.inv[r])}return}
if(tool==='rocket'){if(w.rocket){msg('Ya hay un cohete aquí.');return}if(S.built){msg('Ya tienes un cohete en otro planeta.');return}if(w.grid[k]!=='plat'){msg('El cohete se monta sobre una plataforma.');return}if(!afford(ROCKET.c)){msg('Faltan materiales para el cohete.');return}pay(ROCKET.c,-1);w.rocket={x:tx,y:ty};S.built=true;setRocket(w.rocket);msg('Cohete construido.');return}
if(w.grid[k]||(w.rocket&&w.rocket.x===tx&&w.rocket.y===ty))return;
if(Math.hypot(tx+.5-S.px,ty+.5-S.py)<1.05){msg('Aléjate un poco para construir.');return}
if(w.rocket&&Math.hypot(tx-w.rocket.x,ty-w.rocket.y)<1.25){msg('Deja espacio libre alrededor del cohete.');return}
for(var oi=0;oi<w.nodes.length;oi++){var on=w.nodes[oi];if(on.a>0&&Math.hypot(tx+.5-on.x,ty+.5-on.y)<1.15){msg('Hay un depósito de material demasiado cerca.');return}}
for(var i=0;i<w.nodes.length;i++){var n=w.nodes[i];if(n.a>0&&Math.floor(n.x)===tx&&Math.floor(n.y)===ty)return}
if(B[tool].s&&Math.floor(S.px)===tx&&Math.floor(S.py)===ty)return;
if(!afford(B[tool].c)){msg('Materiales insuficientes: '+cs(B[tool].c));return}
pay(B[tool].c,-1);w.grid[k]=tool;addTile(k,tool);snd('build')}
function metaUp(object,key){while(object&&object!==scene){if(object.userData&&object.userData[key]!=null)return object.userData[key];object=object.parent}return null}
function fpsTarget(){
 cam.updateMatrixWorld(true);fpRay.setFromCamera(fpCenter,cam);fpRay.near=0;fpRay.far=7.2;
 var roots=dyn.children,dh=fpRay.intersectObjects(roots,true),dynHit=null,dynData=null;
 for(var i=0;i<dh.length;i++){var o=dh[i].object,n=metaUp(o,'resourceNode'),tk=metaUp(o,'tileKey'),rr=metaUp(o,'isRocket');if(n||tk!=null||rr){dynHit=dh[i];dynData={node:n,tileKey:tk,tileType:metaUp(o,'tileType'),rocket:!!rr};break}}
 var terr=Object.keys(terrainChunks).map(function(k){return terrainChunks[k]});var th=terr.length?fpRay.intersectObjects(terr,false):[],terrainHit=th.length?th[0]:null;
 if(dynHit&&(!terrainHit||dynHit.distance<=terrainHit.distance))return{hit:dynHit,node:dynData.node,tileKey:dynData.tileKey,tileType:dynData.tileType,rocket:dynData.rocket,terrain:false};
 if(terrainHit)return{hit:terrainHit,node:null,tileKey:null,tileType:null,rocket:false,terrain:true};
 return null;
}
function fpsCell(target,forPlace){
 if(!target)return null;
 if(target.node)return{x:Math.floor(target.node.x),y:Math.floor(target.node.y)};
 if(target.tileKey!=null){var sp=String(target.tileKey).split(','),x=+sp[0],y=+sp[1];
  if(forPlace&&tool==='rocket'&&target.tileType==='plat')return{x:x,y:y};
  if(forPlace){var px=T(S.px)- (x+.5-W/2),pz=Z(S.py)-(y+.5-H/2);if(Math.abs(px)>Math.abs(pz))x+=px>=0?1:-1;else y+=pz>=0?1:-1;}
  return{x:x,y:y};
 }
 var pt=target.hit.point;return{x:Math.floor(pt.x+W/2),y:Math.floor(pt.z+H/2)};
}
function fpsDemolish(tx,ty){var w=wd(),k=tx+','+ty;if(w.rocket&&w.rocket.x===tx&&w.rocket.y===ty){pay(ROCKET.c,.5);w.rocket=null;S.built=false;setRocket(null);msg('Cohete desmontado.');return}
 var t=w.grid[k];if(!t)return;if(t==='cofre'&&chestCount(w,k)>0){msg('Vacía el cofre antes de demolerlo.');return}if(t==='plat'&&w.rocket&&w.rocket.x===tx&&w.rocket.y===ty)return;pay(B[t].c,.5);delete w.grid[k];if(gm[k])dyn.remove(gm[k]);delete gm[k];for(var r in S.inv)S.inv[r]=Math.floor(S.inv[r]);snd('break');}
function fpsPlace(tx,ty){var w=wd(),k=tx+','+ty;
 if(tool==='launch'){openLaunch();return}
 if(tool==='move'){tool='block';Array.prototype.forEach.call(tb.children,function(b){b.classList.toggle('on',b.dataset.id===tool)})}
 if(tool==='break'){editBlock(w,tx,ty,-1);return}
 if(tool==='block'){editBlock(w,tx,ty,1);return}
 if(tool==='del'){fpsDemolish(tx,ty);return}
 if(tool==='rocket'){
  if(w.rocket){msg('Ya hay un cohete en este planeta.');return}if(S.built){msg('Ya tienes un cohete en otro planeta.');return}
  if(w.grid[k]!=='plat'){msg('Apunta a una plataforma para montar el cohete.');return}if(!afford(ROCKET.c)){msg('Faltan materiales: '+cs(ROCKET.c));return}
  pay(ROCKET.c,-1);w.rocket={x:tx,y:ty};S.built=true;setRocket(w.rocket);snd('build');msg('Cohete ensamblado.');return;
 }
 if(!B[tool]){msg('Selecciona un módulo de la barra inferior.');return}
 if(w.grid[k]||(w.rocket&&w.rocket.x===tx&&w.rocket.y===ty)){msg('Ese espacio ya está ocupado.');return}
 if(Math.hypot(tx+.5-S.px,ty+.5-S.py)<1.05){msg('Aléjate un poco para construir.');return}
 if(w.rocket&&Math.hypot(tx-w.rocket.x,ty-w.rocket.y)<1.25){msg('Deja espacio alrededor del cohete.');return}
 for(var i=0;i<w.nodes.length;i++){var n=w.nodes[i];if(n.a>0&&Math.hypot(tx+.5-n.x,ty+.5-n.y)<1.15){msg('Hay un depósito demasiado cerca.');return}}
 if(!afford(B[tool].c)){msg('Materiales insuficientes: '+cs(B[tool].c));return}
 pay(B[tool].c,-1);w.grid[k]=tool;addTile(k,tool);snd('build');
}
function actFPS(e){
 if(e.button!==0&&e.button!==2)return;handSwing=1;
 if(!document.pointerLockElement&&cv.requestPointerLock){try{cv.requestPointerLock()}catch(ignore){}}
 var target=fpsTarget();if(!target){if(e.button===2)msg('Apunta al terreno o a una estructura para construir.');return}
 if(e.button===0){
  if(target.node){if(Math.hypot(target.node.x-S.px,target.node.y-S.py)>5){msg('Acércate al depósito para extraerlo.');return}mine=target.node;prog=0;tgt=null;snd('click');return}
  var cell=fpsCell(target,false);if(!cell)return;
  if(target.tileKey!=null){var typ=wd().grid[target.tileKey];if(typ==='cofre'&&Math.hypot(cell.x+.5-S.px,cell.y+.5-S.py)<3.5){openInv(target.tileKey);return}if(tool==='del'){fpsDemolish(cell.x,cell.y);return}}
  if(tool==='del'){fpsDemolish(cell.x,cell.y);return}
  // El clic izquierdo excava el terreno: las vetas visibles se extraen directamente.
  editBlock(wd(),cell.x,cell.y,-1);return;
 }
 var put=fpsCell(target,true);if(!put)return;
 if(tool==='block'||tool==='break'||tool==='del'||tool==='launch'||tool==='rocket'||B[tool]||tool==='move')fpsPlace(put.x,put.y);
}
cv.addEventListener('contextmenu',function(e){e.preventDefault()});
cv.addEventListener('pointerdown',function(e){if(e.pointerType==='touch')e.preventDefault();down=true;editBlock.last='';if(viewMode==='fps'&&e.pointerType==='touch'){if(touchLook&&touchLook.id!==e.pointerId)return;touchLook={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};try{cv.setPointerCapture(e.pointerId)}catch(ignore){}return}if(viewMode==='fps')actFPS(e);else act(e)});
cv.addEventListener('pointermove',function(e){
 if(viewMode==='fps'&&touchLook&&touchLook.id===e.pointerId){var dx=e.clientX-touchLook.lastX,dy=e.clientY-touchLook.lastY;if(Math.abs(e.clientX-touchLook.startX)+Math.abs(e.clientY-touchLook.startY)>7)touchLook.moved=true;rotateFPSFromPointer(dx,dy,.006,.006);touchLook.lastX=e.clientX;touchLook.lastY=e.clientY;return}
 if(viewMode==='orbit'){var p=wpos(e);if(p){hov.x=Math.floor(p.x);hov.y=Math.floor(p.y)}if(down&&(tool==='plat'||tool==='del'||tool==='solar'||tool==='para'||tool==='break'))act(e)}});
addEventListener('pointerup',function(e){down=false;if(touchLook&&e.pointerId===touchLook.id){var t=touchLook;if(!t.moved)actFPS({button:0});touchLook=null}});
addEventListener('pointercancel',function(e){down=false;if(touchLook&&e.pointerId===touchLook.id)touchLook=null});
cv.addEventListener('wheel',function(e){if(viewMode==='orbit')zm=Math.max(.5,Math.min(1.7,zm+e.deltaY*.001));else{ensurePlayerSlots();S.selectedHotbar=(S.selectedHotbar+(e.deltaY>0?1:8))%9;renderHudHotbar()}e.preventDefault()},{passive:false});
function solid(x,y){var t=wd().grid[Math.floor(x)+','+Math.floor(y)];return t&&B[t].s}
function upd(dt){var w=wd(),dx=0,dy=0;
if(viewMode==='fps'){
 var forward=(keys.u||0)-(keys.d||0),strafe=(keys.l||0)-(keys.r||0);
 // En primera persona, la derecha de la pantalla corresponde al vector lateral invertido del eje X del mundo.
 dx=Math.sin(fpsYaw)*forward+Math.cos(fpsYaw)*strafe;
 dy=Math.cos(fpsYaw)*forward-Math.sin(fpsYaw)*strafe;
 if(jumpQueued&&jumpY<=.001)jumpVel=7.1;jumpQueued=false;
 jumpVel-=19.5*dt;jumpY+=jumpVel*dt;if(jumpY<0){jumpY=0;jumpVel=0}
}else{
 dx=(keys.r||0)-(keys.l||0);dy=(keys.d||0)-(keys.u||0);
 if(tgt&&!dx&&!dy){var d=Math.hypot(tgt.x-S.px,tgt.y-S.py),st=mine?1.4:.15;if(d>st){dx=(tgt.x-S.px)/d;dy=(tgt.y-S.py)/d}else if(!mine)tgt=null}
 jumpY=0;jumpVel=0;jumpQueued=false;
}
var m=Math.hypot(dx,dy),spd=keys.s?8.5:5;if(m>0){stT-=dt;if(stT<=0){stT=keys.s?.22:.34;snd('step')}}var liq=(S.pl==='tierra'||S.pl==='venus')&&terrainHeight(T(S.px),Z(S.py))<WL;if(liq)spd*=.6;if(liq!==upd.w){upd.w=liq;if(liq){snd('splash');if(S.pl==='venus')msg('¡Lava! Sal de ahí.')}}
if(m>0){dx/=m;dy/=m;var nx=S.px+dx*spd*dt,ny=S.py+dy*spd*dt;if(Number.isFinite(nx)&&!solid(nx,S.py))S.px=nx;if(Number.isFinite(ny)&&!solid(S.px,ny))S.py=ny;pm.rotation.y=Math.atan2(dx,dy)}
if(mine){if(mine.a<=0)mine=null;else if(Math.hypot(mine.x-S.px,mine.y-S.py)<(viewMode==='fps'?4.8:1.8)){
if(used()>=cap()){msg('Mochila llena. Construye almacenes.');mine=null}
else{prog+=dt*.8;mst-=dt;if(mst<=0){mst=.5;snd('m_'+mine.t,.45)}if(prog>=1){prog=0;var q=Math.min(mine.a,Math.max(1,Math.round((2+Math.floor(Math.random()*2))*[1.5,1,.7][dn()])),cap()-used());mine.a-=q;S.inv[mine.t]+=q;if(q>0){snd('m_'+mine.t);burst(T(mine.x),terrainHeight(T(mine.x),Z(mine.y))+.4,Z(mine.y),RES[mine.t][1],12)}if(mine.a<=0){mine.t0=performance.now();mine.m.visible=false;mine=null}}}}}
var now=performance.now();if(!w._streamAt||now-w._streamAt>900){w._streamAt=now;streamResources()}w.nodes.forEach(function(n){if(n.a<=0&&now-n.t0>90000){n.a=6;if(n.m)n.m.visible=true;else makeNodeVisible(n)}if(n.a>0){if(n.m)n.m.scale.setScalar((.60+n.a*.025)*(n.sz||1))}});
acc+=dt;if(acc>=2){acc=0;var pw=Math.min(cnt('refineria'),cnt('solar'));for(var i=0;i<pw;i++)if(S.inv.agua>=1&&S.fuel+3<=fcap()){S.inv.agua--;S.fuel+=3}}}
var NET={ws:null,peers:{},t:0,name:'Piloto'+(100+Math.random()*900|0)};
function lbl(t){var c=document.createElement('canvas');c.width=256;c.height=64;var x=c.getContext('2d');x.font='bold 30px sans-serif';x.textAlign='center';x.shadowColor='#000';x.shadowBlur=6;x.fillStyle='#fff';x.fillText(t,128,42);var s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));s.scale.set(2,.5,1);s.position.y=1.3;return s}
function dropPeers(){for(var i in NET.peers){scene.remove(NET.peers[i].m);delete NET.peers[i]}}
function netConnect(){if(location.protocol==='file:'||!window.WebSocket)return;var ws;try{ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host)}catch(e){return}NET.ws=ws;
ws.onopen=function(){msg('Conectado al servidor MMO')};
ws.onclose=function(){NET.ws=null;dropPeers();setTimeout(netConnect,5000)};
ws.onmessage=function(e){var m;try{m=JSON.parse(e.data)}catch(x){return}if(m.t!=='s')return;var seen={};
m.p.forEach(function(p){if(p.id===m.you||p.pl!==S.pl)return;seen[p.id]=1;var o=NET.peers[p.id];if(!o){var g=pm.clone(true);g.visible=true;g.add(lbl(p.n));scene.add(g);o=NET.peers[p.id]={m:g,x:p.x,y:p.y}}o.tx=p.x;o.ty=p.y});
for(var i in NET.peers)if(!seen[i]){scene.remove(NET.peers[i].m);delete NET.peers[i]}}}
function netTick(dt){for(var i in NET.peers){var o=NET.peers[i];if(o.tx==null)continue;var dx=o.tx-o.x,dy=o.ty-o.y;if(Math.hypot(dx,dy)>.05)o.m.rotation.y=Math.atan2(dx,dy);o.x+=dx*Math.min(1,dt*8);o.y+=dy*Math.min(1,dt*8);o.m.position.set(T(o.x),terrainHeight(T(o.x),Z(o.y))+.04,Z(o.y))}
NET.t+=dt;if(NET.t>.1&&NET.ws&&NET.ws.readyState===1){NET.t=0;NET.ws.send(JSON.stringify({t:'p',n:NET.name,pl:S.pl,x:S.px,y:S.py}))}}
function scatterDetail(k){var r=rng((hs(k+'-detail-v6')^S.seed)|0),w=wd(k),box=new THREE.BoxGeometry(1,1,1);
 function ok(x,z){if(Math.hypot(x,z)<5)return false;for(var q=0;q<w.nodes.length;q++){var n=w.nodes[q];if(n.a>0&&Math.hypot(T(n.x)-x,Z(n.y)-z)<.9)return false}return true}
 function pt(mh){var x=r()*W-W/2,z=r()*H-H/2,y=terrainHeight(x,z);return(y<mh||!ok(x,z))?null:[x,y,z]}
 function inst(g,mat,n,place,cf){var m=new THREE.InstancedMesh(g,mat,n),o=new THREE.Object3D(),c=0;for(var i=0;i<n;i++){var p=place(i);if(!p)continue;o.position.set(p[0],p[1],p[2]);o.rotation.set(0,p[3]||0,0);o.scale.setScalar(p[4]||1);o.updateMatrix();m.setMatrixAt(c,o.matrix);if(cf&&m.setColorAt)m.setColorAt(c,new THREE.Color(cf(i)));c++}
  m.count=c;m.frustumCulled=false;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;terrainProps.add(m)}
 var fm=new THREE.MeshStandardMaterial({color:0xffffff,flatShading:true,roughness:.9});
 if(k==='tierra'){var cur=null,gs=[0x2f6b2a,0x3f8a34,0x57a43e],fl=[0xe8403a,0xf5d742,0xf4f4f4,0x5a8cff,0xd35ad8];
  inst(new THREE.BoxGeometry(.07,.3,.07),fm,1500,function(i){if(i%3===0)cur=pt(WL+.3);if(!cur)return null;var j=i%3;return[cur[0]+(j?(r()-.5)*.5:0),cur[1]+.15,cur[2]+(j?(r()-.5)*.5:0),r()*3,.7+r()*.8]},function(i){return gs[i%3]});
  inst(new THREE.BoxGeometry(.13,.13,.13),fm,150,function(){var p=pt(WL+.3);return p&&[p[0],p[1]+.36,p[2],r()*3,1]},function(i){return fl[i%5]})}
 var tn={tierra:[.9,.9,.9],luna:[.85,.85,.92],marte:[.95,.55,.42],venus:[.9,.6,.35]}[k];
 inst(box,fm,k==='tierra'?90:260,function(){var p=pt(WL-9);if(!p)return null;var s2=.12+r()*.25;return[p[0],p[1]+s2*.5,p[2],r()*3,s2]},function(){var v=.4+r()*.35;return new THREE.Color(v*tn[0],v*tn[1],v*tn[2])});
 if(k==='venus')inst(box,new THREE.MeshBasicMaterial({color:0xffffff}),80,function(){var p=pt(WL+.02);return p&&[p[0],p[1]+.05,p[2],r()*3,.07+r()*.09]},function(){return r()<.5?0xff6a1a:0xffb13a})}
function scatterExtras(k){var r=rng((hs(k+'-extras-v5')^S.seed)|0),w=wd(k);
function far(x,z,d){for(var q=0;q<w.nodes.length;q++){var n=w.nodes[q];if(n.a>0&&Math.hypot(T(n.x)-x,Z(n.y)-z)<d)return false}return true}
function add(o,x,z,y){o.position.set(x,terrainHeight(x,z)+(y||0),z);o.castShadow=o.receiveShadow=true;terrainProps.add(o)}
if(k==='tierra'){var tr=new THREE.MeshStandardMaterial({color:0x5b3f27,roughness:1}),lv=[0x2f5f2a,0x3b7233,0x28502a].map(function(c){return new THREE.MeshStandardMaterial({color:c,roughness:.95,flatShading:true})});
 for(var i=0;i<110;i++){var x=Math.floor(r()*W-W/2)+.5,z=Math.floor(r()*H-H/2)+.5,sc=.9+r()*.5;if(Math.hypot(x,z)<9||!far(x,z,2.2)||terrainHeight(x,z)<WL+.15)continue;var g=new THREE.Group(),tk=new THREE.Mesh(new THREE.BoxGeometry(.24,1.1,.24),tr);tk.position.y=.55;g.add(tk);
  var l1=new THREE.Mesh(new THREE.BoxGeometry(1.1,.5,1.1),lv[i%3]);l1.position.y=1.25;g.add(l1);var l2=new THREE.Mesh(new THREE.BoxGeometry(.7,.4,.7),lv[(i+1)%3]);l2.position.y=1.7;g.add(l2);
  g.scale.setScalar(sc);g.traverse(function(o){o.castShadow=true});add(g,x,z)}}
else{var col=k==='marte'?0x7a3a28:k==='luna'?0x6b6c75:0x8a5528,rm=new THREE.MeshStandardMaterial({color:col,roughness:.96,flatShading:true});
 for(var j=0;j<16;j++){var x2=r()*W-W/2,z2=r()*H-H/2,s2=.9+r()*1.8;if(Math.hypot(x2,z2)<9||!far(x2,z2,s2+1))continue;var sp=new THREE.Mesh(new THREE.BoxGeometry(s2*.8,s2*.8,s2*.8),rm);sp.scale.set(1,1.3+r()*1.6,1);sp.rotation.y=r()*6;add(sp,x2,z2,s2*.4)}
 if(k!=='venus')for(var q2=0;q2<9;q2++){var x3=r()*W-W/2,z3=r()*H-H/2,rr=1.4+r()*2.6;if(Math.hypot(x3,z3)<10)continue;var rim=new THREE.Mesh(new THREE.TorusGeometry(rr,.22,6,28),rm);rim.rotation.x=Math.PI/2;rim.scale.z=.6;terrainProps.add(rim);rim.position.set(x3,terrainHeight(x3,z3)+.05,z3);rim.receiveShadow=true}}}
var hrs=null,PG=new THREE.BoxGeometry(1,1,1),parts=[],TOD=.12,amb=4,tmr=0,dayDirty=false,mmT=0,SKYD=new THREE.Color(0x05091a);
function burst(x,y,z,col,n){for(var i=0;i<n&&parts.length<140;i++){var m=new THREE.Mesh(PG,new THREE.MeshBasicMaterial({color:col}));m.scale.setScalar(.06+Math.random()*.08);m.position.set(x,y,z);m.userData={vx:(Math.random()-.5)*2.4,vy:1.5+Math.random()*2,vz:(Math.random()-.5)*2.4,l:.7};scene.add(m);parts.push(m)}}
var MS=[['Construye una plataforma',function(w){return hasB(w,'plat')}],['Construye una torre',function(w){return hasB(w,'torre')}],['Construye un tanque',function(w){return hasB(w,'tanque')}],['Reúne 8 de titanio y 6 de litio',function(){return S.inv.titanio>=8&&S.inv.litio>=6}],['Cava 2 bloques de profundidad con ⛏️',function(w){for(var k in (w.ed||{}))if(w.ed[k]<=-2)return true;return false}],['Construye el cohete',function(){return S.built}],['Llega a otro planeta',function(){return S.pl!=='tierra'}]];
function hasB(w,t){for(var k in w.grid)if(w.grid[k]===t)return true;return false}
var mis=document.createElement('div');mis.style.cssText='position:fixed;left:10px;top:64px;z-index:5;max-width:230px;padding:7px 11px;background:rgba(0,12,22,.72);border:1px solid rgba(255,255,255,.25);border-radius:6px;color:#fff;font:600 13px system-ui,sans-serif;pointer-events:none';document.body.appendChild(mis);
var mm=document.createElement('canvas');mm.width=mm.height=120;mm.style.cssText='position:fixed;right:10px;top:64px;width:132px;height:132px;z-index:5;border:2px solid rgba(255,255,255,.35);border-radius:6px;image-rendering:pixelated;pointer-events:none;background:#000';document.body.appendChild(mm);var mx=mm.getContext('2d');
function miniMap(w){var x0=Math.floor(S.px)-20,y0=Math.floor(S.py)-20,i,j;for(j=0;j<40;j++)for(i=0;i<40;i++){var h=terrainHeight(x0+i-W/2+.5,y0+j-H/2+.5),c;if((S.pl==='tierra'||S.pl==='venus')&&h<WL)c=S.pl==='tierra'?'#2f6fbf':'#ff5a1a';else{var v=Math.max(0,Math.min(1,(h+1)/2));c=S.pl==='tierra'?'rgb('+(50+v*120|0)+','+(100+v*110|0)+','+(40+v*100|0)+')':S.pl==='marte'?'rgb('+(110+v*100|0)+','+(50+v*50|0)+','+(35+v*40|0)+')':S.pl==='venus'?'rgb('+(120+v*100|0)+','+(80+v*70|0)+','+(30+v*40|0)+')':'rgb('+(70+v*130|0)+','+(70+v*130|0)+','+(76+v*130|0)+')'}mx.fillStyle=c;mx.fillRect(i*3,j*3,3,3)}
 for(var k in w.grid){var p=k.split(',');mx.fillStyle='#fff';mx.fillRect((+p[0]-x0)*3,(+p[1]-y0)*3,3,3)}
 w.nodes.forEach(function(n){if(n.a>0){mx.fillStyle=RES[n.t][1];mx.fillRect((n.x-x0)*3-1,(n.y-y0)*3-1,4,4)}});
 if(w.rocket){mx.fillStyle='#f33';mx.fillRect((w.rocket.x-x0)*3-2,(w.rocket.y-y0)*3-2,7,7)}
 for(var id in NET.peers){var o=NET.peers[id];mx.fillStyle='#0ff';mx.fillRect((o.x-x0)*3-1,(o.y-y0)*3-1,4,4)}
 mx.fillStyle='#ffd24a';mx.fillRect(60-2,60-2,5,5)}
function dayTick(dt){tmr+=dt;var w=wd(),t=performance.now()/1000;
 WMAT.tierra.opacity=.72+Math.sin(t*1.5)*.05;WMAT.venus.emissiveIntensity=1.1+Math.sin(t*3)*.3;
 for(var i=parts.length-1;i>=0;i--){var m=parts[i],u=m.userData;u.l-=dt;if(u.l<=0){scene.remove(m);m.material.dispose();parts.splice(i,1);continue}u.vy-=9*dt;m.position.x+=u.vx*dt;m.position.y+=u.vy*dt;m.position.z+=u.vz*dt;m.scale.multiplyScalar(.985)}
 w.nodes.forEach(function(n){if(n.m&&n.a>0&&ROT[n.t])n.m.rotation.y+=dt*.6});
 var night=false;
 if(S.pl==='tierra'){TOD=(TOD+dt/300)%1;var sv=Math.sin(TOD*6.2832),f=Math.max(.1,Math.min(1,sv*1.6+.25));night=f<.4;dayDirty=true;
  sun.intensity=1.65*f;hemi.intensity=.72*(.3+.7*f);sun.position.set(Math.cos(TOD*6.2832)*18,10+Math.max(0,sv)*14,8);
  if(scene.background&&scene.background.isColor){scene.background.set(P.tierra.sky).lerp(SKYD,1-f);if(scene.fog)scene.fog.color.copy(scene.background)}stars.visible=f<.45}
 else if(dayDirty){dayDirty=false;sun.intensity=1.65;hemi.intensity=.72;sun.position.set(10,22,8)}
 amb-=dt;if(amb<=0){amb=5+Math.random()*8;if(S.pl==='tierra')snd(night?'cricket':'bird');else if(S.pl==='marte')snd('wind');else if(S.pl==='venus')snd('rumble')}
 if(tmr>.5){tmr=0;var cur=S.mi||0;if(cur<MS.length&&MS[cur][1](w)){S.mi=cur+1;snd('win');msg('✅ Misión cumplida: '+MS[cur][0]);burst(T(S.px),terrainHeight(T(S.px),Z(S.py))+1,Z(S.py),0xffd24a,24)}
  cur=S.mi||0;mis.style.display=L?'none':'block';mm.style.display=L?'none':'block';mis.textContent=cur<MS.length?'🎯 Misión '+(cur+1)+'/'+MS.length+': '+MS[cur][0]:'🏆 ¡Todas las misiones completadas!'}
 if(IVK){var cp=IVK.split(',');if(Math.hypot(+cp[0]+.5-S.px,+cp[1]+.5-S.py)>4)closeInv()}
 mmT+=dt;if(mmT>.3&&!L){mmT=0;miniMap(w)}}
var IVK=null,IVP=document.createElement('div'),IVHeld=null;
IVP.id='cosmo-inventory-overlay';
IVP.setAttribute('aria-label','Inventario del tripulante');
IVP.style.cssText='position:fixed;inset:0;display:none;z-index:1000;align-items:center;justify-content:center;background:rgba(1,5,12,.78);backdrop-filter:blur(10px);padding:14px;pointer-events:auto';
document.body.appendChild(IVP);
var invOpenBtn=document.createElement('button');invOpenBtn.type='button';invOpenBtn.className='s';invOpenBtn.id='inventory-open-btn';invOpenBtn.textContent='🎒 Inventario (E)';invOpenBtn.title='Abrir inventario';
$('top').insertBefore(invOpenBtn,$('rs'));invOpenBtn.addEventListener('click',function(){toggleInventory()});
function inventoryMainSlots(){var desired=Math.min(180,36+9*cnt('alm')),saved=Number(S.maxInvSlots);if(!Number.isFinite(saved)||saved<36)saved=36;S.maxInvSlots=Math.min(180,Math.max(saved,desired));return S.maxInvSlots-9}
function inventorySlotCount(){return inventoryMainSlots()+9}
function hotbarStart(){return inventoryMainSlots()}
function blankSlots(n){var a=[];for(var i=0;i<n;i++)a.push(null);return a}
function slotOrder(){var a=[],start=hotbarStart(),total=inventorySlotCount();for(var i=start;i<total;i++)a.push(i);for(var j=0;j<start;j++)a.push(j);return a}
function filledSlots(slots){var n=0;for(var i=0;i<(slots||[]).length;i++)if(slots[i])n++;return n}
function slotTotals(slots){var t={};for(var k in RES)t[k]=0;for(var i=0;i<(slots||[]).length;i++){var q=slots[i];if(q&&RES[q.id])t[q.id]+=Math.max(0,Math.floor(q.qty||0))}return t}
function sanitizeSlots(slots,n){var a=Array.isArray(slots)?slots.slice(0,n):[];while(a.length<n)a.push(null);for(var i=0;i<n;i++){var q=a[i];if(!q||!RES[q.id]||!Number.isFinite(q.qty)||q.qty<1){a[i]=null;continue}q.qty=Math.min(64,Math.floor(q.qty));if(q.qty<1)a[i]=null;else a[i]={id:q.id,qty:q.qty}}return a}
function insertStack(slots,id,qty,indices){var left=Math.max(0,Math.floor(qty));indices=indices||slots.map(function(_,i){return i});for(var i=0;i<indices.length&&left>0;i++){var ix=indices[i],q=slots[ix];if(q&&q.id===id&&q.qty<64){var n=Math.min(left,64-q.qty);q.qty+=n;left-=n}}for(var j=0;j<indices.length&&left>0;j++){var ex=indices[j];if(!slots[ex]){var n2=Math.min(left,64);slots[ex]={id:id,qty:n2};left-=n2}}return left}
function removeStack(slots,id,qty,indices){var left=Math.max(0,Math.floor(qty));indices=indices||slots.map(function(_,i){return i});for(var i=indices.length-1;i>=0&&left>0;i--){var ix=indices[i],q=slots[ix];if(!q||q.id!==id)continue;var n=Math.min(left,q.qty);q.qty-=n;left-=n;if(q.qty<=0)slots[ix]=null}return left}
function reconcileSlots(slots,totals,indices){var have=slotTotals(slots);for(var k in RES){var desired=Math.max(0,Math.floor(Number(totals&&totals[k])||0)),delta=desired-(have[k]||0);if(delta>0)insertStack(slots,k,delta,indices);else if(delta<0)removeStack(slots,k,-delta,indices)}}
function syncPlayerTotals(){var t=slotTotals(S.invSlots);for(var k in RES)S.inv[k]=t[k]||0}
function ensurePlayerSlots(){var order=slotOrder(),size=inventorySlotCount();if(!Array.isArray(S.invSlots)||S.invSlots.length!==size){S.invSlots=blankSlots(size);reconcileSlots(S.invSlots,S.inv||{},order)}else{S.invSlots=sanitizeSlots(S.invSlots,size);reconcileSlots(S.invSlots,S.inv||{},order)}syncPlayerTotals();if(!Number.isInteger(S.selectedHotbar)||S.selectedHotbar<0||S.selectedHotbar>8)S.selectedHotbar=0}
function ensureChestSlots(w,key){if(!w.chests)w.chests={};if(!w.chestInvSlots)w.chestInvSlots={};if(!Array.isArray(w.chestInvSlots[key])){w.chestInvSlots[key]=blankSlots(27);reconcileSlots(w.chestInvSlots[key],w.chests[key]||{},w.chestInvSlots[key].map(function(_,i){return i}))}else{w.chestInvSlots[key]=sanitizeSlots(w.chestInvSlots[key],27);reconcileSlots(w.chestInvSlots[key],w.chests[key]||{},w.chestInvSlots[key].map(function(_,i){return i}))}syncChestTotals(w,key)}
function syncChestTotals(w,key){var t=slotTotals((w.chestInvSlots||{})[key]||[]),o={};for(var r in RES)if(t[r]>0)o[r]=t[r];w.chests=w.chests||{};w.chests[key]=o}
function chestCount(w,k){var c=(w.chests||{})[k]||{},n=0;for(var r in c)n+=c[r];return n}
function stackSlots(o){var n=0;for(var k in o)n+=Math.ceil((o[k]||0)/64);return n}
function itemTitle(item){return item&&RES[item.id]?RES[item.id][0]+' × '+item.qty:'Ranura vacía'}
function oneSlotHtml(slots,index,storage,hotbar){var q=slots[index],ic=q&&RI[q.id]?RI[q.id]:'',nm=q&&RES[q.id]?RES[q.id][0]:'Ranura vacía',qty=q?q.qty:0,cls='inv-slot';if(!q)cls+=' is-empty';if(hotbar&&S.selectedHotbar===index-hotbarStart())cls+=' is-selected';return '<button type="button" class="'+cls+'" data-storage="'+storage+'" data-slot="'+index+'"'+(hotbar?' data-hotbar="'+(index-hotbarStart())+'"':'')+' title="'+(q?nm+' × '+qty:'Ranura vacía')+'" aria-label="'+(q?nm+' cantidad '+qty:'Ranura vacía')+'"><span class="inv-slot-number">'+(hotbar?index-hotbarStart()+1:'')+'</span><span class="inv-slot-icon">'+ic+'</span>'+(qty>1?'<span class="inv-slot-count">'+qty+'</span>':'')+'</button>'}
function playerGridHtml(start,end){var h='<div class="inv-grid" role="group" aria-label="'+(start===hotbarStart()?'Barra rápida':'Mochila')+'">';for(var i=start;i<end;i++)h+=oneSlotHtml(S.invSlots,i,'i',i>=hotbarStart());return h+'</div>'}
function chestGridHtml(slots){var h='<div class="inv-grid inv-chest-grid" role="group" aria-label="Contenido del cofre">';for(var i=0;i<27;i++)h+=oneSlotHtml(slots,i,'c',false);return h+'</div>'}
function equipmentHtml(){return '<section class="inv-equip-card"><div class="inv-section-kicker">TRIPULANTE</div><div class="inv-equip-layout"><div class="inv-armor" aria-label="Ranuras de protección"><div class="inv-armor-slot" title="Casco espacial"><span>⛑️</span><small>CASCO</small></div><div class="inv-armor-slot" title="Traje presurizado"><span>🦺</span><small>TRAJE</small></div><div class="inv-armor-slot" title="Protección de piernas"><span>🦿</span><small>PIERNAS</small></div><div class="inv-armor-slot" title="Botas magnéticas"><span>🥾</span><small>BOTAS</small></div></div><div class="inv-avatar-wrap"><div class="inv-avatar-glow"></div><div class="inv-avatar">🧑‍🚀</div><b>EXPLORADOR</b><span>'+P[S.pl].n.toUpperCase()+'</span></div></div><div class="inv-equip-note"><span class="inv-status-dot"></span> SISTEMA PERSONAL · ONLINE</div></section>'}
function workbenchHtml(){return '<section class="inv-workbench"><div class="inv-section-kicker">ENSAMBLAJE RÁPIDO <span>02 × 02</span></div><div class="inv-craft-layout"><div class="inv-craft-grid"><span></span><span></span><span></span><span></span></div><div class="inv-craft-arrow">›</div><div class="inv-craft-output">⚙️</div></div><p>Los módulos de la base se fabrican desde la barra de herramientas.</p></section>'}
function persistHeld(){S.inventoryCursor=IVHeld?{id:IVHeld.id,qty:IVHeld.qty,origin:IVHeld.origin,chestKey:IVK,chestPlanet:S.pl}:null}
function renderInv(){ensurePlayerSlots();persistHeld();var w=wd(),carry=IVHeld?'<div class="inv-carry"><span>EN MANO</span><b>'+RI[IVHeld.id]+' '+RES[IVHeld.id][0]+'</b><strong>×'+IVHeld.qty+'</strong></div>':'<div class="inv-carry inv-carry-empty"><span>SELECCIÓN</span><b>Elige una pila para moverla</b></div>';var chest='';if(IVK){ensureChestSlots(w,IVK);var cc=w.chestInvSlots[IVK];chest='<section class="inv-chest-section"><div class="inv-section-title"><span>🧰 COFRE DE ALMACENAMIENTO</span><small>'+stackSlots(w.chests[IVK])+'/27 PILAS</small></div>'+chestGridHtml(cc)+'</section>'}var capText=filledSlots(S.invSlots)+'/'+S.invSlots.length+' ESPACIOS';if(IVHeld&&IVHeld.origin==='i')capText=(filledSlots(S.invSlots)+1)+'/'+S.invSlots.length+' ESPACIOS';IVP.innerHTML='<div class="inv-shell" role="dialog" aria-modal="true" aria-label="Inventario del tripulante"><header class="inv-header"><div class="inv-brand-mark">HDA</div><div class="inv-title-wrap"><div class="inv-eyebrow">COSMÓDROMO · EQUIPO DE CAMPO</div><h2>Inventario</h2></div><div class="inv-world-stat"><span>UBICACIÓN</span><b>'+P[S.pl].n+'</b><small>'+capText+'</small></div><button type="button" class="inv-close" data-inv-close aria-label="Cerrar inventario" title="Cerrar (Esc)">×</button></header><div class="inv-content">'+carry+chest+'<div class="inv-upper">'+equipmentHtml()+workbenchHtml()+'</div><section class="inv-storage-section"><div class="inv-section-title"><span>MOCHILA</span><small>'+hotbarStart()+' ESPACIOS · PILAS DE 64</small></div>'+playerGridHtml(0,hotbarStart())+'</section><section class="inv-hotbar-section"><div class="inv-section-title"><span>BARRA RÁPIDA</span><small>ATAJOS 1 — 9</small></div>'+playerGridHtml(hotbarStart(),inventorySlotCount())+'</section><footer class="inv-footer"><span><kbd>CLIC</kbd> tomar / colocar · <kbd>CLIC DERECHO</kbd> mitad / 1 unidad · <kbd>MAYÚS + CLIC</kbd> transferencia rápida</span><span><kbd>E</kbd> / <kbd>ESC</kbd> cerrar</span></footer></div></div>';}
function openInv(k){IVK=k||null;var saved=S.inventoryCursor;IVHeld=saved&&RES[saved.id]&&Number.isFinite(saved.qty)&&Math.floor(saved.qty)>=1?{id:saved.id,qty:Math.min(64,Math.floor(saved.qty)),origin:(saved.origin==='c'&&IVK&&saved.chestKey===IVK&&saved.chestPlanet===S.pl)?'c':'i'}:null;renderInv();IVP.style.display='flex';invOpenBtn.setAttribute('aria-pressed','true');snd(k?'chest_open':'move')}
function storeSlots(storage){if(storage==='c'){var w=wd();ensureChestSlots(w,IVK);return w.chestInvSlots[IVK]}ensurePlayerSlots();return S.invSlots}
function syncStorage(storage){if(storage==='c'){var w=wd();syncChestTotals(w,IVK)}else syncPlayerTotals()}
function returnHeld(){if(!IVHeld)return true;var left=IVHeld.qty,orderPlayer=slotOrder();if(IVHeld.origin==='c'&&IVK){var w=wd();ensureChestSlots(w,IVK);left=insertStack(w.chestInvSlots[IVK],IVHeld.id,left,w.chestInvSlots[IVK].map(function(_,i){return i}));syncChestTotals(w,IVK)}if(left>0){ensurePlayerSlots();left=insertStack(S.invSlots,IVHeld.id,left,orderPlayer);syncPlayerTotals()}if(left>0){IVHeld.qty=left;return false}IVHeld=null;return true}
function closeInv(){if(IVP.style.display==='none')return;if(!returnHeld()){renderInv();msg('No hay espacio para devolver la pila. Libera una ranura e inténtalo de nuevo.');return}IVP.style.display='none';S.inventoryCursor=null;invOpenBtn.setAttribute('aria-pressed','false');if(IVK)snd('chest_close');IVK=null}
function toggleInventory(){if(IVP.style.display==='flex'){closeInv();return}if(document.pointerLockElement===cv&&document.exitPointerLock)document.exitPointerLock();openInv(null)}
function quickMove(storage,index){var from=storeSlots(storage),q=from[index];if(!q)return;var targetStorage,targetSlots,targetIndices;if(IVK){targetStorage=storage==='i'?'c':'i';targetSlots=storeSlots(targetStorage);targetIndices=targetSlots.map(function(_,i){return i});if(targetStorage==='i')targetIndices=slotOrder()}else{targetStorage='i';targetSlots=from;targetIndices=[];if(index<hotbarStart()){for(var h=hotbarStart();h<inventorySlotCount();h++)targetIndices.push(h)}else{for(var m=0;m<hotbarStart();m++)targetIndices.push(m)}}var before=q.qty,rem=insertStack(targetSlots,q.id,before,targetIndices),moved=before-rem;if(moved<=0){msg('No hay espacio disponible en el destino.');return}q.qty-=moved;if(q.qty<=0)from[index]=null;syncStorage(storage);if(targetStorage!==storage)syncStorage(targetStorage);snd('move');renderInv()}
function slotLeftClick(storage,index,shift){if(shift&&!IVHeld){quickMove(storage,index);return}var slots=storeSlots(storage),q=slots[index];if(!IVHeld){if(!q)return;IVHeld={id:q.id,qty:q.qty,origin:storage};slots[index]=null;syncStorage(storage);snd('move');renderInv();return}if(!q){slots[index]={id:IVHeld.id,qty:IVHeld.qty};IVHeld=null;syncStorage(storage);snd('move');renderInv();return}if(q.id===IVHeld.id){if(q.qty<64){var moved=Math.min(64-q.qty,IVHeld.qty);q.qty+=moved;IVHeld.qty-=moved;if(IVHeld.qty<=0)IVHeld=null;syncStorage(storage);snd('move');renderInv()}return}var old=q;slots[index]={id:IVHeld.id,qty:IVHeld.qty};IVHeld={id:old.id,qty:old.qty,origin:storage};syncStorage(storage);snd('move');renderInv()}
function slotRightClick(storage,index){var slots=storeSlots(storage),q=slots[index];if(!IVHeld){if(!q)return;var take=Math.ceil(q.qty/2);IVHeld={id:q.id,qty:take,origin:storage};q.qty-=take;if(q.qty<=0)slots[index]=null;syncStorage(storage);snd('move');renderInv();return}if(!q){slots[index]={id:IVHeld.id,qty:1};IVHeld.qty--;if(IVHeld.qty<=0)IVHeld=null;syncStorage(storage);snd('move');renderInv();return}if(q.id===IVHeld.id&&q.qty<64){q.qty++;IVHeld.qty--;if(IVHeld.qty<=0)IVHeld=null;syncStorage(storage);snd('move');renderInv()}}
IVP.addEventListener('click',function(e){var close=e.target.closest('[data-inv-close]');if(close){closeInv();return}if(e.target===IVP){closeInv();return}var sl=e.target.closest('.inv-slot');if(!sl)return;slotLeftClick(sl.dataset.storage,+sl.dataset.slot,e.shiftKey)});
IVP.addEventListener('contextmenu',function(e){var sl=e.target.closest('.inv-slot');if(!sl)return;e.preventDefault();slotRightClick(sl.dataset.storage,+sl.dataset.slot)});

// Barra rápida real de 9 ranuras: se dibuja siempre en el HUD del mundo,
// no solo dentro de la ventana de inventario.
var hudHotbar=document.createElement('section');hudHotbar.id='cosmo-game-hotbar';hudHotbar.setAttribute('aria-label','Barra rápida de nueve espacios');hudHotbar.innerHTML='<div class="hud-hotbar-caption"><span>EQUIPO RÁPIDO</span><small>1 — 9</small></div><div class="hud-hotbar-slots" role="group" aria-label="Ranuras seleccionables"></div>';
cz.appendChild(hudHotbar);
var hudHotbarSlots=hudHotbar.querySelector('.hud-hotbar-slots'),hudHotbarSignature='';
function renderHudHotbar(){if(!hudHotbarSlots||!S)return;ensurePlayerSlots();var start=hotbarStart(),html='',sig=String(S.selectedHotbar)+'|';for(var i=0;i<9;i++){var q=S.invSlots[start+i],id=q?q.id:'',qty=q?q.qty:0;sig+=id+':'+qty+';';var icon=q&&RI[q.id]?RI[q.id]:'',name=q&&RES[q.id]?RES[q.id][0]:'Ranura vacía';html+='<button type="button" class="hud-hotbar-slot'+(i===S.selectedHotbar?' is-selected':'')+(q?' has-item':' is-empty')+'" data-hotbar-slot="'+i+'" title="'+name+(q?' × '+qty:'')+'" aria-label="Espacio '+(i+1)+': '+name+(q?', cantidad '+qty:'')+'"><span class="hud-slot-key">'+(i+1)+'</span><span class="hud-slot-item">'+icon+'</span>'+(qty>1?'<span class="hud-slot-qty">'+qty+'</span>':'')+'</button>'}if(sig!==hudHotbarSignature){hudHotbarSlots.innerHTML=html;hudHotbarSignature=sig}else{var buttons=hudHotbarSlots.querySelectorAll('[data-hotbar-slot]');for(var j=0;j<buttons.length;j++)buttons[j].classList.toggle('is-selected',j===S.selectedHotbar)}}
hudHotbar.addEventListener('click',function(e){var b=e.target.closest('[data-hotbar-slot]');if(!b)return;e.preventDefault();e.stopPropagation();S.selectedHotbar=+b.dataset.hotbarSlot;renderHudHotbar();var q=S.invSlots[hotbarStart()+S.selectedHotbar];msg(q?'Seleccionado: '+RES[q.id][0]+' × '+q.qty:'Ranura '+(S.selectedHotbar+1)+' vacía')});

function resize(){rd.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
addEventListener('resize',resize);
var last=performance.now(),fl=0;
function loop(now){requestAnimationFrame(loop);if(!active){last=now;return}var dt=Math.min(.05,(now-last)/1000);last=now;
if(L)updLaunch(dt);else if(!(IVP&&IVP.style.display==='flex'))upd(dt);
hudT+=dt;if(hudT>.2){hudT=0;hud()}saveT+=dt;if(saveT>4){saveT=0;try{localStorage.setItem('cosmo3d2',JSON.stringify(S))}catch(e){}}
var w=wd();updateTerrainChunks(false);pm.position.set(T(S.px),terrainHeight(T(S.px),Z(S.py))+.04,Z(S.py));pm.visible=!(L&&L.stage!=='boom'&&false);
handSwing=Math.max(0,handSwing-dt*3.4);fpHand.visible=viewMode==='fps'&&!L;fpHand.rotation.x=-handSwing*.65;fpHand.rotation.z=.14+handSwing*.22;fpHand.position.y=-.37+(((keys.u||keys.d||keys.l||keys.r)?Math.sin(now*.014)*.018:0));
netTick(dt);dayTick(dt);ring.visible=!!(mine&&mine.a>0&&Math.hypot(mine.x-S.px,mine.y-S.py)<(viewMode==='fps'?4.8:1.8));if(ring.visible){ring.position.set(T(mine.x),terrainHeight(T(mine.x),Z(mine.y))+.1,Z(mine.y));ring.scale.setScalar(.4+prog*1.2)}
var h=!L&&tool!=='move'&&Number.isFinite(hov.x)&&Number.isFinite(hov.y)&&(hov.x!==-1||hov.y!==-1);ghost.visible=h;
if(h){ghost.position.set(T(hov.x+.5),terrainHeight(T(hov.x+.5),Z(hov.y+.5))+.15,Z(hov.y+.5));var k=hov.x+','+hov.y,ok=tool==='del'||(tool==='rocket'?w.grid[k]==='plat'&&!w.rocket:!w.grid[k]);ghost.material.color.set(ok?0x57d39a:0xff6d58)}
var up=0,shake=0;
if(rocketM){var f=rocketM.getObjectByName('fl');f.visible=false;
if(L&&L.stage==='up'){up=L.t*L.t*9;rocketM.position.y=.15+up;f.visible=true;f.scale.set(1,.7+Math.random()*.6,1);shake=Math.min(.12,L.t*.05);rocketM.position.x=T(w.rocket.x+.5)+(Math.random()-.5)*shake}
else if(L&&(L.stage==='travel'||L.stage==='boom'))rocketM.visible=L.stage!=='travel'&&false;else rocketM.visible=true}
if(L&&L.stage==='boom'){boom.visible=true;boom.position.set(T(w.rocket.x+.5),up||3,Z(w.rocket.y+.5));boom.scale.setScalar(.5+L.t*3);boom.material.opacity=Math.max(0,1-L.t/2.2)}
if(viewMode==='fps'&&!L){
 var fx=T(S.px),fz=Z(S.py),groundY=terrainHeight(fx,fz),eyeY=groundY+1.58+jumpY;
 pm.visible=false;cam.position.set(fx,eyeY,fz);
 cam.lookAt(fx+Math.sin(fpsYaw)*Math.cos(fpsPitch),eyeY+Math.sin(fpsPitch),fz+Math.cos(fpsYaw)*Math.cos(fpsPitch));
}else{
 pm.visible=true;var tx=T(S.px),tz=Z(S.py),ty=0;if(L&&L.stage==='up'){tx=T(w.rocket.x+.5);tz=Z(w.rocket.y+.5);ty=up*.7}
 if(L&&L.stage==='boom'){tx=T(w.rocket.x+.5);tz=Z(w.rocket.y+.5);ty=10}
 cam.position.x+=(tx-cam.position.x)*Math.min(1,dt*4);cam.position.y+=(ty+10*zm-cam.position.y)*Math.min(1,dt*4);cam.position.z+=(tz+8.5*zm-cam.position.z)*Math.min(1,dt*4);
 cam.lookAt(cam.position.x,ty*.8,cam.position.z-8.5*zm);
}
rd.render(scene,cam)}
resize();cam.position.set(T(S.px),10,Z(S.py)+8.5);netConnect();loadWorld();hud();try{localStorage.setItem('cosmo3d2',JSON.stringify(S))}catch(e){}requestAnimationFrame(loop);
})();
