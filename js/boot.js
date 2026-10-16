/* Bootstrap: initializes the WebAssembly world core before creating the 3D world. */
(function () {
  'use strict';

  function hashFallback(x, z, seed) {
    var h = (Math.imul(x | 0, 0x8da6b343) ^ Math.imul(z | 0, 0xd8163841) ^ Math.imul(seed | 0, 0xcb1ab31f)) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return (h & 0x00ffffff) / 16777216 - 0.5;
  }

  function noiseFallback(x, z, scale, seed) {
    scale = Math.max(0.000001, scale);
    var fx = x / scale, fz = z / scale;
    var ix = Math.floor(fx), iz = Math.floor(fz);
    var tx = fx - ix, tz = fz - iz;
    tx = tx * tx * (3 - 2 * tx); tz = tz * tz * (3 - 2 * tz);
    var a = hashFallback(ix, iz, seed), b = hashFallback(ix + 1, iz, seed);
    var c = hashFallback(ix, iz + 1, seed), d = hashFallback(ix + 1, iz + 1, seed);
    var ab = a + (b - a) * tx, cd = c + (d - c) * tx;
    return ab + (cd - ab) * tz;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      // Cache-bust script URLs so a previous build cannot keep stale controls alive.
      script.src = src + (src.indexOf('?') === -1 ? '?' : '&') + 'v=20261015-mobile-e-v2';
      script.async = false;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
      document.body.appendChild(script);
    });
  }

  async function initCore() {
    var fallback = { wasm: false, version: 3, hash: hashFallback, noise: noiseFallback };
    if (!window.WebAssembly || location.protocol === 'file:') {
      window.CosmoCore = fallback;
      return;
    }
    try {
      var response = await fetch('wasm/world_core.wasm', { cache: 'no-cache' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var bytes = await response.arrayBuffer();
      var result = await WebAssembly.instantiate(bytes, {});
      var e = result.instance.exports;
      if (typeof e.cosmo_noise !== 'function' || typeof e.cosmo_hash !== 'function') throw new Error('Exports WASM incompletos');
      window.CosmoCore = {
        wasm: true,
        version: e.cosmo_core_version ? e.cosmo_core_version() : 3,
        hash: function (x, z, seed) { return e.cosmo_hash(x | 0, z | 0, seed | 0); },
        noise: function (x, z, scale, seed) { return e.cosmo_noise(+x, +z, +scale, seed | 0); }
      };
    } catch (err) {
      window.CosmoCore = fallback;
      console.warn('[Cosmódromo] WebAssembly no disponible; usando núcleo JS compatible.', err);
    }
  }

  initCore().then(function () {
    document.documentElement.dataset.worldEngine = window.CosmoCore.wasm ? 'wasm' : 'js';
    return loadScript('js/simulador.js');
  }).then(function () {
    return loadScript('js/cosmodromo.js');
  }).catch(function (err) {
    console.error(err);
    var box = document.getElementById('unsupported');
    if (box) {
      box.classList.remove('hidden');
      var p = box.querySelector('p');
      if (p) p.textContent = 'No se pudieron cargar los módulos del juego. Comprueba que el ZIP se haya extraído completo y vuelve a abrir la página desde Jugar.bat.';
    }
  });
})();
