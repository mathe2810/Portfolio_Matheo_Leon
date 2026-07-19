import { gameState, uiElements, tiles } from './state.js';
import { canvasToCell, getDistance, modifyElevationAtCell, findPathAStar } from './math.js';
import { triggerRender, updateInfo, toggleMapOnlyMode, resizeCanvas } from './main.js';

let activePointers = [];
let isPanning = false;
let startPanX = 0; let startPanY = 0;
let initialPinchDistance = 0; let initialZoom = 1;
let touchTimer;
const LONG_PRESS_DELAY = 600;

export function handleActionAtCell(cell, button) {
  if (gameState.editorMode === "paint") {
    if (button === 0) { 
      gameState.mapData[cell] = gameState.selectedTileId;
      if (gameState.selectedTileId !== 0) gameState.mapObjects[cell] = null;
    }
  } 
  else if (gameState.editorMode === "elevation") {
    if (button === 0) modifyElevationAtCell(cell, gameState.elevationTool === "raise");
  } 
  else if (gameState.editorMode === "pathfinding") {
    if (button === 0) gameState.start = cell;
    else if (button === 2) gameState.goal = cell;
  }
}

export function renderTilesPalette() {
  const paletteEl = document.getElementById('tilesPalette');
  paletteEl.innerHTML = '';

  const modeSelector = document.createElement('div');
  modeSelector.style.cssText = 'grid-column: span 3; display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; border-bottom: 1px solid #8b7355; padding-bottom: 12px;';
  
  const modeTitle = document.createElement('div');
  modeTitle.textContent = "Mode Actif :";
  modeTitle.style.cssText = 'color: #d4af37; font-size: 11px; font-weight: bold; text-transform: uppercase;';
  modeSelector.appendChild(modeTitle);

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display: flex; gap: 4px;';

  const btnPaintMode = document.createElement('button'); btnPaintMode.textContent = "Dessin";
  btnPaintMode.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 10px; font-weight: bold;';
  const btnElevMode = document.createElement('button'); btnElevMode.textContent = "Relief";
  btnElevMode.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 10px; font-weight: bold;';
  const btnPathMode = document.createElement('button'); btnPathMode.textContent = "Chemin";
  btnPathMode.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 10px; font-weight: bold;';

  function refreshModeUI() {
    if (gameState.editorMode === "paint") {
      btnPaintMode.style.background = "#689f38"; btnPaintMode.style.color = "white";
      btnElevMode.style.background = "#3e5a20"; btnElevMode.style.color = "#ccc";
      btnPathMode.style.background = "#3e5a20"; btnPathMode.style.color = "#ccc";
      tilesListContainer.style.display = "grid"; elevationOptions.style.display = "none";
    } else if (gameState.editorMode === "elevation") {
      btnPaintMode.style.background = "#3e5a20"; btnPaintMode.style.color = "#ccc";
      btnElevMode.style.background = "#689f38"; btnElevMode.style.color = "white";
      btnPathMode.style.background = "#3e5a20"; btnPathMode.style.color = "#ccc";
      tilesListContainer.style.display = "none"; elevationOptions.style.display = "flex";
    } else if (gameState.editorMode === "pathfinding") {
      btnPaintMode.style.background = "#3e5a20"; btnPaintMode.style.color = "#ccc";
      btnElevMode.style.background = "#3e5a20"; btnElevMode.style.color = "#ccc";
      btnPathMode.style.background = "#689f38"; btnPathMode.style.color = "white";
      tilesListContainer.style.display = "none"; elevationOptions.style.display = "none";
    }
  }

  btnPaintMode.addEventListener('click', () => { gameState.editorMode = "paint"; refreshModeUI(); });
  btnElevMode.addEventListener('click', () => { gameState.editorMode = "elevation"; refreshModeUI(); });
  btnPathMode.addEventListener('click', () => { gameState.editorMode = "pathfinding"; refreshModeUI(); });

  btnGroup.appendChild(btnPaintMode); btnGroup.appendChild(btnElevMode); btnGroup.appendChild(btnPathMode);
  modeSelector.appendChild(btnGroup); paletteEl.appendChild(modeSelector);

  const elevationOptions = document.createElement('div');
  elevationOptions.style.cssText = 'grid-column: span 3; display: flex; gap: 8px; margin-bottom: 10px;';
  
  const btnRaise = document.createElement('button'); btnRaise.textContent = "🔺 Monter";
  btnRaise.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 11px;';
  const btnLower = document.createElement('button'); btnLower.textContent = "🔻 Baisser";
  btnLower.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 11px;';

  btnRaise.addEventListener('click', () => {
    gameState.elevationTool = "raise";
    btnRaise.style.background = "#d4af37"; btnRaise.style.color = "#000";
    btnLower.style.background = "#1a1410"; btnLower.style.color = "#d4af37";
  });
  btnLower.addEventListener('click', () => {
    gameState.elevationTool = "lower";
    btnLower.style.background = "#d4af37"; btnLower.style.color = "#000";
    btnRaise.style.background = "#1a1410"; btnRaise.style.color = "#d4af37";
  });

  if (gameState.elevationTool === "raise") {
    btnRaise.style.background = "#d4af37"; btnRaise.style.color = "#000";
    btnLower.style.background = "#1a1410"; btnLower.style.color = "#d4af37";
  } else {
    btnLower.style.background = "#d4af37"; btnLower.style.color = "#000";
    btnRaise.style.background = "#1a1410"; btnRaise.style.color = "#d4af37";
  }

  elevationOptions.appendChild(btnRaise); elevationOptions.appendChild(btnLower);
  paletteEl.appendChild(elevationOptions);

  const tilesListContainer = document.createElement('div');
  tilesListContainer.style.cssText = 'grid-column: span 3; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;';
  paletteEl.appendChild(tilesListContainer);

  function deselectAllPaletteItems() {
    tilesListContainer.querySelectorAll('.palette-item').forEach(el => el.style.border = '1px solid transparent');
  }

  for (let i = 0; i < 15; i++) {
    const tile = tiles[i] || { name: 'Unknown', color: '#999', height: 0 };
    const tileDiv = document.createElement('div');
    tileDiv.className = 'palette-item';
    tileDiv.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:6px;background:rgba(0,0,0,0.2);border-radius:3px; border: 1px solid transparent; cursor:pointer;';
    if (gameState.editorMode === "paint" && gameState.selectedTileId === i) tileDiv.style.border = '1px solid #d4af37';

    const colorBox = document.createElement('div');
    colorBox.style.cssText = `width:100%;height:30px;background:${tile.color};border:2px solid #8b7355;border-radius:2px;`;
    colorBox.title = `ID ${i}: ${tile.name}`;
    colorBox.addEventListener('click', () => {
      gameState.editorMode = "paint"; gameState.selectedTileId = i; deselectAllPaletteItems();
      tileDiv.style.border = '1px solid #d4af37'; refreshModeUI();
    });

    const label = document.createElement('small');
    label.style.cssText = 'color:#d4af37;text-align:center;font-size:10px;font-weight:bold'; label.textContent = `ID ${i}`;
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color'; colorInput.value = tile.color;
    colorInput.style.cssText = 'width:100%;height:20px;cursor:pointer;border:none;border-radius:2px';
    colorInput.addEventListener('change', (e) => {
      tiles[i].color = e.target.value; colorBox.style.background = e.target.value; triggerRender();
    });
    
    const heightLabel = document.createElement('label');
    heightLabel.style.cssText = 'font-size:11px;color:#c9a961;display:flex;align-items:center;gap:2px'; heightLabel.textContent = 'H: ';
    
    const heightInput = document.createElement('input');
    heightInput.type = 'number'; heightInput.min = '0'; heightInput.max = '5'; heightInput.value = tile.height;
    heightInput.style.cssText = 'width:30px;height:18px;font-size:11px;background:#1a1410;color:#d4af37;border:1px solid #8b7355;border-radius:2px';
    heightInput.addEventListener('change', (e) => {
      tiles[i].height = Math.max(0, Math.min(5, parseInt(e.target.value, 10) || 0));
      e.target.value = tiles[i].height; triggerRender();
    });
    
    heightLabel.appendChild(heightInput); tileDiv.appendChild(colorBox); tileDiv.appendChild(label);
    tileDiv.appendChild(colorInput); tileDiv.appendChild(heightLabel); tilesListContainer.appendChild(tileDiv);
  }
  refreshModeUI();
}

