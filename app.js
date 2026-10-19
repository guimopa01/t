const games = [
  { title: 'Pokémon Mystery Dungeon: Red Rescue Team', file: '2567 - Pokemon Mystery Dungeon - Red Rescue Team (E)(Rising Sun).gba', system: 'gba', mark: '✳', palette: 'palette-1' },
  { title: 'Pokémon Platino', file: '3787 - Pokemon - Edicion Platino (Spain).nds', system: 'nds', mark: '✦', palette: 'palette-2' },
  { title: 'Pokémon SoulSilver', file: '4833 - Pokemon - Edicion Plata SoulSilver (Spain).nds', system: 'nds', mark: '◌', palette: 'palette-3' },
  { title: 'Pokémon Negra', file: '5597 - Pokemon - Edicion Negra (DSi Enhanced) (S)(WiKiLEAKS).nds', system: 'nds', mark: '✦', palette: 'palette-4' },
  { title: 'Pokémon Rojo Fuego', file: 'Pokemon - Edicion Rojo Fuego (Spain).gba', system: 'gba', mark: '✹', palette: 'palette-5' },
  { title: 'Pokémon Emerald', file: 'Pokemon - Emerald Version (USA, Europe).gba', system: 'gba', mark: '✳', palette: 'palette-6' },
  { title: 'Pokémon Quetzal', file: 'PokemonQuetzalSpanishAlpha8v2.gba', system: 'gba', mark: '✦', palette: 'palette-2' },
  { title: 'Pokémon Blanco 2', file: 'Pokémon Blanco2.nds', system: 'nds', mark: '◉', palette: 'palette-1' },
  { title: 'Pokémon Glazed+', file: 'Pokémon Glazed+.gba', system: 'gba', mark: '✹', palette: 'palette-4' },
  { title: 'Pokémon Negra 2', file: 'z120 - Pokemon - Edicion Negra 2 (Spain) (NDSi Enhanced) [b].nds', system: 'nds', mark: '◌', palette: 'palette-3' },
  { title: 'Light Platinum', file: 'LightPlatinumEspPATCHED.gba', system: 'gba', mark: '✳', palette: 'palette-6' },
];

const grid = document.querySelector('#game-grid');
const dialog = document.querySelector('#player-dialog');
const launchPanel = document.querySelector('#launch-panel');
const playPanel = document.querySelector('#play-panel');
const gameContainer = document.querySelector('#game');
const emulatorLoading = document.querySelector('#emulator-loading');
const loadingStatus = document.querySelector('#loading-status');
const loadingHint = document.querySelector('#loading-hint');
const loadingProgress = document.querySelector('.loading-progress');
const loadingProgressBar = document.querySelector('.loading-progress-bar');
const initialSaveInput = document.querySelector('#initial-save');
const romFileInput = document.querySelector('#rom-file');
const romFileLabel = document.querySelector('#rom-file-label');
const romMessage = document.querySelector('#rom-message');
const runtimeSaveInput = document.querySelector('#runtime-save');
const selectedSave = document.querySelector('#selected-save');
const saveLabel = document.querySelector('.selected-save-name');
let activeFilter = 'all';
let activeGame = null;
let activeRomObjectUrl = null;
let queuedSave = null;
let emulatorScriptLoading = false;
let romCheckInProgress = false;
let launchSequence = 0;
let loadingHintTimeout = null;
let loadingTimeInterval = null;
let emulatorLoadingObserver = null;
let restoreEmulatorConsoleWarning = null;
let startupErrorDetails = '';
let startupErrorSequence = null;
let legacyRetryTimeout = null;
let legacyRetryAttempted = false;
let currentLaunchUsesLegacy = false;
let noticeTimeout = null;

function displayName(filename) {
  return filename.replace(/\.(gba|nds|dsv)$/i, '').replace(/^\d+\s*-\s*/, '');
}

