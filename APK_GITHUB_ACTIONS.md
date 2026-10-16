# Generar el APK de Cosmódromo con GitHub Actions

Este proyecto genera un APK Android de prueba automáticamente en GitHub Actions usando Capacitor. No necesitas instalar Android Studio, Java, Node.js ni Android SDK en tu PC para compilarlo. El workflow usa Java 17 y `actions/setup-java@v5`; no intenta activar la caché de Gradle antes de que exista el proyecto Android.

## Publicar el proyecto en GitHub

1. Crea un repositorio en GitHub, por ejemplo `cosmodromo-android`.
2. Sube **todo el contenido** de esta carpeta al repositorio, incluida la carpeta oculta `.github/workflows/`.
3. Si ya habías subido una versión anterior, reemplaza el archivo `.github/workflows/android-apk.yml` por el de esta versión corregida y haz commit/push. En GitHub abre la pestaña **Actions**. Si aparece una confirmación para permitir workflows, acéptala.
4. Selecciona **Construir APK de Cosmódromo** y pulsa **Run workflow**. También se inicia automáticamente al hacer `push` a la rama `main` o `master`.
5. Abre la ejecución más reciente y espera a que todos los pasos estén verdes.
6. Al final de esa página, en **Artifacts**, descarga `Cosmodromo-Android-APK` y extrae el ZIP. Dentro estará `app-debug.apk`.
7. Transfiere el APK al teléfono Android e instálalo. Android puede pedir que autorices temporalmente la instalación desde el navegador o gestor de archivos usado para abrirlo.

## Qué produce

- APK `debug` instalable para pruebas.
- La aplicación usa los archivos web locales incluidos en `index.html`, `css/`, `js/`, `wasm/` y `lib/`; no necesita el servidor Node.js del PC para abrir el juego.
- ID Android: `com.cosmodromo.game`.

## Importante

- El APK `debug` no está firmado como publicación de Google Play. Para publicar en Play Store se debe configurar firma de release mediante secretos de GitHub y revisar los requisitos de la tienda.
- GitHub Actions necesita permisos para ejecutar workflows y descargar dependencias desde Internet.
- La compilación automatizada no sustituye las pruebas en dispositivos reales. Comprueba el inicio, los controles táctiles, el inventario y el rendimiento en tu móvil.
