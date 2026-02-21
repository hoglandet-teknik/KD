// Default Example Code
const DEFAULT_CODE = `// Exempel: En enkel cirkel
clear();

circle(250, 250, 30, "#ff0000");
`;

// State
let code = DEFAULT_CODE;
let history = [DEFAULT_CODE];
let historyIndex = 0;
let isDarkMode = false;
let activeErrorLine = -1;

// DOM Elements
const codeEditor = document.getElementById('code-editor');
const highlighting = document.getElementById('highlighting');
const highlightingContent = document.getElementById('highlighting-content');
const lineNumbers = document.getElementById('line-numbers');
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const errorOutput = document.getElementById('error-output');
const themeToggle = document.getElementById('theme-toggle');
const coordsTooltip = document.getElementById('coords-tooltip');
const colorInput = document.getElementById('color-input');
const colorHex = document.getElementById('color-hex');
const fileInput = document.getElementById('file-input');
const canvasWrapper = document.querySelector('.canvas-wrapper');
const xAxisContainer = document.getElementById('x-axis-container');
const yAxisContainer = document.getElementById('y-axis-container');

// Buttons
const btnRun = document.getElementById('btn-run');
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnCopy = document.getElementById('btn-copy');
const btnCopyHex = document.getElementById('btn-copy-hex');
const btnInsertHex = document.getElementById('btn-insert-hex');
const btnSave = document.getElementById('btn-save');
const btnLoad = document.getElementById('btn-load');
const btnShare = document.getElementById('btn-share');
const btnScreenshot = document.getElementById('btn-screenshot');
const shareModal = document.getElementById('share-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const shareLinkInput = document.getElementById('share-link');
const btnCopyLink = document.getElementById('btn-copy-link');
const splitter = document.getElementById('splitter');
const mainContainer = document.querySelector('main');

// Initialization
function init() {
  // Restore Editor Width Percentage
  const savedWidthPercent = localStorage.getItem('editorWidthPercent');
  if (savedWidthPercent) {
    document.documentElement.style.setProperty('--editor-width-percent', savedWidthPercent);
  }

  // Check for shared code ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const sharedId = urlParams.get('id');

  if (sharedId) {
    loadSharedCode(sharedId);
  } else {
    // Load from local storage if available
    const savedCode = localStorage.getItem('studentCode');
    if (savedCode) {
      code = savedCode;
    }
    
    codeEditor.value = code;
    updateHighlighting(code);
    updateLineNumbers();
    // Run initial code
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
      // Vertical resize logic for mobile/stacked layout
      const newHeight = e.clientY - mainContainer.getBoundingClientRect().top;
      // Constraints (min 100px, max height - 100px)
      if (newHeight > 100 && newHeight < mainContainer.clientHeight - 100) {
         document.querySelector('.editor-panel').style.height = `${newHeight}px`;
         document.querySelector('.editor-panel').style.flex = 'none';
         resizeCanvas();
      }
    } else {
      // Horizontal resize (Percentage)
      const totalWidth = mainContainer.clientWidth;
      let percent = (e.clientX / totalWidth) * 100;
      
      // Clamp between 25% and 60%
      if (percent < 25) percent = 25;
      if (percent > 60) percent = 60;
      
      document.documentElement.style.setProperty('--editor-width-percent', `${percent}%`);
      resizeCanvas();
    }
  });
  
  window.addEventListener('pointerup', (e) => {
    if (isDragging) {
      isDragging = false;
      splitter.classList.remove('active');
      if (splitter.hasPointerCapture(e.pointerId)) {
          splitter.releasePointerCapture(e.pointerId);
      }
      
      // Snap Logic
      const currentWidthStr = getComputedStyle(document.documentElement).getPropertyValue('--editor-width-percent');
      let percent = parseFloat(currentWidthStr);
      
      if (percent < 30) percent = 30;
      else if (percent > 55) percent = 55;
      
      document.documentElement.style.setProperty('--editor-width-percent', `${percent}%`);
      localStorage.setItem('editorWidthPercent', `${percent}%`);
      
      // Smooth resize after snap
      setTimeout(resizeCanvas, 50);
    }
  });
  
  // Share functionality
  btnShare.addEventListener('click', createShareLink);
  btnCloseModal.addEventListener('click', () => shareModal.style.display = 'none');
  btnCopyLink.addEventListener('click', () => {
    shareLinkInput.select();
    navigator.clipboard.writeText(shareLinkInput.value);
    const originalText = btnCopyLink.textContent;
    btnCopyLink.textContent = 'Kopierad!';
    setTimeout(() => btnCopyLink.textContent = originalText, 2000);
  });
  
  // Close modal on outside click
  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) {
      shareModal.style.display = 'none';
    }
  });
  
  themeToggle.addEventListener('click', toggleTheme);
  
  // Color Picker
  colorInput.addEventListener('input', (e) => {
    colorHex.value = e.target.value;
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
let saveTimeout;
function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    localStorage.setItem('studentCode', code);
  }, 500);
}