export function initInputEvents(canvas) {
  canvas.addEventListener('pointerdown', (e) => {
    activePointers.push(e); canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'mouse' && e.button === 2) {
      const cell = canvasToCell(e.clientX, e.clientY, canvas);
      if (cell !== -1) { handleActionAtCell(cell, 2); triggerRender(); updateInfo(); }
      return;
    }
    if (e.pointerType === 'touch') {
      touchTimer = setTimeout(() => {
        const cell = canvasToCell(e.clientX, e.clientY, canvas);
        if (cell !== -1) { handleActionAtCell(cell, 2); triggerRender(); updateInfo(); isPanning = false; }
      }, LONG_PRESS_DELAY);
    }
    if (activePointers.length === 1 && e.button !== 2) {
      const cell = canvasToCell(e.clientX, e.clientY, canvas);
      if (cell !== -1) {
        gameState.isMouseDown = true; gameState.lastPaintedCell = cell;
        handleActionAtCell(cell, 0); triggerRender(); updateInfo();
      } else {
        isPanning = true; startPanX = e.clientX - gameState.panX; startPanY = e.clientY - gameState.panY;
        canvas.style.cursor = 'grabbing';
      }
    } else if (activePointers.length === 2) {
      gameState.isMouseDown = false; isPanning = false; clearTimeout(touchTimer);
      initialPinchDistance = getDistance(activePointers[0], activePointers[1]); initialZoom = gameState.zoom;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
    if (index !== -1) activePointers[index] = e;
    if (e.pointerType === 'touch' && activePointers.length === 1) {
      const deltaX = Math.abs(e.clientX - (startPanX + gameState.panX));
      const deltaY = Math.abs(e.clientY - (startPanY + gameState.panY));
      if (deltaX > 15 || deltaY > 15) clearTimeout(touchTimer);
    }
    if (gameState.isMouseDown && activePointers.length === 1 && gameState.editorMode !== "pathfinding") {
      const cell = canvasToCell(e.clientX, e.clientY, canvas);
      if (cell !== -1 && cell !== gameState.lastPaintedCell) {
        gameState.lastPaintedCell = cell; handleActionAtCell(cell, 0); triggerRender(); updateInfo();
      }
    } else if (isPanning && activePointers.length === 1) {
      gameState.panX = e.clientX - startPanX; gameState.panY = e.clientY - startPanY; triggerRender();
    } else if (activePointers.length === 2) {
      const currentDistance = getDistance(activePointers[0], activePointers[1]);
      if (initialPinchDistance > 0) {
        const factor = currentDistance / initialPinchDistance;
        gameState.zoom = Math.max(gameState.MIN_ZOOM, Math.min(gameState.MAX_ZOOM, initialZoom * factor));
        const midX = (activePointers[0].clientX + activePointers[1].clientX) / 2;
        const midY = (activePointers[0].clientY + activePointers[1].clientY) / 2;
        const rect = canvas.getBoundingClientRect();
        const worldX = ((midX - rect.left) / gameState.scale - gameState.panX) / initialZoom;
        const worldY = ((midY - rect.top) / gameState.scale - gameState.panY) / initialZoom;
        gameState.panX = (midX - rect.left) / gameState.scale - worldX * gameState.zoom;
        gameState.panY = (midY - rect.top) / gameState.scale - worldY * gameState.zoom;
        triggerRender();
      }
    }
  });

  function handlePointerUp(e) {
    clearTimeout(touchTimer); gameState.isMouseDown = false; gameState.lastPaintedCell = -1;
    activePointers = activePointers.filter(p => p.pointerId !== e.pointerId);
    if (activePointers.length < 2) initialPinchDistance = 0;
    if (activePointers.length === 0) { isPanning = false; canvas.style.cursor = 'default'; }
  }
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - gameState.panX) / gameState.zoom;
    const worldY = (mouseY - gameState.panY) / gameState.zoom;
    const zoomFactor = 1.15;
    if (e.deltaY < 0) gameState.zoom = Math.min(gameState.zoom * zoomFactor, gameState.MAX_ZOOM);
    else gameState.zoom = Math.max(gameState.zoom / zoomFactor, gameState.MIN_ZOOM);
    gameState.panX = mouseX - worldX * gameState.zoom; gameState.panY = mouseY - worldY * gameState.zoom;
    triggerRender();
  }, { passive: false });

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  document.addEventListener('keydown', async (e) => {
    if (e.code === 'KeyF') { await toggleMapOnlyMode(); return; }
    if (e.code === 'Space') {
      if (gameState.start < 0 || gameState.goal < 0) return alert('Définir départ et arrivée');
      gameState.path = findPathAStar(gameState.start, gameState.goal); triggerRender();
    }
    if (e.code === 'ArrowUp') { gameState.panY += 30; triggerRender(); }
    if (e.code === 'ArrowDown') { gameState.panY -= 30; triggerRender(); }
    if (e.code === 'ArrowLeft') { gameState.panX += 30; triggerRender(); }
    if (e.code === 'ArrowRight') { gameState.panX -= 30; triggerRender(); }
    if (e.key === 'r' || e.key === 'R') { gameState.start = -1; gameState.goal = -1; gameState.path = []; triggerRender(); }
    updateInfo();
  });
}