function renderGames() {
  const query = document.querySelector('#search').value.trim().toLocaleLowerCase('es');
  const visibleGames = games.filter((game) => {
    const matchesFilter = activeFilter === 'all' || game.system === activeFilter;
    return matchesFilter && `${game.title} ${game.file}`.toLocaleLowerCase('es').includes(query);
  });

  grid.innerHTML = visibleGames.map((game, index) => `
    <article class="game-card" tabindex="0" role="button" aria-label="Abrir ${game.title}" data-game="${games.indexOf(game)}" style="animation-delay:${Math.min(index * 35, 280)}ms">
      <div class="game-art ${game.system} ${game.palette}">
        <span class="art-code">SR—${String(games.indexOf(game) + 1).padStart(3, '0')}</span>
        <span class="art-sun" aria-hidden="true"></span>
        <span class="art-symbol" aria-hidden="true">${game.mark}</span>
        <span class="art-system">${game.system.toUpperCase()}</span>
      </div>
      <div class="game-meta">
        <div><h3 class="game-title">${game.title}</h3><p class="game-filename">${displayName(game.file)}</p></div>
        <span class="card-arrow" aria-hidden="true">↗</span>
      </div>
    </article>`).join('');

  document.querySelector('#empty-state').hidden = visibleGames.length !== 0;
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-tab').forEach((button) => {
    const selected = button.dataset.filter === filter;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderGames();
}

function openGame(game) {
  activeGame = game;
  queuedSave = null;
  romMessage.hidden = true;
  romMessage.textContent = '';
  romFileInput.value = '';
  romFileInput.accept = game.system === 'gba' ? '.gba' : '.nds';
  romFileLabel.innerHTML = `<span aria-hidden="true">▣</span> Elegir cartucho ${game.system.toUpperCase()}`;
  document.querySelector('#player-title').textContent = game.title;
  document.querySelector('#player-system').textContent = game.system === 'gba' ? 'GAME BOY ADVANCE' : 'NINTENDO DS';
  initialSaveInput.value = '';
  selectedSave.hidden = true;
  launchPanel.hidden = false;
  playPanel.hidden = true;
  legacyRetryAttempted = false;
  setSaveControlsEnabled(false);
  loadingHint.hidden = true;
  document.querySelector('#player-message').textContent = '';
  dialog.showModal();
}

function closeGame() {
  if (!dialog.open) return;
  const manager = window.EJS_emulator?.gameManager;
  launchSequence += 1;
  clearTimeout(loadingHintTimeout);
  clearTimeout(legacyRetryTimeout);
  clearInterval(loadingTimeInterval);
  emulatorLoadingObserver?.disconnect();
  emulatorLoadingObserver = null;
  restoreEmulatorConsoleWarning?.();
  restoreEmulatorConsoleWarning = null;
  startupErrorSequence = null;
  legacyRetryTimeout = null;
  currentLaunchUsesLegacy = false;
  window.removeEventListener('error', captureStartupWindowError);
  window.removeEventListener('unhandledrejection', captureStartupRejection);
  dialog.close();
  if (activeRomObjectUrl) URL.revokeObjectURL(activeRomObjectUrl);
  activeRomObjectUrl = null;
  if (typeof manager?.saveSaveFiles === 'function') {
    try {
      const result = manager.saveSaveFiles();
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch((error) => {
          console.error('No se pudo guardar automáticamente al cerrar el juego.', error);
          showNotice('No se pudo guardar automáticamente. Exporta la partida antes de cerrar para conservarla.');
        });
      }
    } catch (error) {
      console.error('No se pudo guardar automáticamente al cerrar el juego.', error);
      showNotice('No se pudo guardar automáticamente. Exporta la partida antes de cerrar para conservarla.');
    }
  }
  document.querySelector('#game').replaceChildren();
  activeGame = null;
  queuedSave = null;
  window.EJS_emulator = undefined;
}

function showMessage(message) {
  document.querySelector('#player-message').textContent = message;
}

function showNotice(message) {
  const notice = document.querySelector('#app-notice');
  notice.textContent = message;
  notice.hidden = false;
  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => { notice.hidden = true; }, 8000);
}