// Canvas Resizing
function resizeCanvas() {
  const rect = canvasWrapper.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  
  // Skip if container is hidden or collapsed
  if (width === 0 || height === 0) return;

  // Handle High DPI
  const dpr = window.devicePixelRatio || 1;
  const targetWidth = Math.floor(width * dpr);
  const targetHeight = Math.floor(height * dpr);
  
  // Only resize if backing store dimensions changed
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    // Save current drawing only if canvas has valid dimensions
    let imageData = null;
    if (canvas.width > 0 && canvas.height > 0) {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
        imageData = tempCanvas;
      } catch (e) {
        // Ignore
      }
    }
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);
    
    // Restore drawing
    if (imageData) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Draw image scaled to new size? No, we want to preserve the visual content.
      // But if we just drawImage, it draws 1:1 pixels.
      // If we resized due to DPR change, we might want to scale.
      // But mostly we resize due to layout change.
      // Just drawing it back at 0,0 is the standard behavior for this app.
      ctx.drawImage(imageData, 0, 0);
      ctx.restore();
    }
    
    renderAxes();
  }
}

// Editor Logic
function handleInput() {
  const newCode = codeEditor.value;
  if (newCode !== code) {
    code = newCode;
    activeErrorLine = -1; // Reset error highlight on input
    updateHighlighting(code);
    updateLineNumbers();
    
    // Auto-save to local storage (Debounced)
    debouncedSave();
  }
}

async function createShareLink() {
  const originalText = btnShare.innerHTML;
  btnShare.disabled = true;
  btnShare.textContent = 'Skapar...';
  
  try {
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      if (response.status === 413) {
        throw new Error('Koden är för stor (max 50KB)');
      }
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    const link = `${window.location.origin}/?id=${data.id}`;
    
    shareLinkInput.value = link;
    shareModal.style.display = 'flex';
  } catch (error) {
    console.error('Share error:', error);
    if (error.message.includes('50KB')) {
      alert('Koden är för stor för att delas (max 50KB).');
    } else {
      alert('Kunde inte skapa länk just nu. Försök igen senare.');
    }
  } finally {
    btnShare.disabled = false;
    btnShare.innerHTML = originalText;
  }
}

async function loadSharedCode(id) {
  try {
    const response = await fetch(`/api/share?id=${id}`);
    if (!response.ok) {
      throw new Error('Code not found');
    }
    
    const data = await response.json();
    code = data.code;
    
    codeEditor.value = code;
    updateHighlighting(code);
    updateLineNumbers();
    saveToHistory(code);
    
    // Resume auto-save with this new code
    localStorage.setItem('studentCode', code);
    
    runCode();
  } catch (error) {
    console.error('Load error:', error);
    // Fallback to local storage or default if load fails
    const savedCode = localStorage.getItem('studentCode');
    if (savedCode) {
      code = savedCode;
    }
    codeEditor.value = code;
    updateHighlighting(code);
    updateLineNumbers();
    runCode();
    
    alert('Kunde inte ladda den delade koden. Laddar din sparade kod istället.');
  }
}

function updateHighlighting(text) {
  // Simple Tokenizer Regex
  const tokenRegex = /(\/\/.*)|(".*?"|'.*?')|(\b(circle|rectangle|triangle|arc|line|ring|text|clear|fill|Math|console)\b)|(\b(var|let|const|function|if|else|for|while|return|true|false|null|undefined)\b)|(\b\d+\b)/g;
  
  const lines = text.split('\n');
  const htmlLines = lines.map((line, index) => {
    // Escape HTML
    let htmlLine = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Apply tokens
    htmlLine = htmlLine.replace(tokenRegex, (match, comment, string, func, funcName, keyword, keywordName, number) => {
      if (comment) return `<span class="token-comment">${comment}</span>`;
      if (string) return `<span class="token-string">${string}</span>`;
      if (func) return `<span class="token-function">${func}</span>`;
      if (keyword) return `<span class="token-keyword">${keyword}</span>`;
      if (number) return `<span class="token-number">${number}</span>`;
      return match;
    });
    
    // Highlight error line
    if (index === activeErrorLine) {
      return `<span class="line-error">${htmlLine || ' '}</span>`; // Ensure empty lines are visible
    }
    return htmlLine;
  });
  
  let html = htmlLines.join('\n');
  
  // Handle trailing newline for pre
  if (text.endsWith('\n')) {
    html += ' ';
  }
  
  highlightingContent.innerHTML = html;
}

