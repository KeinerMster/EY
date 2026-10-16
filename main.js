const { app, BrowserWindow, Menu } = require('electron');
const fs = require('fs'), path = require('path');
// Si junto al .exe hay un servidor.txt (ej: 192.168.1.20:3000) te conectas al servidor MMO de otra persona.
// Si no, el propio juego arranca su servidor local (otros pueden unirse a tu IP:3000).
function remote() {
  const dirs = [process.env.PORTABLE_EXECUTABLE_DIR, path.dirname(process.execPath), __dirname].filter(Boolean);
  for (const d of dirs) { try { const t = fs.readFileSync(path.join(d, 'servidor.txt'), 'utf8').trim(); if (t) return t; } catch (e) {} }
  return null;
}
function create() {
  const r = remote();
  const w = new BrowserWindow({ width: 1280, height: 800, backgroundColor: '#02070b', autoHideMenuBar: true, title: 'Cosmódromo' });
  w.webContents.on('did-fail-load', () => setTimeout(() => { if (w && !w.isDestroyed() && w.__cosmoUrl) w.loadURL(w.__cosmoUrl); }, 1000));
  w.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F11') w.setFullScreen(!w.isFullScreen()); });
  Menu.setApplicationMenu(null);
  if (r) {
    w.__cosmoUrl = /^https?:\/\//.test(r) ? r : 'http://' + r;
    w.loadURL(w.__cosmoUrl);
  } else {
    let localServer;
    try { localServer = require('./server.js'); }
    catch (e) { console.error(e); return; }
    const loadLocal = () => { w.__cosmoUrl = 'http://localhost:' + localServer.address().port; w.loadURL(w.__cosmoUrl); };
    if (localServer.listening) loadLocal(); else localServer.once('listening', loadLocal);
  }
}
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