function setSaveControlsEnabled(enabled) {
  document.querySelector('#export-save').disabled = !enabled;
  runtimeSaveInput.disabled = !enabled;
  document.querySelector('#runtime-save-label').classList.toggle('is-disabled', !enabled);
}

function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
  return hours ? `${String(hours).padStart(2, '0')}:${clock}` : clock;
}

function updateLoadingTime(startedAt) {
  const elapsed = formatElapsedTime(performance.now() - startedAt);
  document.querySelector('#loading-time').textContent = `Tiempo transcurrido: ${elapsed}`;
  if (!loadingProgress.hasAttribute('aria-valuenow')) {
    loadingProgress.setAttribute('aria-valuetext', `Cargando cartucho; tiempo transcurrido ${elapsed}`);
  }
}

function updateEmulatorLoading(thisLaunch) {
  if (launchSequence !== thisLaunch || !dialog.open) return;

  const error = gameContainer.querySelector('.ejs_error_text');
  if (error?.textContent.trim()) {
    clearTimeout(loadingHintTimeout);
    clearInterval(loadingTimeInterval);
    loadingTimeInterval = null;
    emulatorLoading.classList.add('has-error');
    document.querySelector('#session-status').textContent = 'ERROR DE CARGA';
    loadingStatus.textContent = `ERROR: ${error.textContent.trim()}`;
    loadingHint.textContent = startupErrorDetails
      ? `Detalle técnico: ${startupErrorDetails}`
      : 'No se pudo arrancar el núcleo. Revisa la conexión con EmulatorJS e inténtalo otra vez.';
    loadingHint.hidden = false;
    if (currentLaunchUsesLegacy) {
      showMessage('El núcleo compatible también ha fallado. Consulta el detalle técnico del error.');
    }
    retryWithLegacyCore(thisLaunch, error.textContent.trim());
    return;
  }

  const status = gameContainer.querySelector('.ejs_loading_text');
  if (!status?.textContent.trim()) return;
  const emulatorStatus = status.textContent.trim();
  const normalizedStatus = emulatorStatus.toLocaleLowerCase('en');
  const progressMatch = emulatorStatus.match(/(\d{1,3})\s*%/);
  const percent = progressMatch ? Math.min(100, Number(progressMatch[1])) : null;

  if (normalizedStatus.includes('game data')) {
    loadingStatus.textContent = `DESCARGANDO CARTUCHO${percent === null ? '' : ` · ${percent}%`}`;
  } else if (normalizedStatus.includes('game core')) {
    loadingStatus.textContent = `DESCARGANDO EMULADOR${percent === null ? '' : ` · ${percent}%`}`;
  } else if (normalizedStatus.includes('decompress')) {
    loadingStatus.textContent = `PREPARANDO ARCHIVOS${percent === null ? '' : ` · ${percent}%`}`;
  } else {
    loadingStatus.textContent = emulatorStatus;
  }

  if (percent === null) {
    loadingProgress.removeAttribute('aria-valuenow');
    loadingProgressBar.classList.remove('is-determinate');
    loadingProgressBar.style.removeProperty('width');
    return;
  }

  loadingProgress.setAttribute('aria-valuenow', String(percent));
  loadingProgress.setAttribute('aria-valuetext', `${loadingStatus.textContent}; ${percent}%`);
  loadingProgressBar.classList.add('is-determinate');
  loadingProgressBar.style.width = `${percent}%`;
}

function describeStartupError(error) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (error && typeof error === 'object' && 'message' in error) {
    const name = 'name' in error && error.name ? `${error.name}: ` : '';
    return `${name}${error.message}`;
  }
  return String(error || 'EmulatorJS no proporcionó más detalles.');
}

function showStartupErrorDetails(error) {
  if (!dialog.open || startupErrorSequence !== launchSequence || !error) return;
  startupErrorDetails = describeStartupError(error);
  emulatorLoading.classList.add('has-error');
  document.querySelector('#session-status').textContent = 'ERROR DE CARGA';
  loadingStatus.textContent = 'ERROR AL INICIAR EL JUEGO';
  loadingHint.textContent = `Detalle técnico: ${startupErrorDetails}`;
  loadingHint.hidden = false;
  if (currentLaunchUsesLegacy) {
    showMessage('El núcleo compatible también ha fallado. Consulta el detalle técnico del error.');
  }
  retryWithLegacyCore(launchSequence, startupErrorDetails);
}

