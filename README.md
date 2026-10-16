# Cosmódromo · Expedición planetaria

Sandbox 3D de exploración planetaria con estética tecnológica propia de Cosmódromo. La partida combina supervivencia ligera, minería, construcción modular, inventario, terreno voxel procedural y lanzamientos interplanetarios.

## Qué incorpora esta versión

- **PC y móvil**: primera persona con ratón y teclado en PC; en teléfonos añade pad táctil de movimiento, botones grandes para picar/poner/saltar/correr y acceso directo al inventario. El iniciador automatiza Node.js, dependencias y la regla del Firewall de red privada. El render baja resolución de píxel y sombras en pantallas táctiles para mejorar rendimiento.
- **Mundo abierto por chunks**: el terreno se crea alrededor del jugador y continúa al explorar; cada planeta tiene su propia paleta y distribución de recursos.
- **Minería y construcción apuntadas**: clic izquierdo para extraer o excavar; clic derecho para colocar módulos. La barra inferior conserva los componentes industriales de Cosmódromo.
- **Inventario estilo sandbox voxel**: mochila base de 27 ranuras, barra rápida de 9 espacios, nueve ranuras extra permanentes por cada almacén que construyas (hasta 180 ranuras) y pilas de hasta 64 objetos, selección de pila con clic, división con clic derecho, colocación de una unidad, transferencia rápida con Mayús+clic y almacenamiento en cofres. Incluye panel de equipo espacial y presentación de ensamblaje con la identidad visual de Cosmódromo. Cada almacén construye una mejora de mochila: desbloquea nueve ranuras extra que se conservan al viajar entre planetas.
- **Progresión**: depósitos regenerables, módulos de base, combustible, cohete, objetivos y viajes entre Tierra, Luna, Marte y Venus.
- **Guardado local** de recursos, cambios del terreno, edificios, planeta y posición mediante `localStorage`.
- **Núcleo WebAssembly real** compilado desde `wasm/world_core.c`. Ejecuta el ruido/hash determinista usado en la generación procedural del terreno; el fallback JavaScript produce los mismos resultados. El renderizado sigue usando WebGL/Three.js, y las reglas del juego permanecen en JavaScript para facilitar su mantenimiento.
- **Fallback automático**: si WebAssembly no se puede cargar —por ejemplo al abrir el HTML directamente con `file://`— el juego utiliza la implementación JavaScript equivalente.
- **Launcher de escritorio** mediante Electron, más servidor local opcional para la presencia básica de otros jugadores.

## Inicio automático en Windows (un clic)

**No tienes que instalar Node.js ni configurar npm a mano.** Extrae el ZIP completo en una carpeta normal donde puedas escribir y haz doble clic en `INICIAR_COSMODROMO.bat` (también puedes usar `Jugar.bat`). No ejecutes el juego directamente desde la ventana interna de un archivo ZIP.

En la primera ejecución el iniciador:

1. Reutiliza un Node.js compatible que ya tengas o descarga la versión LTS compatible desde el sitio oficial de Node.js (los paquetes Windows se seleccionan con los identificadores oficiales `win-x64-zip` o `win-arm64-zip`).
2. Si lo descarga, verifica la suma SHA-256 publicada por Node.js antes de extraerlo en `runtime\node`. No modifica el PATH global de Windows ni necesita instalar Node.js en todo el sistema.
3. Configura `npm` y descarga las dependencias del servidor automáticamente.
4. Solicita permiso de Windows una sola vez para crear una regla de Firewall limitada a **redes privadas**, la subred local y los puertos TCP `3000–3099`. Esta regla permite que tu móvil alcance el juego por Wi-Fi; no abre el juego a redes públicas.
5. Arranca el servidor y abre el juego en el navegador del PC. La ventana `Servidor Cosmodromo` muestra las direcciones para entrar desde móviles.

Se necesita Internet en el primer arranque para descargar componentes que falten. Si cancelas el permiso del Firewall, el juego en el PC puede seguir funcionando, pero la conexión desde el móvil quizá no funcione hasta autorizar el acceso a la red privada. Windows debe tener la red doméstica de confianza configurada como **Privada**; el iniciador no cambia por su cuenta el tipo de red.

El servidor intenta usar el puerto 3000 y, si está ocupado, busca un puerto libre entre 3000 y 3099. El código HTTP solo expone la página y los recursos necesarios del juego; los scripts de instalación y los archivos de configuración no se sirven a los demás dispositivos.

También puedes abrir `index.html` directamente en Chrome, Edge o Firefox, pero para WASM fiable, presencia de otros jugadores y acceso desde el teléfono se recomienda `INICIAR_COSMODROMO.bat`.

### Probar desde el móvil