// Save history on blur
codeEditor.addEventListener('blur', () => {
  saveToHistory(code);
});

function saveToHistory(newCode) {
  if (history[historyIndex] !== newCode) {
    history = history.slice(0, historyIndex + 1);
    history.push(newCode);
    historyIndex = history.length - 1;
    updateUndoRedoButtons();
  }
}

function undo() {
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
  btnUndo.disabled = historyIndex <= 0;
  btnRedo.disabled = historyIndex >= history.length - 1;
}

function updateLineNumbers() {
  const lines = code.split('\n').length;
  lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => i + 1).join('<br>');
}

function syncScroll() {
  const scrollTop = codeEditor.scrollTop;
  const scrollLeft = codeEditor.scrollLeft;
  
  lineNumbers.scrollTop = scrollTop;
  highlighting.scrollTop = scrollTop;
  highlighting.scrollLeft = scrollLeft;
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      redo();
    } else {
      undo();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault();
    redo();
  }
  
  if (e.key === 'Tab') {
    e.preventDefault();
    insertAtCursor('  ');
  }
}

function insertAtCursor(text) {
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

function loadFromFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    code = e.target.result;
    codeEditor.value = code;
    activeErrorLine = -1;
    updateHighlighting(code);
    updateLineNumbers();
    saveToHistory(code);
    localStorage.setItem('studentCode', code);
    fileInput.value = ''; // Reset
  };
  reader.readAsText(file);
}

function toggleTheme() {
  isDarkMode = !isDarkMode;
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
    document.querySelector('.icon-sun').style.display = 'none';
    document.querySelector('.icon-moon').style.display = 'block';
  } else {
    document.documentElement.classList.remove('dark');
    document.querySelector('.icon-sun').style.display = 'block';
    document.querySelector('.icon-moon').style.display = 'none';
  }
}