function retryWithLegacyCore(thisLaunch, details) {
  if (
    legacyRetryAttempted
    || currentLaunchUsesLegacy
    || !/RuntimeError|Aborted|table index|WebAssembly|wasm/i.test(details)
    || launchSequence !== thisLaunch
    || !dialog.open
  ) return;

  legacyRetryAttempted = true;
  loadingStatus.textContent = 'REINTENTANDO EN MODO COMPATIBLE';
  loadingHint.textContent = 'El núcleo gráfico actual falló. Se probará una variante compatible.';
  loadingHint.hidden = false;
  showMessage('Reintentando una vez con el núcleo gráfico compatible.');
  legacyRetryTimeout = setTimeout(() => {
    if (launchSequence !== thisLaunch || !dialog.open) return;
    const pendingSave = queuedSave;
    gameContainer.replaceChildren();
    window.EJS_emulator = undefined;
    launchGame(pendingSave, true, activeRomObjectUrl).catch(reportLaunchFailure);
  }, 1200);
}

function reportLaunchFailure(error) {
  console.error('No se pudo iniciar el cartucho.', error);
  if (!playPanel.hidden) {
    showMessage(`No se pudo iniciar el cartucho: ${describeStartupError(error)}`);
  } else {
    romMessage.textContent = `No se pudo iniciar el cartucho: ${describeStartupError(error)}`;
    romMessage.hidden = false;
  }
}

function bypassEmptyCheatReset() {
  const prototype = window.EJS_GameManager?.prototype;
  if (!prototype || prototype.resetCheat?.emptyCheatSafe) return;

  const resetCheat = prototype.resetCheat;
  const safeResetCheat = function (...args) {
    if (Array.isArray(this.EJS?.cheats) && !this.EJS.cheats.some((cheat) => cheat.checked)) return;
    return resetCheat.apply(this, args);
  };
  safeResetCheat.emptyCheatSafe = true;
  prototype.resetCheat = safeResetCheat;
}

function captureStartupWindowError(event) {
  showStartupErrorDetails(event.error || event.message);
}

function captureStartupRejection(event) {
  showStartupErrorDetails(event.reason);
}

function captureEmulatorStartupError() {
  restoreEmulatorConsoleWarning?.();
  const originalWarn = console.warn;
  const wrappedWarn = (...args) => {
    originalWarn.apply(console, args);
    const cause = args[0] instanceof Error
      ? args[0]
      : args[0] === 'Failed to start game' ? args[1] : null;
    if (!cause) return;

    console.error('Detalle del error al iniciar el cartucho:', cause);
    showStartupErrorDetails(cause);
  };
  console.warn = wrappedWarn;
  restoreEmulatorConsoleWarning = () => {
    if (console.warn === wrappedWarn) console.warn = originalWarn;
  };
}

function saveBytes(save) {
  if (save instanceof Uint8Array) return save;
  if (save instanceof ArrayBuffer) return new Uint8Array(save);
  if (ArrayBuffer.isView(save)) return new Uint8Array(save.buffer, save.byteOffset, save.byteLength);
  if (Array.isArray(save)) return new Uint8Array(save);
  return null;
}

