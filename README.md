# Save Room

Interfaz estática para explorar y abrir la colección de juegos del repositorio en EmulatorJS.

## Desarrollo y despliegue

Abre `index.html` con un servidor estático local o despliega la raíz del proyecto en Vercel o GitHub Pages. No hay paso de build. El emulador se carga desde el CDN de EmulatorJS y necesita conexión a internet.

El catálogo está definido en `app.js`; al añadir o cambiar un archivo, actualiza allí su nombre exacto y su sistema. Los archivos deben estar disponibles bajo la misma ruta del sitio.

## Partidas

La librería permite importar una partida `.sav` antes de iniciar. Cuando el juego ya está activo, los botones de la barra permiten exportar el guardado o importar otro; se habilitan al terminar el arranque. EmulatorJS también conserva sus datos en el navegador. Usa un archivo compatible con el juego y el núcleo; algunos `.dsv` requieren conversión a `.sav` antes de importarlos.

La primera carga puede tardar varios minutos: los cartuchos de Nintendo DS de esta colección ocupan entre 128 y 512 MB y deben descargarse antes de iniciar. La barra muestra el porcentaje real cuando EmulatorJS lo proporciona y, si no, permanece animada; también se muestra el tiempo transcurrido. EmulatorJS conserva los archivos descargados en la caché del navegador cuando es compatible. Se utiliza una ruta versionada de EmulatorJS para mantener alineados el cargador y los núcleos WebAssembly. Se prefiere WebGL 2 cuando está disponible, incluso si había una preferencia anterior guardada para desactivarlo; si el núcleo falla con un error de WebAssembly, se reintenta una vez con el núcleo compatible. Si tampoco puede iniciar, se muestra el detalle técnico del error. El botón de cerrar cierra la ventana aunque falle el guardado automático; si aparece un aviso, exporta la partida antes de salir.

## Archivos y permisos

Los juegos de este repositorio están gestionados con Git LFS y superan en conjunto el límite habitual de tamaño de un despliegue de GitHub Pages; el archivo más grande también excede límites de archivo estático habituales en proveedores como Vercel. La interfaz puede desplegarse por separado, pero los ROM deben servirse desde un almacenamiento compatible o seleccionarse localmente, y los enlaces del catálogo deben apuntar a esa ubicación.

Publicar un ROM lo hace accesible a los visitantes del sitio. Despliega únicamente juegos para los que tengas derecho de distribución y configura el acceso al almacenamiento en consecuencia.