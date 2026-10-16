// Servidor MMO: sirve el juego y sincroniza jugadores; si 3000 está ocupado, busca un puerto libre entre 3000 y 3099 (rango admitido por el Firewall privado).
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),{WebSocketServer}=require('ws');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm'};
const srv=http.createServer((q,r)=>{let u;try{u=decodeURIComponent(q.url.split('?')[0])}catch(e){r.writeHead(400);return r.end('Solicitud invalida')}
 if(u==='/')u='/index.html';
 const requested=u.replace(/^\/+/,''),root=path.resolve(__dirname),f=path.resolve(root,requested),rel=path.relative(root,f).split(path.sep).join('/');
 if((f!==path.join(root,'index.html')&&!f.startsWith(root+path.sep))||!(rel==='index.html'||/^(css|js|lib|wasm)\//.test(rel))){r.writeHead(403,{'Cache-Control':'no-store'});return r.end('Acceso denegado')}
 fs.readFile(f,(e,d)=>{if(e){r.writeHead(404,{'Cache-Control':'no-store'});return r.end('No encontrado')}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store, no-cache, must-revalidate, max-age=0','Pragma':'no-cache','Expires':'0'});r.end(d)})});
const wss=new WebSocketServer({server:srv}),P=new Map();let n=0;
const num=v=>Number.isFinite(v)?Math.max(-1000,Math.min(1000,v)):0;
wss.on('connection',ws=>{const id=++n;ws.id=id;P.set(id,{id,n:'Piloto',pl:'tierra',x:32,y:20,t:Date.now()});
 ws.on('message',b=>{if(b.length>400)return;let m;try{m=JSON.parse(b)}catch(e){return}if(m.t!=='p')return;
  P.set(id,{id,n:String(m.n||'Piloto').slice(0,16),pl:['tierra','luna','marte','venus'].includes(m.pl)?m.pl:'tierra',x:num(m.x),y:num(m.y),t:Date.now()})});
 ws.on('close',()=>P.delete(id))});
setInterval(()=>{const now=Date.now(),list=[];for(const[i,p]of P)if(now-p.t>15000)P.delete(i);else list.push(p);
 wss.clients.forEach(c=>{if(c.readyState===1)c.send(JSON.stringify({t:'s',you:c.id,p:list}))})},100);
const preferredPort=Number(process.env.PORT)||3000,scanPorts=!process.env.PORT;
function listenOn(port){
 srv.once('error',e=>{
  if(e.code==='EADDRINUSE'&&scanPorts&&port<preferredPort+99){console.log('Puerto '+port+' ocupado; intentando '+(port+1)+'…');listenOn(port+1);return}
  console.error('No se pudo iniciar Cosmódromo:',e.code||e.message);
 });
 srv.listen(port,'0.0.0.0',()=>{
  const actual=srv.address().port;
  try{fs.writeFileSync(path.join(__dirname,'server-port.txt'),String(actual),'utf8')}catch(e){}
  console.log('Cosmódromo disponible en este PC: http://localhost:'+actual);
  const ips=[];const nets=os.networkInterfaces();Object.keys(nets).forEach(name=>(nets[name]||[]).forEach(net=>{if(net.family==='IPv4'&&!net.internal&&!/^169\.254\./.test(net.address))ips.push(net.address)}));
  if(ips.length){console.log('');console.log('PARA PROBARLO DESDE EL MOVIL (misma Wi-Fi):');ips.forEach(ip=>console.log('  http://'+ip+':'+actual));console.log('Si no conecta, permite Node.js en la red privada del Firewall de Windows.');}
  else console.log('No se detectó una IP LAN; revisa que este PC esté conectado a la misma Wi-Fi que el móvil.');
 });
}
listenOn(preferredPort);
module.exports=srv;