1. En el PC ejecuta `INICIAR_COSMODROMO.bat` y acepta el aviso de Windows para configurar el Firewall de red privada.
2. Espera a que se abra el navegador en el PC y deja abierta la ventana `Servidor Cosmodromo`.
3. Conecta el teléfono a la **misma Wi-Fi** del PC. En la ventana del servidor, copia una URL parecida a `http://192.168.1.25:3000`; usa exactamente la IP y el puerto que muestre tu equipo.
4. Abre esa dirección en Chrome/Android o Safari/Chrome/iPhone. No uses `localhost` en el teléfono.
5. Mantén el PC y el servidor encendidos mientras juegas. Si no conecta, comprueba que la Wi-Fi de confianza esté clasificada como Privada y que no haya aislamiento de clientes en el router.

## Launcher / ejecutable Windows

Para generar el ejecutable portable no necesitas instalar Node.js manualmente: ejecuta `Construir_EXE.bat`. El script prepara o reutiliza Node.js y npm de forma automática, instala las dependencias y compila el paquete.

También puedes hacerlo desde una terminal con Node.js disponible:

```bash
npm install
npm start
```

Para compilar el ejecutable portable manualmente:

```bash
npm install
npm run dist
```

El resultado se genera en `dist/`. El paquete incluye `wasm/world_core.wasm`, los recursos gráficos y los scripts. No necesita descargar Three.js desde internet. El launcher se conecta al puerto asignado a su propio servidor para evitar abrir por error una instancia anterior.

## Controles

| Acción | Control |
|---|---|
| Moverse | `W A S D` |
| Mirar | Ratón después de hacer clic en el mundo |
| Minar / excavar | Clic izquierdo; en móvil, botón ⛏ PICAR o tocar el objetivo |
| Construir / colocar bloque o módulo seleccionado | Clic derecho; en móvil, botón ＋ PONER |
| Saltar | `Espacio` |
| Correr | `Mayús` |
| Abrir/cerrar inventario | `E` (también `I`) o botón 🎒 Inventario; en móvil, botón 🎒 |
| Tomar / colocar una pila | Clic izquierdo dentro del inventario |
| Tomar mitad / colocar 1 unidad | Clic derecho dentro del inventario |
| Transferencia rápida entre mochila, barra rápida y cofre | `Mayús` + clic |
| Seleccionar ranura de barra rápida al abrir inventario | `1`–`9` |
| Cambiar primera persona / seguimiento | `V` |
| Elegir herramientas | `1`–`0` o barra inferior |
| Liberar ratón | `Esc` |
| Guía | `H`; en móvil aparece al iniciar la primera vez |

En vista de seguimiento se mantienen los controles de exploración y colocación anteriores y la rueda del ratón cambia el zoom. En primera persona, la rueda cambia el elemento seleccionado de la barra. El ratón a la derecha gira la vista a la derecha; el ratón a la izquierda la gira a la izquierda. En teléfonos, arrastra sobre el terreno para mirar, usa el pad de la izquierda para moverte, ⛏ para picar, ＋ para poner un bloque, y 🎒 para abrir/cerrar el inventario. El control ＋ equivale al clic derecho: coloca un bloque de terreno o el módulo seleccionado en Herramientas.

## Arquitectura

- `index.html`: interfaz base y carga del juego.
- `js/boot.js`: carga el núcleo WebAssembly antes de iniciar las escenas y activa el fallback si es necesario.
- `wasm/world_core.c`: núcleo nativo de ruido/hash determinista para el terreno.
- `wasm/world_core.wasm`: módulo WebAssembly compilado que se ejecuta dentro del navegador.
- `js/cosmodromo.js`: exploración, movimiento, minería, construcción, inventario, guardado y presencia multijugador.
- `js/simulador.js`: escenas de campaña y pilotaje del cohete.
- `lib/three.min.js`: biblioteca 3D local.
- `server.js`: servidor estático local y WebSocket de presencia.
- `main.js`: launcher Electron.

El panel de ensamblaje muestra la cuadrícula 2×2 como parte de la distribución tipo Minecraft; la fabricación de plataformas, refinerías, torres y cohetes sigue usando la barra de herramientas de Cosmódromo. Las ranuras de protección son visuales por ahora; no aplican estadísticas de armadura.

## Límites conocidos

La sincronización incluida en el servidor conserva la **presencia y posición** de los jugadores; la minería, las construcciones y el inventario aún se guardan por jugador/navegador y no se replican como un mundo compartido completo. Esta versión tampoco pretende incluir todas las características de Minecraft (redstone, criaturas, recetas infinitas o servidores persistentes). Es una ampliación jugable de la base de Cosmódromo, no una copia de su identidad visual ni de sus recursos.
