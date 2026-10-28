# Save Room

Interfaz estática para elegir un sistema y abrir cartuchos locales en EmulatorJS.

## Desarrollo y despliegue

Abre `index.html` con un servidor estático local o despliega la raíz del proyecto en Vercel o GitHub Pages. No hay paso de build. El emulador se carga desde el CDN de EmulatorJS y necesita conexión a internet.

La página ofrece dos sistemas porque GBA y Nintendo DS necesitan núcleos diferentes: mGBA para `.gba` y melonDS para `.nds`. Al elegir un sistema, el selector muestra los archivos `.gba` o `.nds` del catálogo del repositorio y permite cargarlos desde el mismo sitio. También puedes elegir un archivo desde tu dispositivo.

## Partidas

Después de seleccionar el cartucho puedes iniciar una partida nueva o elegir «Cargar partida» y seleccionar un archivo de guardado compatible (`.sav`, `.srm`, `.dsv`, entre otros). Una vez iniciada la sesión, solo se ofrece «Guardar partida» para exportar el estado actual. EmulatorJS también conserva sus datos en el navegador. Usa un archivo compatible con el juego y el núcleo; algunos `.dsv` requieren conversión a `.sav` antes de importarlos.

Durante la partida, «Cambiar teclas» abre directamente el panel de controles de EmulatorJS, que muestra las teclas predeterminadas. Para cambiar una asignación, pulsa «Guardar» junto al control y luego la nueva tecla. «Limpiar» borra una asignación y «Reiniciar» restaura los valores predeterminados. El emulador conserva los cambios en el navegador y sus menús se muestran en español.

La primera carga puede tardar varios minutos, sobre todo con ROM de Nintendo DS grandes: el archivo se procesa localmente y EmulatorJS descarga el núcleo desde su CDN. La barra muestra el porcentaje real cuando EmulatorJS lo proporciona y, si no, permanece animada; también se muestra el tiempo transcurrido. EmulatorJS conserva los archivos descargados en la caché del navegador cuando es compatible. Se utiliza una ruta versionada de EmulatorJS para mantener alineados el cargador y los núcleos WebAssembly. Se prefiere WebGL 2 cuando está disponible, incluso si había una preferencia anterior guardada para desactivarlo. Para partidas sin trucos activos se omite la llamada de reinicio de trucos de mGBA, que puede abortar durante el inicio; si el núcleo falla con otro error de WebAssembly, se reintenta una vez con el núcleo compatible. Si tampoco puede iniciar, se muestra el detalle técnico del error. El botón de cerrar cierra la ventana aunque falle el guardado automático; si aparece un aviso, exporta la partida antes de salir.

GitHub Pages sirve los archivos Git LFS como pequeños punteros de texto, no como ROM. La carga desde el sitio solo funciona cuando el servidor entrega el binario real; si recibe un puntero LFS, la app lo detecta y muestra un error. En local, sirve la raíz del repositorio con un servidor HTTP y asegúrate de tener los archivos LFS descargados.

El selector local rechaza también los archivos puntero de Git LFS descargados por error. El área de juego tiene una altura limitada por la ventana para evitar que el canvas de EmulatorJS expanda indefinidamente la página.

## Archivos y permisos

Los juegos de este repositorio están gestionados con Git LFS y superan en conjunto el límite habitual de tamaño de un despliegue de GitHub Pages; el archivo más grande también excede límites de archivo estático habituales en proveedores como Vercel. La interfaz puede desplegarse por separado, pero los ROM deben servirse desde un almacenamiento compatible o seleccionarse localmente.

Publicar un ROM lo hace accesible a los visitantes del sitio. Despliega únicamente juegos para los que tengas derecho de distribución y configura el acceso al almacenamiento en consecuencia.