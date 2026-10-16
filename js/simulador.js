(function () {
    'use strict';

    var missions = [
      { planet:'Tierra', name:'Órbita azul', code:'NIVEL 01', difficulty:'● INICIAL', gravity:'1.00 g', distance:'200 km', final:'ATERRIZAJE', color:0x227bbd, atmosphere:0x66bce8, size:13, desc:'Despega desde la costa, completa una órbita corta y regresa a la plataforma. El mejor lugar para dominar potencia y control vectorial.' },
      { planet:'Luna', name:'Silencio lunar', code:'NIVEL 02', difficulty:'● PRECISO', gravity:'0.16 g', distance:'384 mil km', final:'ALUNIZAJE', color:0xaeb2ad, atmosphere:0x6f7573, size:9, desc:'Cruza el espacio cislunar y posa la nave sin ayuda atmosférica. La baja gravedad exige anticipar cada corrección.' },
      { planet:'Marte', name:'Corredor Ares', code:'NIVEL 03', difficulty:'● MEDIO', gravity:'0.38 g', distance:'225 M km', final:'ATERRIZAJE', color:0xb84d2b, atmosphere:0xe59459, size:11, desc:'Ejecuta una transferencia a Marte, entra en su atmósfera tenue y aterriza en una planicie de polvo rojo.' },
      { planet:'Venus', name:'Velo dorado', code:'NIVEL 04', difficulty:'● DIFÍCIL', gravity:'0.90 g', distance:'261 M km', final:'PLATAFORMA', color:0xd89b45, atmosphere:0xffd27a, size:12, desc:'Atraviesa una atmósfera densa y turbulenta. Mantén el corredor de descenso mientras proteges la reserva de combustible.' },
      { planet:'Júpiter', name:'Ojo de tormenta', code:'NIVEL 05', difficulty:'● EXPERTO', gravity:'2.53 g', distance:'778 M km', final:'ÓRBITA', color:0xc59263, atmosphere:0xffd09f, size:22, desc:'No hay superficie donde aterrizar: frena sobre las nubes y captura una órbita estable sin caer en el gigante gaseoso.' },
      { planet:'Sol', name:'Corona', code:'NIVEL 06', difficulty:'● EXTREMO', gravity:'27.9 g', distance:'149 M km', final:'PERIHELIO', color:0xffb31f, atmosphere:0xff6a00, size:26, desc:'La misión final es un sobrevuelo del Sol. Controla la aceleración, completa el perihelio y escapa antes de agotar el propelente.' }
    ];

    var materialNames = {
      Tierra:['Acero reciclado','Sílice','Metano'],
      Luna:['Hierro meteórico','Regolito','Hielo polar'],
      Marte:['Magnetita','Basalto','Hielo subterráneo'],
      Venus:['Níquel','Cerámica','CO₂ procesado'],
      Júpiter:['Aleación orbital','Silicatos','Hidrógeno'],
      Sol:['Tungsteno','Cerámica térmica','Helio-3']
    };
    var buildSteps = [
      {name:'Cimientos y extractor', cost:[3,2,0], detail:'Estabiliza el terreno y automatiza la cantera.'},
      {name:'Plataforma de lanzamiento', cost:[5,4,2], detail:'Monta la losa, deflector y anillo de apoyo.'},
      {name:'Torre, depósitos y brazos', cost:[7,5,3], detail:'Completa el complejo y habilita el despegue.'}
    ];
    var bases = {};
    missions.forEach(function(m){bases[m.planet]={inventory:[0,0,0],stage:0,scans:0,design:{},fuel:0};});

    var selected = 0, currentPlanet = 0, mode = 'campaign', gameActive = false, paused = false, phase = 'menu', phaseProgress = 0;
    var altitude = 0, speed = 0, fuel = 100, tilt = 0, thrust = 0, lateral = 0, elapsed = 0, score = 0;
    var input = {up:false,down:false,left:false,right:false,space:false};
    var scene, camera, renderer, rocket, flame, engineGlow, targetPlanet, atmosphere, surfaceSite, starfield, menuOrbit;
    var planetTextures = {};
    var clock = { last: performance.now() };
    var stage = document.getElementById('stage');

    var list = document.getElementById('mission-list');
    missions.forEach(function(m, i) {
      var b = document.createElement('button');
      b.className = 'mission-card' + (i===0 ? ' active' : '');
      b.innerHTML = '<span class="num">0'+(i+1)+'</span><strong>'+m.planet+'</strong><small>'+m.final.toLowerCase()+'</small>';
      b.addEventListener('click', function(){ selectMission(i); });
      list.appendChild(b);
    });

    function selectMission(i) {
      selected = i;
      var m = missions[i];
      Array.prototype.forEach.call(document.querySelectorAll('.mission-card'), function(c,j){ c.classList.toggle('active', j===i); });
      document.getElementById('brief-code').textContent = mode === 'campaign' ? m.code : 'DESTINO LIBRE';
      document.getElementById('brief-name').textContent = m.name;
      document.getElementById('brief-difficulty').textContent = mode === 'campaign' ? m.difficulty : '● AJUSTABLE';
      document.getElementById('brief-desc').textContent = m.desc;
      document.getElementById('stat-gravity').textContent = m.gravity;
      document.getElementById('stat-distance').textContent = m.distance;
      document.getElementById('stat-final').textContent = m.final;
      document.getElementById('preview-name').textContent = m.planet.toUpperCase();
      updateBaseStatus();
      if (targetPlanet) buildPreviewPlanet(m);
    }

    function setMode(next) {
      mode = next;
      var isCampaign = next === 'campaign';
      document.getElementById('campaign-tab').classList.toggle('active', isCampaign);
      document.getElementById('free-tab').classList.toggle('active', !isCampaign);
      document.getElementById('campaign-tab').setAttribute('aria-selected', isCampaign);
      document.getElementById('free-tab').setAttribute('aria-selected', !isCampaign);
      selectMission(selected);
    }
    document.getElementById('campaign-tab').addEventListener('click', function(){setMode('campaign');});
    document.getElementById('free-tab').addEventListener('click', function(){setMode('free');});

    function updateBaseStatus() {
      var home=missions[currentPlanet],base=bases[home.planet],ready=base.stage===buildSteps.length;
      document.getElementById('base-location').textContent='Base · '+home.planet;
      document.getElementById('base-status').textContent=ready?'Complejo operativo. Plataforma, torre y depósitos listos.':'Construcción '+base.stage+'/3 · busca recursos locales para continuar.';
      document.getElementById('surface-ops').textContent=ready?'GESTIONAR':'EXPLORAR';
      document.getElementById('launch').textContent=mode==='free'?'Lanzar simulación libre':ready?'Iniciar secuencia':'Preparar base de lanzamiento';
    }

    function openSurfaceOps() {
      var home=missions[currentPlanet],names=materialNames[home.planet];
      document.getElementById('surface-title').textContent='Complejo · '+home.planet;
      document.getElementById('surface-copy').textContent='Escanea '+home.planet+', recupera materiales y ensambla el área de lanzamiento por etapas.';
      document.getElementById('metal-label').textContent=names[0];
      document.getElementById('silicate-label').textContent=names[1];
      document.getElementById('volatile-label').textContent=names[2];
      document.getElementById('surface-dialog').classList.remove('hidden');
      renderSurfaceOps();
    }
    function closeSurfaceOps(){document.getElementById('surface-dialog').classList.add('hidden');}

    var DT={slab:{n:'Losa',s:'LOS',c:[3,0,0]},tower:{n:'Torre',s:'TOR',c:[4,2,0]},tank:{n:'Depósito',s:'DEP',c:[2,0,2]},rod:{n:'Pararrayos',s:'PAR',c:[2,0,0]},ext:{n:'Extractor',s:'EXT',c:[2,1,0]},ref:{n:'Refinería',s:'REF',c:[3,2,0]},del:{n:'Demoler',s:'✕',c:[0,0,0]}};
    var designTool='slab';
    function dCount(base,t){var n=0;for(var k in base.design)if(base.design[k]===t)n++;return n;}
    function fuelCap(base){return Math.min(100,40+30*dCount(base,'tank'));}
    function refine(base,names){var refs=dCount(base,'ref'),cap=fuelCap(base),msg;if(!refs)msg='Construye una refinería para producir combustible.';else{var n=0;while(base.inventory[2]>0&&base.fuel<cap){base.inventory[2]--;base.fuel=Math.min(cap,base.fuel+8*refs);n++;}msg=n?'Refinados '+n+' '+names[2]+'. Combustible '+Math.round(base.fuel)+'/'+cap+'.':'Sin '+names[2]+' que refinar o depósitos llenos.';}document.getElementById('scan-readout').textContent=msg;}
    function recalcBase(base){var s=0;if(dCount(base,'slab')>=4)s=1;if(s===1&&dCount(base,'tower')>=1)s=2;if(s===2&&dCount(base,'tank')>=1)s=3;base.stage=s;}
    function renderSurfaceOps() {
      var home=missions[currentPlanet],base=bases[home.planet],names=materialNames[home.planet];
      recalcBase(base);
      document.getElementById('inv-metal').textContent=base.inventory[0];
      document.getElementById('inv-silicate').textContent=base.inventory[1];
      document.getElementById('inv-volatile').textContent=base.inventory[2];
      document.getElementById('build-progress').textContent=base.stage+'/3 REQUISITOS';
      var listEl=document.getElementById('build-list');listEl.innerHTML='';
      var pal=document.createElement('div');pal.className='dz-pal';
      Object.keys(DT).forEach(function(k){var t=DT[k],b=document.createElement('button');b.className=designTool===k?'on':'';
        b.textContent=t.n+(k==='del'?'':' · '+t.c.map(function(v,j){return v?v+' '+names[j].split(' ')[0]:'';}).filter(Boolean).join(' '));
        b.addEventListener('click',function(){designTool=k;renderSurfaceOps();});pal.appendChild(b);});
      listEl.appendChild(pal);
      var grid=document.createElement('div');grid.className='dz-grid';
      for(var y=0;y<7;y++)for(var x=0;x<9;x++)(function(x,y){var key=x+','+y,cell=document.createElement('button'),t=base.design[key];
        if(x===4&&y===3){cell.className='core';cell.textContent='COH';cell.disabled=true;}
        else{if(t){cell.dataset.t=t;cell.textContent=DT[t].s;}
          cell.addEventListener('click',function(){
            if(designTool==='del'){if(t){DT[t].c.forEach(function(v,j){base.inventory[j]+=Math.floor(v/2);});delete base.design[key];}}
            else if(!t){var c=DT[designTool].c;if(!c.every(function(v,j){return base.inventory[j]>=v;})){document.getElementById('scan-readout').textContent='Materiales insuficientes para '+DT[designTool].n+'.';return;}
              c.forEach(function(v,j){base.inventory[j]-=v;});base.design[key]=designTool;}
            renderSurfaceOps();updateBaseStatus();});}
        grid.appendChild(cell);})(x,y);
      listEl.appendChild(grid);
      var req=document.createElement('ul');req.className='dz-req';
      [[dCount(base,'slab')>=4,'4+ losas ('+dCount(base,'slab')+'/4)'],[dCount(base,'tower')>=1,'Torre de lanzamiento'],[dCount(base,'tank')>=1,'Depósito de combustible']].forEach(function(r){var li=document.createElement('li');li.className=r[0]?'ok':'';li.textContent=(r[0]?'✓ ':'○ ')+r[1];req.appendChild(li);});
      listEl.appendChild(req);
      var fr=document.createElement('div');fr.className='ops-title';fr.style.marginTop='12px';fr.innerHTML='<h3>Combustible '+Math.round(base.fuel)+'/'+fuelCap(base)+'</h3>';var fb=document.createElement('button');fb.className='scan-button';fb.textContent='REFINAR';fb.addEventListener('click',function(){refine(base,names);renderSurfaceOps();updateBaseStatus();});fr.appendChild(fb);listEl.appendChild(fr);
      var note=document.createElement('p');note.className='ops-note';note.textContent='Los extractores aumentan lo que recuperas en cada barrido. Cada pararrayos sube la seguridad del despegue; la refinería convierte volátiles en combustible (40 mínimo para despegar). Todo aparece en 3D.';listEl.appendChild(note);
    }

    function scanSurface() {
      var home=missions[currentPlanet],base=bases[home.planet],names=materialNames[home.planet];
      var field=document.getElementById('scanner-field');
      Array.prototype.forEach.call(field.querySelectorAll('.resource-node'),function(n){n.remove();});
      document.getElementById('scan-empty').classList.add('hidden');
      base.scans++;
      var types=[0,1,2,0,1];
      if(base.stage>0)types.push(2);
      var short=['MET','SIL','VOL'];
      types.forEach(function(type,i){
        if(i>2)type=Math.random()<.42?0:(Math.random()<.72?1:2);
        var node=document.createElement('button');node.className='resource-node';
        node.dataset.type=type===0?'metal':type===1?'silicate':'volatile';node.textContent=short[type];
        node.style.left=(12+Math.random()*76)+'%';node.style.top=(15+Math.random()*70)+'%';
        node.setAttribute('aria-label','Recuperar '+names[type]);
        node.addEventListener('click',function(){
          var amount=2+Math.floor(Math.random()*3)+(base.stage>0?1:0)+dCount(base,'ext');base.inventory[type]+=amount;node.remove();
          document.getElementById('scan-readout').textContent='+'+amount+' '+names[type]+' recuperado.';
          renderSurfaceOps();
          if(!field.querySelector('.resource-node'))document.getElementById('scan-readout').textContent='Sector agotado. Ejecuta otro barrido para seguir buscando.';
        });
        field.appendChild(node);
      });
      document.getElementById('scan-readout').textContent=types.length+' señales detectadas en el sector '+String(base.scans).padStart(2,'0')+'.';
    }
    document.getElementById('surface-ops').addEventListener('click',openSurfaceOps);
    document.getElementById('surface-close').addEventListener('click',closeSurfaceOps);
    document.getElementById('scan').addEventListener('click',scanSurface);

    window.SIM={launch:function(a,b,fp){var ia=0,ib=0;missions.forEach(function(m,i){if(m.planet===a)ia=i;if(m.planet===b)ib=i;});currentPlanet=ia;selected=ib;mode='campaign';window.simResult=null;window.forcedFuel=fp;startGame(true);window.forcedFuel=null;}};
    if (!window.THREE) {
      document.getElementById('menu').classList.add('hidden');
      document.getElementById('unsupported').classList.remove('hidden');
      return;
    }

    function init3D() {
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x02070b, 0.0022);
      camera = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, .1, 1500);
      renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
      renderer.setSize(innerWidth,innerHeight);
      renderer.setClearColor(0x02070b,1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      stage.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0x8edcff,0x080b0d,1.15));
      var key = new THREE.DirectionalLight(0xffffff,2.1); key.position.set(30,50,30); key.castShadow=true; scene.add(key);
      var rim = new THREE.PointLight(0xff6b2d,1.7,180); rim.position.set(-30,8,-20); scene.add(rim);

      var stars = new Float32Array(2600*3);
      for(var i=0;i<2600;i++) {
        var r=150+Math.random()*650, a=Math.random()*Math.PI*2, u=Math.random()*2-1, s=Math.sqrt(1-u*u);
        stars[i*3]=r*s*Math.cos(a); stars[i*3+1]=r*u; stars[i*3+2]=r*s*Math.sin(a);
      }
      var starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));
      starfield = new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xdff6ff,size:.85,sizeAttenuation:true,transparent:true,opacity:.9})); scene.add(starfield);
      createRocket();
      camera.position.set(25,11,42); camera.lookAt(0,0,0);
      buildPreviewPlanet(missions[0]);
      window.addEventListener('resize', onResize);
      animate();
    }

    function createRocket() {
      rocket = new THREE.Group();
      var steel = new THREE.MeshStandardMaterial({color:0xc3c9ca,metalness:.96,roughness:.2});
      var steel2 = new THREE.MeshStandardMaterial({color:0x9da7aa,metalness:.92,roughness:.25});
      var tiles = new THREE.MeshStandardMaterial({color:0x11181b,metalness:.35,roughness:.7});
      var edge = new THREE.MeshStandardMaterial({color:0x263238,metalness:.72,roughness:.32});

      /* Vehículo superior: fuselaje cilíndrico, cono ojival y escudo térmico negro. */
      var shipBody = new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.08,6.75,40),steel);
      shipBody.position.y=2.55; shipBody.castShadow=true; rocket.add(shipBody);
      var nose = new THREE.Mesh(new THREE.ConeGeometry(1.08,3.1,40,5),steel);
      nose.position.y=7.47; nose.castShadow=true; rocket.add(nose);
      var tileBody = new THREE.Mesh(new THREE.CylinderGeometry(1.095,1.095,6.76,40,1,true,Math.PI/2,Math.PI),tiles);
      tileBody.position.y=2.55; rocket.add(tileBody);
      var tileNose = new THREE.Mesh(new THREE.ConeGeometry(1.095,3.12,40,5,true,Math.PI/2,Math.PI),tiles);
      tileNose.position.y=7.47; rocket.add(tileNose);
      var stageRing = new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.12,.26,40),edge);
      stageRing.position.y=-.92; rocket.add(stageRing);

      /* Aletas móviles del vehículo superior, visibles de perfil y de frente. */
      var aftGeo = new THREE.BoxGeometry(1.45,2.05,.16);
      [-1,1].forEach(function(side){
        var flap=new THREE.Mesh(aftGeo,tiles); flap.position.set(side*1.47,.2,0); flap.rotation.z=side*.14; rocket.add(flap);
      });
      var foreGeo = new THREE.BoxGeometry(1.0,1.45,.13);
      [-1,1].forEach(function(side){
        var flap=new THREE.Mesh(foreGeo,tiles); flap.position.set(side*1.25,4.85,0); flap.rotation.z=side*.14; rocket.add(flap);
      });

      /* Propulsor pesado más largo, con rejillas y conjunto de motores. */
      var booster = new THREE.Mesh(new THREE.CylinderGeometry(1.27,1.27,7.45,40),steel2);
      booster.position.y=-4.76; booster.castShadow=true; rocket.add(booster);
      var boosterBands=[-1.45,-3.2,-5.1,-7.25];
      boosterBands.forEach(function(y){var band=new THREE.Mesh(new THREE.CylinderGeometry(1.285,1.285,.1,40),edge);band.position.y=y;rocket.add(band);});
      var gridGeo=new THREE.BoxGeometry(1.25,.12,.72);
      [[1.45,0,0],[-1.45,0,0],[0,0,1.45],[0,0,-1.45]].forEach(function(p,i){
        var grid=new THREE.Mesh(gridGeo,edge);grid.position.set(p[0],-1.45,p[2]);if(i>1)grid.rotation.y=Math.PI/2;rocket.add(grid);
      });
      var engineSkirt = new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.27,.78,40),edge);
      engineSkirt.position.y=-8.88; rocket.add(engineSkirt);
      var nozzleMat=new THREE.MeshStandardMaterial({color:0x0a0f12,metalness:.88,roughness:.38});
      [[0,0],[.48,0],[-.48,0],[0,.48],[0,-.48],[.46,.46],[-.46,.46],[.46,-.46],[-.46,-.46]].forEach(function(p){
        var nozzle=new THREE.Mesh(new THREE.ConeGeometry(.18,.72,14),nozzleMat);nozzle.position.set(p[0],-9.38,p[1]);nozzle.rotation.z=Math.PI;rocket.add(nozzle);
      });
      var flameMat = new THREE.MeshBasicMaterial({color:0xff8a20,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
      flame = new THREE.Mesh(new THREE.ConeGeometry(.86,6.2,20),flameMat); flame.position.y=-12.75; flame.rotation.z=Math.PI; rocket.add(flame);
      engineGlow = new THREE.PointLight(0xff5c18,2.5,42); engineGlow.position.y=-9.7; rocket.add(engineGlow);
      scene.add(rocket);
    }

    function seededRandom(seed) {
      var n=seed||1;
      return function(){n=(n*1664525+1013904223)>>>0;return n/4294967296;};
    }

    function makePlanetTexture(m) {
      if(planetTextures[m.planet]) return planetTextures[m.planet];
      var canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
      var ctx=canvas.getContext('2d'),rnd=seededRandom(m.planet.charCodeAt(0)*997+m.planet.length*71);
      var palettes={
        'Tierra':['#0b4775','#176da0','#4f8f52','#8d7748'],
        'Luna':['#777b7d','#a8aa9f','#4c5052','#d2d1c5'],
        'Marte':['#8b321e','#c95a2f','#54271f','#e58a55'],
        'Venus':['#b8732d','#e3ae55','#89501f','#f1cf79'],
        'Júpiter':['#b98760','#e0bd91','#704938','#f1d3a4'],
        'Sol':['#ef5a0b','#ffac18','#a92b05','#ffd65a']
      };
      var p=palettes[m.planet];ctx.fillStyle=p[0];ctx.fillRect(0,0,1024,512);
      var grd=ctx.createLinearGradient(0,0,0,512);grd.addColorStop(0,'rgba(255,255,255,.28)');grd.addColorStop(.48,'rgba(255,255,255,0)');grd.addColorStop(1,'rgba(0,0,0,.25)');ctx.fillStyle=grd;ctx.fillRect(0,0,1024,512);

      if(m.planet==='Tierra') {
        ctx.fillStyle='#3d8a53';
        [[80,110,150,80,175,175,120,225,74,190],[230,220,290,185,320,225,292,330,250,392,220,300],[455,112,520,88,568,123,548,180,505,174,470,205],[552,130,715,92,830,130,875,205,770,236,664,205,590,250,520,205],[820,320,884,296,928,326,902,374,842,375]].forEach(function(points){ctx.beginPath();ctx.moveTo(points[0],points[1]);for(var i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.closePath();ctx.fill();});
        ctx.fillStyle='rgba(199,177,91,.48)';ctx.beginPath();ctx.ellipse(594,252,53,76,.18,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(235,247,247,.9)';ctx.fillRect(0,0,1024,20);ctx.fillRect(0,493,1024,19);
      } else if(m.planet==='Luna') {
        for(var c=0;c<105;c++){var r=4+rnd()*24,x=rnd()*1024,y=rnd()*512;ctx.fillStyle='rgba(25,30,31,'+(.07+rnd()*.18)+')';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(235,235,220,.2)';ctx.lineWidth=Math.max(1,r*.12);ctx.stroke();}
        ctx.fillStyle='rgba(45,48,49,.2)';ctx.beginPath();ctx.ellipse(270,180,115,62,-.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(705,320,142,78,.12,0,Math.PI*2);ctx.fill();
      } else if(m.planet==='Marte') {
        for(var d=0;d<70;d++){ctx.fillStyle=d%3?'rgba(90,37,26,.12)':'rgba(230,126,71,.16)';ctx.beginPath();ctx.ellipse(rnd()*1024,rnd()*512,15+rnd()*70,5+rnd()*24,rnd()*Math.PI,0,Math.PI*2);ctx.fill();}
        ctx.strokeStyle='rgba(75,31,24,.42)';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(340,286);ctx.bezierCurveTo(470,250,575,325,735,271);ctx.stroke();
        ctx.fillStyle='rgba(245,220,184,.85)';ctx.fillRect(0,0,1024,13);ctx.fillRect(0,500,1024,12);
      } else if(m.planet==='Venus') {
        for(var v=0;v<20;v++){var yy=v*27+rnd()*12;ctx.strokeStyle=v%2?'rgba(255,225,145,.34)':'rgba(103,55,21,.18)';ctx.lineWidth=9+rnd()*13;ctx.beginPath();ctx.moveTo(-40,yy);ctx.bezierCurveTo(250,yy-35,570,yy+40,1064,yy-10);ctx.stroke();}
      } else if(m.planet==='Júpiter') {
        for(var j=0;j<24;j++){var y=j*22,h=16+rnd()*14;ctx.fillStyle=j%4===0?'#8f523c':j%3===0?'#e4c69f':j%2===0?'#c79168':'#f0dbc0';ctx.fillRect(0,y,1024,h);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(0,y,h>22?4:2);}
        ctx.fillStyle='#a8462f';ctx.beginPath();ctx.ellipse(735,326,94,39,-.08,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,202,150,.55)';ctx.lineWidth=8;ctx.stroke();
      } else {
        for(var s=0;s<220;s++){var sr=2+rnd()*18;ctx.fillStyle=s%4?'rgba(255,210,72,.17)':'rgba(111,20,0,.18)';ctx.beginPath();ctx.arc(rnd()*1024,rnd()*512,sr,0,Math.PI*2);ctx.fill();}
        for(var q=0;q<18;q++){ctx.strokeStyle='rgba(255,235,134,.23)';ctx.lineWidth=4+rnd()*7;ctx.beginPath();var sy=rnd()*512;ctx.moveTo(-20,sy);ctx.bezierCurveTo(280,sy-55,660,sy+50,1044,sy-15);ctx.stroke();}
      }
      /* Microdetalle fijo: evita superficies planas sin producir parpadeo entre cuadros. */
      for(var n=0;n<1300;n++){ctx.fillStyle='rgba(255,255,255,'+(rnd()*.055)+')';ctx.fillRect(rnd()*1024,rnd()*512,1+rnd()*2,1+rnd()*2);}
      var texture=new THREE.CanvasTexture(canvas);texture.wrapS=THREE.RepeatWrapping;texture.encoding=THREE.sRGBEncoding;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      planetTextures[m.planet]=texture;return texture;
    }

    function makeCloudTexture(kind) {
      var key=kind+'-nubes';if(planetTextures[key])return planetTextures[key];
      var canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;var ctx=canvas.getContext('2d'),rnd=seededRandom(kind==='Tierra'?8711:4719);
      for(var i=0;i<48;i++){var y=rnd()*512;ctx.strokeStyle=kind==='Tierra'?'rgba(255,255,255,'+(.15+rnd()*.3)+')':'rgba(255,226,157,'+(.12+rnd()*.18)+')';ctx.lineWidth=4+rnd()*16;ctx.beginPath();ctx.moveTo(rnd()*260-80,y);ctx.bezierCurveTo(320,y-45-rnd()*25,650,y+50+rnd()*30,1090,y-15);ctx.stroke();}
      var texture=new THREE.CanvasTexture(canvas);texture.wrapS=THREE.RepeatWrapping;texture.encoding=THREE.sRGBEncoding;planetTextures[key]=texture;return texture;
    }

    function createPlanetGroup(m,radius) {
      var group=new THREE.Group();
      var coreMat=new THREE.MeshStandardMaterial({map:makePlanetTexture(m),color:0xffffff,roughness:m.planet==='Tierra'?.68:.9,metalness:0});
      if(m.planet==='Sol'){coreMat.emissive=new THREE.Color(0xff6a00);coreMat.emissiveMap=coreMat.map;coreMat.emissiveIntensity=1.45;}
      var sphere=new THREE.Mesh(new THREE.SphereGeometry(radius,72,48),coreMat);sphere.receiveShadow=true;group.add(sphere);
      if(m.planet==='Tierra'||m.planet==='Venus'){
        var clouds=new THREE.Mesh(new THREE.SphereGeometry(radius*1.012,64,42),new THREE.MeshStandardMaterial({map:makeCloudTexture(m.planet),transparent:true,opacity:m.planet==='Tierra'?.74:.84,depthWrite:false,roughness:1}));clouds.name='clouds';clouds.rotation.y=.35;group.add(clouds);
      }
      var atmoOpacity=m.planet==='Luna'?.025:m.planet==='Marte'?.1:m.planet==='Sol'?.24:.18;
      var atmoMat=new THREE.MeshBasicMaterial({color:m.atmosphere,transparent:true,opacity:atmoOpacity,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false});
      atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*(m.planet==='Sol'?1.085:1.055),64,44),atmoMat);group.add(atmosphere);
      if(m.planet==='Sol'){var solarLight=new THREE.PointLight(0xffaa44,3.2,260);group.add(solarLight);}
      group.userData.radius=radius;return group;
    }

    function createSurfaceArea(m,stageLevel){var g=createSurfaceBase(m,stageLevel),base=bases[m.planet],mc=new THREE.MeshStandardMaterial({color:0x68747a,roughness:.7,metalness:.3}),md=new THREE.MeshStandardMaterial({color:0x202a2e,roughness:.6,metalness:.6}),ms=new THREE.MeshStandardMaterial({color:0xe35b2f,roughness:.5,metalness:.4}),mg=new THREE.MeshStandardMaterial({color:0x56d7e7,roughness:.4,metalness:.5});
      for(var k in base.design){var p=k.split(','),t=base.design[k],o=new THREE.Group();o.position.set((p[0]-4)*1.7,.5,(p[1]-3)*1.7);
        if(t==='slab'){var a=new THREE.Mesh(new THREE.BoxGeometry(1.6,.22,1.6),mc);a.position.y=.1;o.add(a);}
        else if(t==='tower'){[-.3,.3].forEach(function(x){var l=new THREE.Mesh(new THREE.BoxGeometry(.14,5.5,.14),ms);l.position.set(x,2.75,0);o.add(l);});for(var y=.6;y<5.4;y+=.9){var r=new THREE.Mesh(new THREE.BoxGeometry(.8,.08,.1),md);r.position.y=y;o.add(r);}}
        else if(t==='tank'){var c=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,1.8,16),mc);c.position.y=.9;o.add(c);var d=new THREE.Mesh(new THREE.SphereGeometry(.6,16,8),mc);d.scale.y=.5;d.position.y=1.8;o.add(d);}
        else if(t==='rod'){var q=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,4,8),md);q.position.y=2;o.add(q);var u=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),ms);u.position.y=4;o.add(u);}
        else if(t==='ext'){var e=new THREE.Mesh(new THREE.CylinderGeometry(.3,.15,2,10),mg);e.position.y=1;e.rotation.z=.3;o.add(e);var h=new THREE.Mesh(new THREE.BoxGeometry(.9,.4,.9),md);h.position.y=.2;o.add(h);}
        g.add(o);}
      return g;}
    function createSurfaceBase(m,stageLevel) {
      var group=new THREE.Group();
      var soilColors={Tierra:0x496b45,Luna:0x777872,Marte:0x8b3d28,Venus:0xa86c31,Júpiter:0x96745f,Sol:0x7b2d0d};
      var soil=new THREE.MeshStandardMaterial({color:soilColors[m.planet],roughness:.96,metalness:0});
      var dark=new THREE.MeshStandardMaterial({color:0x202a2e,roughness:.7,metalness:.62});
      var concrete=new THREE.MeshStandardMaterial({color:0x68747a,roughness:.76,metalness:.25});
      var safety=new THREE.MeshStandardMaterial({color:0xe35b2f,roughness:.55,metalness:.4});
      var terrain=new THREE.Mesh(new THREE.CylinderGeometry(12,13,.7,32),soil);terrain.position.y=-.45;terrain.receiveShadow=true;group.add(terrain);
      var rnd=seededRandom(m.planet.length*401+stageLevel*37);
      for(var r=0;r<16;r++){var rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.18+rnd()*.48,0),soil);var a=rnd()*Math.PI*2,dist=5+rnd()*7;rock.position.set(Math.cos(a)*dist,.05,Math.sin(a)*dist);rock.scale.y=.45+rnd()*.6;rock.rotation.set(rnd(),rnd(),rnd());group.add(rock);}
      if(stageLevel>=1){
        var slab=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.7,.48,32),concrete);slab.position.y=.08;slab.receiveShadow=true;group.add(slab);
        var extractor=new THREE.Group();extractor.position.set(6,.2,-3);var drill=new THREE.Mesh(new THREE.CylinderGeometry(.32,.18,2.5,12),dark);drill.rotation.z=.35;drill.position.y=.9;extractor.add(drill);var drillHead=new THREE.Mesh(new THREE.ConeGeometry(.46,.8,10),safety);drillHead.position.set(.38,-.28,0);drillHead.rotation.z=-1.2;extractor.add(drillHead);group.add(extractor);
      }
      if(stageLevel>=2){
        var pad=new THREE.Mesh(new THREE.CylinderGeometry(3.9,4.2,.42,40),dark);pad.position.y=.55;pad.receiveShadow=true;group.add(pad);
        var ring=new THREE.Mesh(new THREE.TorusGeometry(3.05,.12,10,40),safety);ring.rotation.x=Math.PI/2;ring.position.y=.8;group.add(ring);
        var trench=new THREE.Mesh(new THREE.BoxGeometry(2.2,.28,8.5),dark);trench.position.set(0,.68,3.8);group.add(trench);
        var road=new THREE.Mesh(new THREE.BoxGeometry(12,.16,2.1),concrete);road.position.set(6,.18,6.4);group.add(road);
      }
      if(stageLevel>=3){
        var tower=new THREE.Group();tower.position.set(-4.4,.5,0);
        [-.42,.42].forEach(function(x){[-.42,.42].forEach(function(z){var leg=new THREE.Mesh(new THREE.BoxGeometry(.18,8,.18),dark);leg.position.set(x,4,z);tower.add(leg);});});
        for(var y=1;y<8;y+=1.2){var bar=new THREE.Mesh(new THREE.BoxGeometry(1.2,.12,1.2),safety);bar.position.y=y;tower.add(bar);}
        var arm=new THREE.Mesh(new THREE.BoxGeometry(3.6,.24,.35),dark);arm.position.set(1.45,6.7,0);tower.add(arm);group.add(tower);
        [0,1.55].forEach(function(z){var tank=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,2.8,18),concrete);tank.position.set(6.3,1.55,z-1);group.add(tank);var cap=new THREE.Mesh(new THREE.SphereGeometry(.72,18,10),concrete);cap.scale.y=.45;cap.position.set(6.3,2.95,z-1);group.add(cap);});
        for(var l=0;l<4;l++){var beacon=new THREE.PointLight(l%2?0x56d7e7:0xff6b3d,.8,10);beacon.position.set(l<2?-4.5:4.5,1.2,l%2?-4.2:4.2);group.add(beacon);}
      }
      return group;
    }

    function disposePlanet() {
      if(targetPlanet) { scene.remove(targetPlanet); targetPlanet.traverse(function(o){ if(o.geometry)o.geometry.dispose(); if(o.material)o.material.dispose(); }); }
      if(surfaceSite) { scene.remove(surfaceSite); surfaceSite.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();}); }
      targetPlanet = null; atmosphere = null; surfaceSite = null;
    }
    function buildPreviewPlanet(m) {
      disposePlanet();
      targetPlanet=createPlanetGroup(m,m.size);
      targetPlanet.position.set(17,-2,-18);scene.add(targetPlanet);
      rocket.position.set(-7,1,4);rocket.rotation.set(-.08,.48,-.14);rocket.scale.setScalar(.72);
      flame.visible=false;engineGlow.visible=false;menuOrbit=0;
    }

    function startGame(forced) {forced=forced===true;
      var home=missions[currentPlanet],base=bases[home.planet];
      if(!forced&&mode==='campaign'&&base.stage<buildSteps.length){openSurfaceOps();document.getElementById('scan-readout').textContent='Completa el diseño de la plataforma de '+home.planet+' (4 losas, torre y depósito) antes de despegar.';return;}
      var failLaunch=false;
      if(mode==='campaign'&&!forced){if(base.fuel<40){openSurfaceOps();document.getElementById('scan-readout').textContent='Faltan '+Math.ceil(40-base.fuel)+' de combustible: recoge volátiles y refínalos.';return;}failLaunch=Math.random()>Math.min(.97,.78+.06*dCount(base,'rod'));}
      document.getElementById('menu').classList.add('hidden');
      document.getElementById('game-ui').classList.remove('hidden');
      document.getElementById('hud-mission').textContent=missions[selected].name;
      document.getElementById('hud-destination').textContent='Ruta · '+home.planet+' → '+missions[selected].planet;
      resetFlight();if(mode==='campaign')base.fuel=0;
      paused=true;
      var count=document.getElementById('countdown'), num=document.getElementById('count-num'); count.classList.remove('hidden');
      var n=3; num.textContent=n;
      var timer=setInterval(function(){ n--; if(n>0){num.textContent=n;} else if(n===0){num.textContent='GO';} else {clearInterval(timer);count.classList.add('hidden');paused=false;gameActive=true;clock.last=performance.now();if(failLaunch)finish(false,'Fallo en plataforma','Una descarga dañó el sistema de ignición. Añade pararrayos al diseño y reconstruye el combustible.');}},700);
    }

    function resetFlight() {
      phase='launch'; phaseProgress=0; altitude=0; speed=0; fuel=(window.forcedFuel!=null)?window.forcedFuel:(mode==='free')?100:Math.max(10,Math.min(100,bases[missions[currentPlanet].planet].fuel)); tilt=0; thrust=55; lateral=0; elapsed=0; score=0; gameActive=false;
      buildFlightScene('launch'); updateHUD();
    }

    function buildFlightScene(which) {
      var worldIndex=which==='launch'?currentPlanet:selected,m=missions[worldIndex];disposePlanet();
      var radius=which==='travel'?m.size:42;
      targetPlanet=createPlanetGroup(m,radius);scene.add(targetPlanet);
      var groundOffset=4.55;rocket.userData.groundOffset=groundOffset;
      rocket.scale.setScalar(which==='travel'?.36:.46);rocket.rotation.set(0,0,0);rocket.position.set(0,which==='landing'?18+groundOffset:groundOffset,0);flame.visible=true;engineGlow.visible=true;
      if(which==='launch'){targetPlanet.position.set(0,-43,0);surfaceSite=createSurfaceArea(m,bases[m.planet].stage);surfaceSite.position.y=-.75;scene.add(surfaceSite);camera.position.set(18,10,31);}
      if(which==='travel'){targetPlanet.position.set(0,2,-105);camera.position.set(14,7,25);}
      if(which==='landing'){targetPlanet.position.set(0,-43,0);surfaceSite=createSurfaceArea(m,bases[m.planet].stage);surfaceSite.position.y=-.75;scene.add(surfaceSite);camera.position.set(17,11,31);}
      camera.lookAt(rocket.position);
    }

    function transition(next) {
      phase=next; phaseProgress=0; speed=0; lateral=0; tilt=0;
      if(next==='travel'){altitude=200;thrust=Math.max(thrust,45);buildFlightScene('travel');}
      if(next==='landing'){altitude=18;speed=-2;thrust=35;buildFlightScene('landing');}
      updateHUD();
    }

    function updateFlight(dt) {
      if(!gameActive || paused) return;
      elapsed += dt;
      var m=missions[selected];
      if(input.up) thrust=Math.min(100,thrust+38*dt);
      if(input.down) thrust=Math.max(0,thrust-42*dt);
      if(input.left) lateral-=1.25*dt;
      if(input.right) lateral+=1.25*dt;
      if(input.space) {lateral*=Math.pow(.1,dt);tilt*=Math.pow(.08,dt);}
      lateral*=Math.pow(.58,dt); lateral=Math.max(-1.25,Math.min(1.25,lateral));
      tilt += (lateral*17-tilt)*Math.min(1,dt*3.4);
      rocket.rotation.z=-tilt*Math.PI/180;
      fuel=Math.max(0,fuel-thrust*.0068*dt*(mode==='free'?.72:1));
      flame.scale.y=.25+thrust/100*1.15; flame.scale.x=.72+Math.random()*.28; flame.scale.z=flame.scale.x; flame.visible=thrust>2;
      engineGlow.intensity=.25+thrust/100*3;engineGlow.visible=thrust>2;
      if(fuel<=0) thrust=0;

      if(phase==='launch') {
        var acc=thrust/100*22-8.6-Math.abs(tilt)*.06;
        speed=Math.max(-8,speed+acc*dt); altitude=Math.max(0,altitude+speed*dt*.055); phaseProgress=Math.min(1,altitude/18);
        rocket.position.y=rocket.userData.groundOffset+altitude*.85; rocket.position.x+=lateral*dt*2;
        camera.position.y+=(rocket.position.y+8-camera.position.y)*Math.min(1,dt*2); camera.lookAt(rocket.position.x,rocket.position.y+1,0);
        if(Math.abs(rocket.position.x)>8 || (speed<-5&&altitude<.2&&elapsed>3)) return finish(false,'Salida del corredor','La nave perdió el corredor de ascenso antes de alcanzar la transferencia.');
        if(phaseProgress>=1) transition('travel');
      } else if(phase==='travel') {
        var cruise=Math.max(0,(thrust-18)/82); phaseProgress=Math.min(1,phaseProgress+cruise*dt*.055);
        speed=1200+cruise*8300; altitude=200+phaseProgress*80000;
        rocket.position.x+=(lateral*dt*2.2); rocket.position.y+=Math.sin(elapsed*.55)*dt*.1;
        targetPlanet.position.z=-105+phaseProgress*82; targetPlanet.scale.setScalar(1+phaseProgress*.42);
        camera.position.x+=(rocket.position.x+14-camera.position.x)*Math.min(1,dt*2);camera.lookAt(rocket.position.x,rocket.position.y,rocket.position.z-7);
        if(Math.abs(rocket.position.x)>10) {fuel=Math.max(0,fuel-8*dt);}
        if(phaseProgress>=1) transition('landing');
      } else if(phase==='landing') {
        var g=[9.8,1.62,3.71,8.87,24.8,35][selected];
        var downAcc=g*.17-thrust/100*8.5;
        speed-=downAcc*dt; altitude=Math.max(0,altitude+speed*dt*.16); phaseProgress=1-Math.min(1,altitude/18);
        rocket.position.y=rocket.userData.groundOffset+altitude; rocket.position.x+=lateral*dt*1.3;
        camera.position.y+=(rocket.position.y+9-camera.position.y)*Math.min(1,dt*1.8);camera.lookAt(rocket.position.x,rocket.position.y,0);
        if(altitude<=0){ var limit=(selected>=4?7:5.5); var ok=Math.abs(speed)<=limit && Math.abs(tilt)<=12 && Math.abs(rocket.position.x)<=6; finish(ok, ok ? (selected>=4?'Órbita capturada':'Toma nominal') : 'Impacto fuera de límites', ok ? 'La maniobra final quedó dentro de todos los parámetros de la misión.' : 'Reduce antes la velocidad vertical y mantén la inclinación por debajo de 12°.'); }
      }
      updateHUD();
    }

    function updateHUD() {
      var phaseInfo = phase==='launch'?['Fase 1 · Ascenso','01/03','Aumenta potencia y mantén la nave dentro del corredor de ascenso.']:phase==='travel'?['Fase 2 · Travesía','02/03','Mantén rumbo central. Las desviaciones consumen combustible de corrección.']:['Fase 3 · Maniobra final','03/03', selected>=4?'Reduce velocidad y captura una órbita estable sobre la capa visible.':'Desciende por debajo de 5 m/s y nivela la nave antes del contacto.'];
      document.getElementById('phase-name').textContent=phaseInfo[0]; document.getElementById('phase-index').textContent=phaseInfo[1]; document.getElementById('objective').textContent=phaseInfo[2];
      document.getElementById('phase-progress').style.width=Math.round(phaseProgress*100)+'%';
      document.getElementById('t-alt').textContent=phase==='travel'?Math.round(altitude).toLocaleString('es-ES')+' km':altitude.toFixed(1)+' km';
      document.getElementById('t-speed').textContent=Math.round(Math.abs(speed)).toLocaleString('es-ES')+' m/s';
      document.getElementById('t-fuel').textContent=Math.round(fuel)+' %'; document.getElementById('t-tilt').textContent=Math.abs(tilt).toFixed(1)+'°'; document.getElementById('t-thrust').textContent=Math.round(thrust)+' %';
    }

    function finish(success,title,text) {
      if(!gameActive)return; gameActive=false; paused=true;window.simResult={ok:success,fuel:fuel};
      if(success){var fromB=bases[missions[currentPlanet].planet],toB=bases[missions[selected].planet];for(var q=0;q<3;q++){toB.inventory[q]+=fromB.inventory[q];fromB.inventory[q]=0;}toB.fuel=Math.min(fuelCap(toB),toB.fuel+Math.round(fuel*.5));text+=' Tu carga y parte del combustible viajan contigo.';currentPlanet=selected;updateBaseStatus();text+=' Ya puedes explorar '+missions[currentPlanet].planet+' y construir aquí el próximo complejo de lanzamiento.';}
      score=Math.max(0,Math.round(6200+fuel*42-Math.abs(tilt)*35-elapsed*4+(success?1600:0)));
      document.getElementById('result-label').textContent=success?'Misión completada':'Misión no completada';
      document.getElementById('result-title').textContent=title+'.'; document.getElementById('result-text').textContent=text;
      document.getElementById('r-score').textContent=score.toLocaleString('es-ES'); document.getElementById('r-fuel').textContent=Math.round(fuel)+'%'; document.getElementById('r-precision').textContent=Math.max(0,Math.round(100-Math.abs(tilt)*2-Math.abs(rocket.position.x)*3))+'%';
      document.getElementById('next-mission').textContent=success?'Siguiente nivel':'Reintentar';
      document.getElementById('back-menu').textContent=success?'Explorar superficie':'Centro de vuelo';document.getElementById('back-menu').dataset.explore=success?'1':'0';
      document.getElementById('next-mission').dataset.success=success?'1':'0'; document.getElementById('result-dialog').classList.remove('hidden');
    }

    function backToMenu(){backToMenu0();document.getElementById('menu').classList.add('hidden');if(window.onSimEnd)window.onSimEnd();}
    function backToMenu0() {
      gameActive=false;paused=false;phase='menu';document.getElementById('game-ui').classList.add('hidden');document.getElementById('pause-dialog').classList.add('hidden');document.getElementById('result-dialog').classList.add('hidden');document.getElementById('menu').classList.remove('hidden');buildPreviewPlanet(missions[selected]);camera.position.set(25,11,42);camera.lookAt(0,0,0);
    }

    function animate(now) {
      requestAnimationFrame(animate);
      var t=now||performance.now(),dt=Math.min(.04,(t-clock.last)/1000);clock.last=t;
      // El explorador planetario usa su propio renderizador. No dibujar cada frame
      // esta escena cuando el menú de vuelo está oculto ahorra CPU/GPU en el sandbox.
      var menuEl=document.getElementById('menu');
      if(phase==='menu'&&menuEl&&menuEl.classList.contains('hidden'))return;
      if(phase==='menu') {
        menuOrbit += dt*.18; targetPlanet.rotation.y+=dt*.07; atmosphere.rotation.y-=dt*.035;
        var menuClouds=targetPlanet.getObjectByName('clouds');if(menuClouds)menuClouds.rotation.y+=dt*.018;
        rocket.position.x=-4+Math.cos(menuOrbit)*7; rocket.position.z=3+Math.sin(menuOrbit)*5; rocket.position.y=2+Math.sin(menuOrbit*.7)*1.5; rocket.rotation.z=-.22+Math.sin(menuOrbit)*.08;
        starfield.rotation.y+=dt*.003;
      } else { updateFlight(dt); starfield.rotation.y+=dt*.001; if(targetPlanet){targetPlanet.rotation.y+=dt*.025;var flightClouds=targetPlanet.getObjectByName('clouds');if(flightClouds)flightClouds.rotation.y+=dt*.012;} }
      renderer.render(scene,camera);
    }

    function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));}
    function keyName(e){ if(e.code==='ArrowUp'||e.code==='KeyW')return'up';if(e.code==='ArrowDown'||e.code==='KeyS')return'down';if(e.code==='ArrowLeft'||e.code==='KeyA')return'left';if(e.code==='ArrowRight'||e.code==='KeyD')return'right';if(e.code==='Space')return'space';return null; }
    window.addEventListener('keydown',function(e){var k=keyName(e);if(k){input[k]=true;e.preventDefault();}if(e.code==='Escape'&&gameActive)togglePause();});
    window.addEventListener('keyup',function(e){var k=keyName(e);if(k){input[k]=false;e.preventDefault();}});
    Array.prototype.forEach.call(document.querySelectorAll('.touch-btn'),function(btn){var k=btn.dataset.key; function down(e){e.preventDefault();input[k]=true;btn.classList.add('active');}function up(e){e.preventDefault();input[k]=false;btn.classList.remove('active');}btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);});

    function togglePause(){if(!gameActive)return;paused=!paused;document.getElementById('pause-dialog').classList.toggle('hidden',!paused);}
    document.getElementById('launch').addEventListener('click',startGame);
    document.getElementById('pause').addEventListener('click',togglePause);
    document.getElementById('resume').addEventListener('click',togglePause);
    document.getElementById('abort').addEventListener('click',backToMenu);
    document.getElementById('back-menu').addEventListener('click',function(){var explore=this.dataset.explore==='1';backToMenu();if(explore)openSurfaceOps();});
    document.getElementById('next-mission').addEventListener('click',function(){document.getElementById('result-dialog').classList.add('hidden');backToMenu();});

    selectMission(0);
    init3D();
  }());
