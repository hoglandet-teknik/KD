// =========================
// KD - script.ts (FULL FILE)
// GitHub Pages share links: #/s/<id> and Worker fetch
// =========================

// Default Example Code
const DEFAULT_CODE = `// Exempel: En enkel cirkel
clear();

circle(250, 250, 30, "#ff0000");
`;

// Cloudflare Worker origin (production)
const WORKER_ORIGIN = 'https://koda-worker.akram82.workers.dev';

// Build correct base URL on GitHub Pages using Vite BASE_URL (e.g., /KD/)
function getAppBaseUrl() {
  // Example result: https://hoglandet-teknik.github.io/KD
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString().replace(/\/+$/, '');
}

// Read shared id from URL:
// 1) Preferred: https://.../KD/#/s/<id>
// 2) Back-compat: https://.../KD/?id=<id>
function getSharedIdFromUrl(): string | null {
  const hash = window.location.hash || '';
  const m = hash.match(/^#\/s\/([A-Za-z0-9_-]+)$/);
  if (m?.[1]) return m[1];

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// State
let code = DEFAULT_CODE;
let history = [DEFAULT_CODE];
let historyIndex = 0;
let isDarkMode = false;
let activeErrorLine = -1;

// DOM Elements
const codeEditor = document.getElementById('code-editor') as HTMLTextAreaElement | null;
const highlighting = document.getElementById('highlighting') as HTMLElement | null;
const highlightingContent = document.getElementById('highlighting-content') as HTMLElement | null;
const lineNumbers = document.getElementById('line-numbers') as HTMLElement | null;
const canvas = document.getElementById('drawing-canvas') as HTMLCanvasElement | null;
const ctx = canvas?.getContext('2d') as CanvasRenderingContext2D | null;
const errorOutput = document.getElementById('error-output') as HTMLElement | null;
const themeToggle = document.getElementById('theme-toggle') as HTMLElement | null;
const coordsTooltip = document.getElementById('coords-tooltip') as HTMLElement | null;
const colorInput = document.getElementById('color-input') as HTMLInputElement | null;
const colorHex = document.getElementById('color-hex') as HTMLInputElement | null;
const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement | null;
const xAxisContainer = document.getElementById('x-axis-container') as HTMLElement | null;
const yAxisContainer = document.getElementById('y-axis-container') as HTMLElement | null;

// Buttons
const btnRun = document.getElementById('btn-run') as HTMLButtonElement | null;
const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement | null;
const btnRedo = document.getElementById('btn-redo') as HTMLButtonElement | null;
const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement | null;
const btnCopyHex = document.getElementById('btn-copy-hex') as HTMLButtonElement | null;
const btnInsertHex = document.getElementById('btn-insert-hex') as HTMLButtonElement | null;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement | null;
const btnLoad = document.getElementById('btn-load') as HTMLButtonElement | null;
const btnShare = document.getElementById('btn-share') as HTMLButtonElement | null;
const btnScreenshot = document.getElementById('btn-screenshot') as HTMLButtonElement | null;
const shareModal = document.getElementById('share-modal') as HTMLElement | null;
const btnCloseModal = document.getElementById('btn-close-modal') as HTMLButtonElement | null;
const shareLinkInput = document.getElementById('share-link') as HTMLInputElement | null;
const btnCopyLink = document.getElementById('btn-copy-link') as HTMLButtonElement | null;
const splitter = document.getElementById('splitter') as HTMLElement | null;
const mainContainer = document.querySelector('main') as HTMLElement | null;

// Initialization
function init() {
  if (
    !codeEditor ||
    !highlighting ||
    !highlightingContent ||
    !lineNumbers ||
    !canvas ||
    !ctx ||
    !errorOutput ||
    !themeToggle ||
    !coordsTooltip ||
    !colorInput ||
    !colorHex ||
    !fileInput ||
    !canvasWrapper ||
    !xAxisContainer ||
    !yAxisContainer ||
    !btnRun ||
    !btnUndo ||
    !btnRedo ||
    !btnCopy ||
    !btnCopyHex ||
    !btnInsertHex ||
    !btnSave ||
    !btnLoad ||
    !btnShare ||
    !btnScreenshot ||
    !shareModal ||
    !btnCloseModal ||
    !shareLinkInput ||
    !btnCopyLink ||
    !splitter ||
    !mainContainer
  ) {
    console.error('Missing required DOM elements.');
    return;
  }

  // Restore Editor Width Percentage
  const savedWidthPercent = localStorage.getItem('editorWidthPercent');
  if (savedWidthPercent) {
    document.documentElement.style.setProperty('--editor-width-percent', savedWidthPercent);
  }

  // Shared code via hash route (#/s/<id>) or back-compat (?id=<id>)
  const sharedId = getSharedIdFromUrl();

  if (sharedId) {
    loadSharedCode(sharedId);
  } else {
    const savedCode = localStorage.getItem('studentCode');
    if (savedCode) code = savedCode;

    codeEditor.value = code;
    updateHighlighting(code);
    updateLineNumbers();
    runCode();
  }

  // Resize canvas to fit container
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Event Listeners
  codeEditor.addEventListener('input', handleInput);
  codeEditor.addEventListener('scroll', syncScroll);
  codeEditor.addEventListener('keydown', handleKeydown);

  btnRun.addEventListener('click', runCode);
  btnUndo.addEventListener('click', undo);
  btnRedo.addEventListener('click', redo);
  btnCopy.addEventListener('click', copyCode);
  btnSave.addEventListener('click', saveToFile);
  btnLoad.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', loadFromFile);
  btnScreenshot.addEventListener('click', takeScreenshot);

  // Splitter Drag Logic (Percentage Based)
  let isDragging = false;

  splitter.addEventListener('pointerdown', (e) => {
    isDragging = true;
    splitter.classList.add('active');
    splitter.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const isColumn = window.getComputedStyle(mainContainer).flexDirection === 'column';

    if (isColumn) {
      const newHeight = e.clientY - mainContainer.getBoundingClientRect().top;
      if (newHeight > 100 && newHeight < mainContainer.clientHeight - 100) {
        const editorPanel = document.querySelector('.editor-panel') as HTMLElement | null;
        if (editorPanel) {
          editorPanel.style.height = `${newHeight}px`;
          editorPanel.style.flex = 'none';
        }
        resizeCanvas();
      }
    } else {
      const totalWidth = mainContainer.clientWidth;
      let percent = (e.clientX / totalWidth) * 100;

      if (percent < 25) percent = 25;
      if (percent > 60) percent = 60;

      document.documentElement.style.setProperty('--editor-width-percent', `${percent}%`);
      resizeCanvas();
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;

    isDragging = false;
    splitter.classList.remove('active');
    if (splitter.hasPointerCapture(e.pointerId)) splitter.releasePointerCapture(e.pointerId);

    const currentWidthStr = getComputedStyle(document.documentElement).getPropertyValue('--editor-width-percent');
    let percent = parseFloat(currentWidthStr);

    if (percent < 30) percent = 30;
    else if (percent > 55) percent = 55;

    document.documentElement.style.setProperty('--editor-width-percent', `${percent}%`);
    localStorage.setItem('editorWidthPercent', `${percent}%`);

    setTimeout(resizeCanvas, 50);
  });

  // Share functionality
  btnShare.addEventListener('click', createShareLink);
  btnCloseModal.addEventListener('click', () => (shareModal.style.display = 'none'));
  btnCopyLink.addEventListener('click', () => {
    shareLinkInput.select();
    navigator.clipboard.writeText(shareLinkInput.value);
    const originalText = btnCopyLink.textContent || '';
    btnCopyLink.textContent = 'Kopierad!';
    setTimeout(() => (btnCopyLink.textContent = originalText), 2000);
  });

  // Close modal on outside click
  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) shareModal.style.display = 'none';
  });

  themeToggle.addEventListener('click', toggleTheme);

  // Color Picker
  colorInput.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    colorHex.value = t.value;
  });

  btnCopyHex.addEventListener('click', () => {
    navigator.clipboard.writeText(colorHex.value);
  });

  btnInsertHex.addEventListener('click', () => {
    insertAtCursor(colorHex.value);
  });

  // Canvas Coords
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    coordsTooltip.style.display = 'block';
    coordsTooltip.textContent = `Koordinater: x: ${x}, y: ${y}`;
  });

  canvas.addEventListener('mouseleave', () => {
    coordsTooltip.style.display = 'none';
  });
}