function downloadSave(save) {
  const bytes = saveBytes(save);
  if (!bytes?.byteLength) {
    showMessage('No hay datos de guardado disponibles todavía. Guarda dentro del juego e inténtalo de nuevo.');
    return;
  }
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${activeGame.file.replace(/\.(gba|nds|dsv)$/i, '').replace(/[^\w.-]+/g, '_')}.sav`;
  link.click();
  URL.revokeObjectURL(url);
  showMessage('Partida exportada. Guárdala en un lugar seguro.');
}

async function importSave(file) {
  if (!file) return;
  const manager = window.EJS_emulator?.gameManager;
  if (!manager?.FS || typeof manager.getSaveFilePath !== 'function') {
    queuedSave = file;
    showMessage('Partida lista. Se cargará al iniciar el juego.');
    return;
  }

  try {
    const path = manager.getSaveFilePath();
    if (!path) throw new Error('El núcleo no proporciona una ruta de guardado.');
    manager.FS.writeFile(path, new Uint8Array(await file.arrayBuffer()));
    manager.loadSaveFiles();
    showMessage(`Partida cargada: ${file.name}`);
  } catch (error) {
    showMessage(`No se pudo importar esta partida: ${error.message}`);
  }
}

function forceWebGL2Preference(game) {
  const settingsKey = `ejs-1-${game.system}-${game.title}-settings`;
  let storedSettings;
  try {
    storedSettings = localStorage.getItem(settingsKey);
  } catch (error) {
    console.error('No se pudo leer la preferencia gráfica guardada.', error);
    showNotice('No se pudo actualizar la preferencia WebGL 2 guardada en este navegador.');
    return;
  }
  if (!storedSettings) return;

  let savedConfig;
  try {
    savedConfig = JSON.parse(storedSettings);
  } catch (error) {
    console.warn('La configuración guardada de EmulatorJS no es válida; se usará la preferencia predeterminada.', error);
    return;
  }
  if (!savedConfig?.settings || typeof savedConfig.settings !== 'object' || Array.isArray(savedConfig.settings)) return;
  if (savedConfig.settings.webgl2Enabled === 'enabled') return;

  savedConfig.settings.webgl2Enabled = 'enabled';
  try {
    localStorage.setItem(settingsKey, JSON.stringify(savedConfig));
  } catch (error) {
    console.error('No se pudo guardar la preferencia WebGL 2.', error);
    showNotice('No se pudo guardar la preferencia WebGL 2 en este navegador.');
  }
}

async function isGitLfsPointer(game) {
  const romUrl = new URL(`./${encodeURIComponent(game.file)}`, document.baseURI);
  const response = await fetch(romUrl, { method: 'HEAD', cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`El servidor devolvió HTTP ${response.status} al comprobar el cartucho.`);
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (!Number.isFinite(contentLength) || contentLength > 256) return false;

  const pointerResponse = await fetch(romUrl, { cache: 'no-store' });
  if (!pointerResponse.ok) {
    throw new Error(`El servidor devolvió HTTP ${pointerResponse.status} al leer el cartucho.`);
  }
  const pointer = await pointerResponse.text();
  return pointer.startsWith('version https://git-lfs.github.com/spec/v1');
}

async function launchGame(saveFile = null, forceLegacy = false, romUrl = null) {
  if (!activeGame) return;
  if (romCheckInProgress) return;
  if (emulatorScriptLoading) {
    showNotice('El emulador todavía se está conectando. Espera un momento e inténtalo de nuevo.');
    return;
  }
  if (!romUrl && !forceLegacy) {
    romCheckInProgress = true;
    romMessage.hidden = true;
    try {
      if (await isGitLfsPointer(activeGame)) {
        romMessage.textContent = 'GitHub Pages solo entrega aquí una referencia Git LFS, no el cartucho. Selecciona el archivo .gba o .nds original desde tu dispositivo para jugar.';
        romMessage.hidden = false;
        return;
      }
    } catch (error) {
      console.error('No se pudo comprobar el cartucho publicado.', error);
      romMessage.textContent = `No se pudo comprobar el cartucho publicado: ${error.message} Selecciona el archivo original desde tu dispositivo.`;
      romMessage.hidden = false;
      return;
    } finally {
      romCheckInProgress = false;
    }
  }
  const thisLaunch = ++launchSequence;
  clearTimeout(legacyRetryTimeout);
  legacyRetryTimeout = null;
  currentLaunchUsesLegacy = forceLegacy;
  queuedSave = saveFile;
  launchPanel.hidden = true;
  playPanel.hidden = false;
  emulatorLoading.classList.remove('is-hidden', 'has-error');
  loadingStatus.textContent = 'CARGANDO EMULADOR';
  loadingHint.hidden = true;
  loadingProgress.removeAttribute('aria-valuenow');
  loadingProgress.setAttribute('aria-valuetext', 'Preparando carga');
  loadingProgressBar.classList.remove('is-determinate');
  loadingProgressBar.style.removeProperty('width');
  setSaveControlsEnabled(false);
  document.querySelector('#session-status').textContent = 'INICIANDO SESIÓN';
  emulatorScriptLoading = true;
  clearTimeout(loadingHintTimeout);
  clearInterval(loadingTimeInterval);
  const loadingStartedAt = performance.now();
  updateLoadingTime(loadingStartedAt);
  loadingTimeInterval = setInterval(() => updateLoadingTime(loadingStartedAt), 1000);
  loadingHintTimeout = setTimeout(() => {
    if (launchSequence !== thisLaunch || !dialog.open) return;
    loadingHint.textContent = activeGame.system === 'nds'
      ? 'Los cartuchos de Nintendo DS pueden superar 500 MB y tardar varios minutos en la primera carga.'
      : 'La primera carga puede tardar un poco. Si se prolonga, revisa la conexión y que el archivo esté disponible.';
    loadingHint.hidden = false;
  }, 15000);

  window.EJS_player = '#game';
  window.EJS_core = activeGame.system === 'gba' ? 'gba' : 'melonds';
  window.EJS_gameUrl = romUrl || `./${encodeURIComponent(activeGame.file)}`;
  window.EJS_gameName = activeGame.title;
  window.EJS_gameID = 1;
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/4.2.3/data/';
  window.EJS_startOnLoaded = true;
  window.EJS_forceLegacyCores = forceLegacy;
  window.EJS_defaultOptions = { webgl2Enabled: forceLegacy ? 'disabled' : 'enabled' };
  if (!forceLegacy) forceWebGL2Preference(activeGame);
  window.EJS_ready = bypassEmptyCheatReset;
  startupErrorDetails = '';
  startupErrorSequence = thisLaunch;
  window.removeEventListener('error', captureStartupWindowError);
  window.removeEventListener('unhandledrejection', captureStartupRejection);
  window.addEventListener('error', captureStartupWindowError);
  window.addEventListener('unhandledrejection', captureStartupRejection);
  window.EJS_onGameStart = async () => {
    if (launchSequence !== thisLaunch || !dialog.open) return;
    restoreEmulatorConsoleWarning?.();
    restoreEmulatorConsoleWarning = null;
    startupErrorSequence = null;
    window.removeEventListener('error', captureStartupWindowError);
    window.removeEventListener('unhandledrejection', captureStartupRejection);
    clearTimeout(loadingHintTimeout);
    clearInterval(loadingTimeInterval);
    loadingTimeInterval = null;
    emulatorLoadingObserver?.disconnect();
    emulatorLoadingObserver = null;
    updateLoadingTime(loadingStartedAt);
    emulatorLoading.classList.add('is-hidden');
    document.querySelector('#session-status').textContent = 'SESIÓN ACTIVA';
    setSaveControlsEnabled(true);
    showMessage('Si la pantalla sigue negra, prueba un navegador actualizado con aceleración gráfica habilitada.');
    const pending = queuedSave;
    queuedSave = null;
    if (pending) await importSave(pending);
  };
  window.EJS_onSaveSave = (event) => downloadSave(event?.save);
  window.EJS_onLoadSave = () => runtimeSaveInput.click();

  const script = document.createElement('script');
  script.src = `${window.EJS_pathtodata}loader.js`;
  script.async = true;
  emulatorLoadingObserver?.disconnect();
  emulatorLoadingObserver = new MutationObserver(() => updateEmulatorLoading(thisLaunch));
  emulatorLoadingObserver.observe(gameContainer, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  captureEmulatorStartupError();
  script.onload = () => { emulatorScriptLoading = false; };
  script.onerror = () => {
    emulatorScriptLoading = false;
    restoreEmulatorConsoleWarning?.();
    restoreEmulatorConsoleWarning = null;
    startupErrorSequence = null;
    window.removeEventListener('error', captureStartupWindowError);
    window.removeEventListener('unhandledrejection', captureStartupRejection);
    if (launchSequence !== thisLaunch || !dialog.open) return;
    clearTimeout(loadingHintTimeout);
    clearInterval(loadingTimeInterval);
    loadingTimeInterval = null;
    emulatorLoadingObserver?.disconnect();
    emulatorLoadingObserver = null;
    emulatorLoading.classList.add('has-error');
    loadingStatus.textContent = 'NO SE PUDO CARGAR EL EMULADOR';
    loadingHint.textContent = 'No se pudo descargar EmulatorJS. Comprueba la conexión e inténtalo de nuevo.';
    loadingHint.hidden = false;
    document.querySelector('#session-status').textContent = 'ERROR DE CONEXIÓN';
    showMessage('No se pudo cargar EmulatorJS. Comprueba tu conexión y vuelve a abrir el juego.');
  };
  document.body.append(script);
}

document.querySelector('#collection-count').textContent = String(games.length).padStart(2, '0');
document.querySelector('#all-count').textContent = String(games.length).padStart(2, '0');
document.querySelector('#gba-count').textContent = String(games.filter((game) => game.system === 'gba').length).padStart(2, '0');
document.querySelector('#nds-count').textContent = String(games.filter((game) => game.system === 'nds').length).padStart(2, '0');
renderGames();

document.querySelectorAll('.filter-tab').forEach((button) => button.addEventListener('click', () => setFilter(button.dataset.filter)));
document.querySelector('#search').addEventListener('input', renderGames);
grid.addEventListener('click', (event) => {
  const card = event.target.closest('.game-card');
  if (card) openGame(games[Number(card.dataset.game)]);
});
grid.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.game-card')) {
    event.preventDefault();
    openGame(games[Number(event.target.dataset.game)]);
  }
});
document.querySelector('#new-game').addEventListener('click', () => {
  launchGame().catch(reportLaunchFailure);
});
romFileInput.addEventListener('change', () => {
  const file = romFileInput.files[0];
  romFileInput.value = '';
  if (!file || !activeGame) return;

  const extension = file.name.split('.').pop().toLocaleLowerCase('en');
  const expectedExtension = activeGame.system;
  if (extension !== expectedExtension) {
    romMessage.textContent = `Este juego necesita un archivo .${expectedExtension}; el archivo seleccionado es .${extension}.`;
    romMessage.hidden = false;
    return;
  }

  if (activeRomObjectUrl) URL.revokeObjectURL(activeRomObjectUrl);
  activeRomObjectUrl = URL.createObjectURL(file);
  romMessage.textContent = `Cartucho seleccionado: ${file.name}`;
  romMessage.hidden = false;
  launchGame(queuedSave, false, activeRomObjectUrl).catch(reportLaunchFailure);
});
initialSaveInput.addEventListener('change', () => {
  queuedSave = initialSaveInput.files[0] || null;
  if (!queuedSave) return;
  saveLabel.textContent = queuedSave.name;
  selectedSave.hidden = false;
});
document.querySelector('#load-game').addEventListener('click', () => launchGame(queuedSave));
runtimeSaveInput.addEventListener('change', () => {
  const file = runtimeSaveInput.files[0];
  if (file) importSave(file);
  runtimeSaveInput.value = '';
});
document.querySelector('#export-save').addEventListener('click', () => {
  const manager = window.EJS_emulator?.gameManager;
  if (!manager) {
    showMessage('El emulador todavía se está iniciando.');
    return;
  }
  try {
    downloadSave(manager.getSaveFile(true));
  } catch (error) {
    console.error('No se pudo exportar la partida.', error);
    showMessage('No se pudo exportar la partida. Guarda dentro del juego e inténtalo de nuevo.');
  }
});
document.querySelector('#close-player').addEventListener('click', closeGame);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeGame();
});
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeGame();
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !dialog.open && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    document.querySelector('#search').focus();
  }
});