// Canvas & Execution Logic
function renderAxes() {
  // Clear existing
  xAxisContainer.innerHTML = '';
  yAxisContainer.innerHTML = '';
  
  // Add Titles
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
  
  // X Axis
  for (let x = 0; x <= width; x += step) {
    if (x === 0) continue;
    
    // Label
    const label = document.createElement('div');
    label.className = 'axis-label x-label';
    label.textContent = x;
    label.style.left = x + 'px';
    xAxisContainer.appendChild(label);
    
    // Tick
    const tick = document.createElement('div');
    tick.className = 'axis-tick x-tick';
    tick.style.left = x + 'px';
    xAxisContainer.appendChild(tick);
  }
  
  // Y Axis
  for (let y = 0; y <= height; y += step) {
    if (y === 0) continue;
    
    // Label
    const label = document.createElement('div');
    label.className = 'axis-label y-label';
    label.textContent = y;
    label.style.top = y + 'px';
    yAxisContainer.appendChild(label);
    
    // Tick
    const tick = document.createElement('div');
    tick.className = 'axis-tick y-tick';
    tick.style.top = y + 'px';
    yAxisContainer.appendChild(tick);
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function takeScreenshot() {
  const link = document.createElement('a');
  link.download = `canvas-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function runCode() {
  // 1. Hard Canvas Clear (Requirement B)
  // We must preserve the scale set by resizeCanvas (dpr), so we save/restore.
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity for full clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore(); // Restore dpr scaling

  // Sandbox execution
  const studentCode = codeEditor.value;
  activeErrorLine = -1;
  updateHighlighting(code);
  
  // Security Filter
  const blocked = ['window', 'document', 'fetch', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'eval', 'Function'];
  const regex = new RegExp(`\\b(${blocked.join('|')})\\b`);
  const match = studentCode.match(regex);
  
  if (match) {
    errorOutput.textContent = `Säkerhetsfel: Du får inte använda "${match[0]}"`;
    errorOutput.style.color = 'var(--danger-color)';
    return;
  }
  
  errorOutput.textContent = "Körs...";
  errorOutput.style.color = 'var(--text-color)';
  
  // API Implementation
  const api = {
    Math: Math,
    console: {
      log: (...args) => console.log(...args),
      error: (...args) => console.error(...args)
    },
    clear: () => clearCanvas(),
    fill: (c) => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    },
    circle: (x, y, r, c) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    },
    ring: (x, y, r, t, c) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.lineWidth = t;
      ctx.strokeStyle = c;
      ctx.stroke();
    },
    rectangle: (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    },
    triangle: (x1, y1, x2, y2, x3, y3, c) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
    },
    line: (x1, y1, x2, y2, t, c) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = t;
      ctx.strokeStyle = c;
      ctx.lineCap = 'round';
      ctx.stroke();
    },
    arc: (x, y, r, deg, t, c) => {
      ctx.beginPath();
      // Convert degrees to radians
      const rad = (deg * Math.PI) / 180;
      ctx.arc(x, y, r, 0, rad);
      ctx.lineWidth = t;
      ctx.strokeStyle = c;
      ctx.stroke();
    },
    text: (x, y, s, str, c) => {
      ctx.font = `${s}px Inter, sans-serif`;
      ctx.fillStyle = c;
      ctx.fillText(str, x, y);
    }
  };
  
  try {
    // Create Function
    // Note: "use strict" is line 1. Student code starts at line 2.
    const func = new Function(
      ...Object.keys(api),
      `"use strict";\n${studentCode}`
    );
    
    // Execute
    func(...Object.values(api));
    
    errorOutput.textContent = "Koden kördes utan fel.";
    errorOutput.style.color = 'var(--success-color)';
  } catch (err) {
    // Requirement A: Exact Error Line Detection
    let line = -1;
    
    // Normalize code for analysis (ignore trailing blank lines)
    const lines = studentCode.split('\n');
    let lastNonEmptyIndex = lines.length - 1;
    while (lastNonEmptyIndex >= 0 && lines[lastNonEmptyIndex].trim() === '') {
      lastNonEmptyIndex--;
    }
    
    // Strategy P1: Try Stack Trace (Works well for Runtime Errors)
    if (err.stack) {
        // Match :LINE:COL patterns
        const matches = err.stack.match(/:(\d+):(\d+)/);
        if (matches) {
            // "use strict" is line 1, so student code starts at line 2.
            // Stack line 2 -> Student line 1.
            line = parseInt(matches[1]) - 2;
        }
    }
    
    // Fallback properties
    if (line === -1) {
        if (typeof err.line === 'number') line = err.line - 2;
        else if (typeof err.lineNumber === 'number') line = err.lineNumber - 2;
    }
    
    // Strategy P2: Incremental Compilation (For SyntaxErrors where stack is unreliable)
    // If line is invalid or points to trailing whitespace, and it's a SyntaxError
    if ((line === -1 || line > lastNonEmptyIndex) && err.name === 'SyntaxError') {
        for (let i = 0; i <= lastNonEmptyIndex; i++) {
           const snippet = lines.slice(0, i + 1).join('\n');
           try {
              // Try to compile snippet
              new Function(...Object.keys(api), `"use strict";\n${snippet}`);
           } catch (e) {
              // If error is NOT "Unexpected end of input" (incomplete code), it's a real error on this line
              const eMsg = e.message.toLowerCase();
              // Check for common "incomplete" errors
              if (!eMsg.includes('unexpected end of input') && !eMsg.includes('unexpected token }')) {
                 line = i;
                 break;
              }
           }
        }
        // If we finished loop and still have error (likely EOF), blame the last non-empty line
        if (line === -1) line = lastNonEmptyIndex;
    }
    
    // Final Bounds Check
    if (line < 0) line = 0;
    if (line > lastNonEmptyIndex) line = lastNonEmptyIndex;
    
    // Update UI
    activeErrorLine = line;
    updateHighlighting(code);
    
    // Scroll to error
    const lineHeight = 21;
    codeEditor.scrollTop = line * lineHeight - (codeEditor.clientHeight / 2);
    
    errorOutput.textContent = `Fel på rad ${line + 1}.`;
    errorOutput.style.color = 'var(--danger-color)';
  }
}

// Helper for Levenshtein distance
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

// Start
init();