// Auto-save debounce
let saveTimeout: number | undefined;
function debouncedSave() {
  if (saveTimeout) window.clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(() => {
    localStorage.setItem('studentCode', code);
  }, 500);
}

// Canvas Resizing
function resizeCanvas() {
  if (!canvasWrapper || !canvas || !ctx) return;

  const rect = canvasWrapper.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  if (width === 0 || height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  const targetWidth = Math.floor(width * dpr);
  const targetHeight = Math.floor(height * dpr);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    let imageData: HTMLCanvasElement | null = null;

    if (canvas.width > 0 && canvas.height > 0) {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0);
        imageData = tempCanvas;
      } catch {
        // ignore
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Reset transform then scale to DPR (avoid compounding)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    if (imageData) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(imageData, 0, 0);
      ctx.restore();

      // Re-apply DPR scale
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    renderAxes();
  }
}

// Editor Logic
function handleInput() {
  if (!codeEditor) return;
  const newCode = codeEditor.value;
  if (newCode !== code) {
    code = newCode;
    activeErrorLine = -1;
    updateHighlighting(code);
    updateLineNumbers();
    debouncedSave();
  }
}

async function createShareLink() {
  if (!btnShare || !shareLinkInput || !shareModal) return;

  const originalHTML = btnShare.innerHTML;
  btnShare.disabled = true;
  btnShare.textContent = 'Skapar...';

  try {
    const response = await fetch(`${WORKER_ORIGIN}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      if (response.status === 413) throw new Error('Koden är för stor (max 50KB)');
      throw new Error('Network response was not ok');
    }

    const data = await response.json();

    const base = getAppBaseUrl(); // https://hoglandet-teknik.github.io/KD
    const link = `${base}/#/s/${data.id}`;

    shareLinkInput.value = link;
    shareModal.style.display = 'flex';
  } catch (error: any) {
    console.error('Share error:', error);
    if (String(error?.message || '').includes('50KB')) {
      alert('Koden är för stor för att delas (max 50KB).');
    } else {
      alert('Kunde inte skapa länk just nu. Försök igen senare.');
    }
  } finally {
    btnShare.disabled = false;
    btnShare.innerHTML = originalHTML;
  }
}

async function loadSharedCode(id: string) {
  if (!codeEditor) return;

  try {
    const response = await fetch(`${WORKER_ORIGIN}/api/share?id=${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Code not found');

    const data = await response.json();
    code = data.code;

    codeEditor.value = code;
    updateHighlighting(code);
    updateLineNumbers();
    saveToHistory(code);

    localStorage.setItem('studentCode', code);
    runCode();
  } catch (error) {
    console.error('Load error:', error);

    const savedCode = localStorage.getItem('studentCode');
    if (savedCode) code = savedCode;

    codeEditor.value = code;
    updateHighlighting(code);
    updateLineNumbers();
    runCode();

    alert('Kunde inte ladda den delade koden. Laddar din sparade kod istället.');
  }
}

function updateHighlighting(text: string) {
  if (!highlightingContent) return;

  const tokenRegex =
    /(\/\/.*)|(".*?"|'.*?')|(\b(circle|rectangle|triangle|arc|line|ring|text|clear|fill|Math|console)\b)|(\b(var|let|const|function|if|else|for|while|return|true|false|null|undefined)\b)|(\b\d+\b)/g;

  const lines = text.split('\n');
  const htmlLines = lines.map((line, index) => {
    let htmlLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    htmlLine = htmlLine.replace(tokenRegex, (match, comment, string, func, _funcName, keyword, _keywordName, number) => {
      if (comment) return `<span class="token-comment">${comment}</span>`;
      if (string) return `<span class="token-string">${string}</span>`;
      if (func) return `<span class="token-function">${func}</span>`;
      if (keyword) return `<span class="token-keyword">${keyword}</span>`;
      if (number) return `<span class="token-number">${number}</span>`;
      return match;
    });

    if (index === activeErrorLine) return `<span class="line-error">${htmlLine || ' '}</span>`;
    return htmlLine;
  });

  let html = htmlLines.join('\n');
  if (text.endsWith('\n')) html += ' ';
  highlightingContent.innerHTML = html;
}

// Save history on blur
if (codeEditor) {
  codeEditor.addEventListener('blur', () => saveToHistory(code));
}

function saveToHistory(newCode: string) {
  if (history[historyIndex] !== newCode) {
    history = history.slice(0, historyIndex + 1);
    history.push(newCode);
    historyIndex = history.length - 1;
    updateUndoRedoButtons();
  }
}

function undo() {
  if (!codeEditor) return;
  if (historyIndex > 0) {
    historyIndex--;
    code = history[historyIndex];
    codeEditor.value = code;
    activeErrorLine = -1;
    updateHighlighting(code);
    updateLineNumbers();
    updateUndoRedoButtons();
    localStorage.setItem('studentCode', code);
  }
}

function redo() {
  if (!codeEditor) return;
  if (historyIndex < history.length - 1) {
    historyIndex++;
    code = history[historyIndex];
    codeEditor.value = code;
    activeErrorLine = -1;
    updateHighlighting(code);
    updateLineNumbers();
    updateUndoRedoButtons();
    localStorage.setItem('studentCode', code);
  }
}

function updateUndoRedoButtons() {
  if (!btnUndo || !btnRedo) return;
  btnUndo.disabled = historyIndex <= 0;
  btnRedo.disabled = historyIndex >= history.length - 1;
}

function updateLineNumbers() {
  if (!lineNumbers) return;
  const lines = code.split('\n').length;
  lineNumbers.innerHTML = Array(lines)
    .fill(0)
    .map((_, i) => i + 1)
    .join('<br>');
}

function syncScroll() {
  if (!codeEditor || !lineNumbers || !highlighting) return;

  const scrollTop = codeEditor.scrollTop;
  const scrollLeft = codeEditor.scrollLeft;

  lineNumbers.scrollTop = scrollTop;
  highlighting.scrollTop = scrollTop;
  highlighting.scrollLeft = scrollLeft;
}

function handleKeydown(e: KeyboardEvent) {
  if (!codeEditor) return;

  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault();
    redo();
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    insertAtCursor('  ');
  }
}

function insertAtCursor(text: string) {
  if (!codeEditor) return;

  const start = codeEditor.selectionStart;
  const end = codeEditor.selectionEnd;

  code = code.substring(0, start) + text + code.substring(end);
  codeEditor.value = code;

  activeErrorLine = -1;
  updateHighlighting(code);

  codeEditor.selectionStart = codeEditor.selectionEnd = start + text.length;
  codeEditor.focus();

  saveToHistory(code);
  localStorage.setItem('studentCode', code);
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(code);
  } catch (err) {
    console.error('Failed to copy', err);
  }
}

function saveToFile() {
  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'min-kod.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function loadFromFile(e: Event) {
  if (!codeEditor || !fileInput) return;

  const t = e.target as HTMLInputElement;
  const file = t.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const result = (ev.target as FileReader)?.result;
    if (typeof result === 'string') {
      code = result;
      codeEditor.value = code;
      activeErrorLine = -1;
      updateHighlighting(code);
      updateLineNumbers();
      saveToHistory(code);
      localStorage.setItem('studentCode', code);
      fileInput.value = '';
    }
  };
  reader.readAsText(file);
}

function toggleTheme() {
  isDarkMode = !isDarkMode;
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
    const sun = document.querySelector('.icon-sun') as HTMLElement | null;
    const moon = document.querySelector('.icon-moon') as HTMLElement | null;
    if (sun) sun.style.display = 'none';
    if (moon) moon.style.display = 'block';
  } else {
    document.documentElement.classList.remove('dark');
    const sun = document.querySelector('.icon-sun') as HTMLElement | null;
    const moon = document.querySelector('.icon-moon') as HTMLElement | null;
    if (sun) sun.style.display = 'block';
    if (moon) moon.style.display = 'none';
  }
}

// Canvas & Execution Logic
function renderAxes() {
  if (!xAxisContainer || !yAxisContainer || !canvas) return;

  xAxisContainer.innerHTML = '';
  yAxisContainer.innerHTML = '';

  const xTitle = document.createElement('div');
  xTitle.className = 'axis-title axis-title-x';
  xTitle.textContent = 'X-Axis';
  xAxisContainer.appendChild(xTitle);

  const yTitle = document.createElement('div');
  yTitle.className = 'axis-title axis-title-y';
  yTitle.textContent = 'Y-Axis';
  yAxisContainer.appendChild(yTitle);

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const step = 50;

  for (let x = 0; x <= width; x += step) {
    if (x === 0) continue;

    const label = document.createElement('div');
    label.className = 'axis-label x-label';
    label.textContent = String(x);
    label.style.left = x + 'px';
    xAxisContainer.appendChild(label);

    const tick = document.createElement('div');
    tick.className = 'axis-tick x-tick';
    tick.style.left = x + 'px';
    xAxisContainer.appendChild(tick);
  }

  for (let y = 0; y <= height; y += step) {
    if (y === 0) continue;

    const label = document.createElement('div');
    label.className = 'axis-label y-label';
    label.textContent = String(y);
    label.style.top = y + 'px';
    yAxisContainer.appendChild(label);

    const tick = document.createElement('div');
    tick.className = 'axis-tick y-tick';
    tick.style.top = y + 'px';
    yAxisContainer.appendChild(tick);
  }
}

function clearCanvas() {
  if (!ctx || !canvas) return;
  // Clear safely in device pixels
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function takeScreenshot() {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `canvas-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function runCode() {
  if (!ctx || !canvas || !codeEditor || !errorOutput) return;

  const dpr = window.devicePixelRatio || 1;

  // Hard clear
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const studentCode = codeEditor.value;
  activeErrorLine = -1;
  updateHighlighting(code);

  const blocked = ['window', 'document', 'fetch', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'eval', 'Function'];
  const regex = new RegExp(`\\b(${blocked.join('|')})\\b`);
  const match = studentCode.match(regex);

  if (match) {
    errorOutput.textContent = `Säkerhetsfel: Du får inte använda "${match[0]}"`;
    errorOutput.style.color = 'var(--danger-color)';
    return;
  }

  errorOutput.textContent = 'Körs...';
  errorOutput.style.color = 'var(--text-color)';

  const api: Record<string, any> = {
    Math: Math,
    console: {
      log: (...args: any[]) => console.log(...args),
      error: (...args: any[]) => console.error(...args),
    },
    clear: () => clearCanvas(),
    fill: (c: string) => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Re-apply DPR scale for subsequent drawing if needed
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    },
    circle: (x: number, y: number, r: number, c: string) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    },
    ring: (x: number, y: number, r: number, t: number, c: string) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.lineWidth = t;
      ctx.strokeStyle = c;
      ctx.stroke();
    },
    rectangle: (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    },
    triangle: (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: string) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
    },
    line: (x1: number, y1: number, x2: number, y2: number, t: number, c: string) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = t;
      ctx.strokeStyle = c;
      ctx.lineCap = 'round';
      ctx.stroke();
    },
    arc: (x: number, y: number, r: number, deg: number, t: number, c: string) => {
      ctx.beginPath();
      const rad = (deg * Math.PI) / 180;
      ctx.arc(x, y, r, 0, rad);
      ctx.lineWidth = t;
      ctx.strokeStyle = c;
      ctx.stroke();
    },
    text: (x: number, y: number, s: number, str: string, c: string) => {
      ctx.font = `${s}px Inter, sans-serif`;
      ctx.fillStyle = c;
      ctx.fillText(str, x, y);
    },
  };

  try {
    const func = new Function(...Object.keys(api), `"use strict";\n${studentCode}`);
    func(...Object.values(api));

    errorOutput.textContent = 'Koden kördes utan fel.';
    errorOutput.style.color = 'var(--success-color)';
  } catch (err: any) {
    let line = -1;

    const lines = studentCode.split('\n');
    let lastNonEmptyIndex = lines.length - 1;
    while (lastNonEmptyIndex >= 0 && lines[lastNonEmptyIndex].trim() === '') lastNonEmptyIndex--;

    if (err?.stack) {
      const matches = String(err.stack).match(/:(\d+):(\d+)/);
      if (matches) line = parseInt(matches[1], 10) - 2;
    }

    if (line === -1) {
      if (typeof err?.line === 'number') line = err.line - 2;
      else if (typeof err?.lineNumber === 'number') line = err.lineNumber - 2;
    }

    if ((line === -1 || line > lastNonEmptyIndex) && err?.name === 'SyntaxError') {
      for (let i = 0; i <= lastNonEmptyIndex; i++) {
        const snippet = lines.slice(0, i + 1).join('\n');
        try {
          new Function(...Object.keys(api), `"use strict";\n${snippet}`);
        } catch (e: any) {
          const eMsg = String(e?.message || '').toLowerCase();
          if (!eMsg.includes('unexpected end of input') && !eMsg.includes('unexpected token }')) {
            line = i;
            break;
          }
        }
      }
      if (line === -1) line = lastNonEmptyIndex;
    }

    if (line < 0) line = 0;
    if (line > lastNonEmptyIndex) line = lastNonEmptyIndex;

    activeErrorLine = line;
    updateHighlighting(code);

    const lineHeight = 21;
    codeEditor.scrollTop = line * lineHeight - codeEditor.clientHeight / 2;

    errorOutput.textContent = `Fel på rad ${line + 1}.`;
    errorOutput.style.color = 'var(--danger-color)';
  }
}

// Helper for Levenshtein distance
function levenshtein(a: string, b: string) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Start
init();