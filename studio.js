const REPO_OWNER = 'shuklaakshansh0-crypto';
const REPO_NAME = 'Master-Gallery';

let currentToken = localStorage.getItem('gallery_token') || '';
let activeColorSlot = 1;
let color1 = '#1e3a5f';
let color2 = '#0d1b2a';
let processedWebPBlob = null;
let currentDb = null;
let hasUnsavedOrder = false;

// UI References
const gateScreen = document.getElementById('gate-screen');
const workbench = document.getElementById('workbench');
const tokenInput = document.getElementById('token-input');
const saveTokenBtn = document.getElementById('save-token-btn');
const logoutBtn = document.getElementById('logout-btn');

const mediumSelect = document.getElementById('entry-medium');
const labelSec = document.getElementById('label-secondary');
const labelTert = document.getElementById('label-tertiary');
const quoteGroup = document.getElementById('quote-group');
const labelFile = document.getElementById('label-file');

const fileInput = document.getElementById('entry-file');
const canvas = document.getElementById('pick-canvas');
const ctx = canvas.getContext('2d');
const btnPickC1 = document.getElementById('btn-pick-c1');
const btnPickC2 = document.getElementById('btn-pick-c2');
const circleC1 = document.getElementById('circle-c1');
const circleC2 = document.getElementById('circle-c2');
const gradientPreview = document.getElementById('gradient-preview');

const publishBtn = document.getElementById('publish-btn');
const statusBar = document.getElementById('status-bar');

const manageSelect = document.getElementById('manage-medium');
const manageList = document.getElementById('manage-list');
const saveOrderBtn = document.getElementById('save-order-btn');
const reorderStatus = document.getElementById('reorder-status');

// Check Initial Auth State
if (currentToken) {
  gateScreen.style.display = 'none';
  workbench.style.display = 'block';
  loadDatabase();
}

saveTokenBtn.addEventListener('click', () => {
  const val = tokenInput.value.trim();
  if (!val) return;
  localStorage.setItem('gallery_token', val);
  currentToken = val;
  gateScreen.style.display = 'none';
  workbench.style.display = 'block';
  loadDatabase();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('gallery_token');
  location.reload();
});

// Tab Switcher
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-create').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('tab-manage').style.display = tab === 'manage' ? 'block' : 'none';
    if (tab === 'manage') renderManageList();
  });
});

// Dynamic Schema Labels
mediumSelect.addEventListener('change', () => {
  const m = mediumSelect.value;
  if (m === 'music') {
    labelSec.textContent = 'Artist';
    labelTert.textContent = 'Release Year';
    labelFile.textContent = 'Artwork (1:1 Square recommended)';
    quoteGroup.style.display = 'none';
  } else if (m === 'cinema') {
    labelSec.textContent = 'Director';
    labelTert.textContent = 'Release Year';
    labelFile.textContent = 'Cinematic Still (16:9 Widescreen recommended)';
    quoteGroup.style.display = 'block';
  } else if (m === 'tv') {
    labelSec.textContent = 'Creator';
    labelTert.textContent = 'Season Count (e.g., 4 Seasons)';
    labelFile.textContent = 'Series Still (16:9 Widescreen recommended)';
    quoteGroup.style.display = 'block';
  }
});

// Manual Color Slot Selector (No Auto-Switch)
btnPickC1.addEventListener('click', () => {
  activeColorSlot = 1;
  btnPickC1.classList.add('active');
  btnPickC2.classList.remove('active');
});

btnPickC2.addEventListener('click', () => {
  activeColorSlot = 2;
  btnPickC2.classList.add('active');
  btnPickC1.classList.remove('active');
});

function updatePreview() {
  circleC1.style.background = color1;
  circleC2.style.background = color2;
  gradientPreview.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
}
updatePreview();

// Canvas Loader and WebP Processing
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    const isMusic = mediumSelect.value === 'music';
    const targetW = isMusic ? 400 : 640;
    const targetH = isMusic ? 400 : 360;

    canvas.width = targetW;
    canvas.height = targetH;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    canvas.style.display = 'inline-block';
    document.getElementById('canvas-hint').textContent = 'Tap to sample color into whichever slot is selected above.';

    canvas.toBlob((blob) => {
      processedWebPBlob = blob;
    }, 'image/webp', 0.85);
  };
  img.src = URL.createObjectURL(file);
});

// Manual Eyedropper Tap: Stays strictly on the selected slot
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const pixel = ctx.getImageData(x, y, 1, 1).data;
  const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);

  if (activeColorSlot === 1) {
    color1 = hex;
  } else {
    color2 = hex;
  }
  updatePreview();
});

// Database Fetch
async function loadDatabase() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data.json`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('Could not load data.json');
    const json = await res.json();
    currentDb = JSON.parse(decodeURIComponent(escape(atob(json.content))));
  } catch (err) {
    console.error(err);
    statusBar.textContent = 'Failed to load repository data. Please verify your token permissions.';
  }
}

async function getLatestSha() {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data.json`, {
    headers: { Authorization: `Bearer ${currentToken}` }
  });
  if (!res.ok) throw new Error('Failed to retrieve file SHA');
  const json = await res.json();
  return json.sha;
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

// Publish New Entry
publishBtn.addEventListener('click', async () => {
  const title = document.getElementById('entry-title').value.trim();
  const secondary = document.getElementById('entry-secondary').value.trim();
  const tertiary = document.getElementById('entry-tertiary').value.trim();
  const quote = document.getElementById('entry-quote').value.trim();
  const medium = mediumSelect.value;

  if (!title || !secondary || !tertiary || !processedWebPBlob) {
    alert('Please complete all fields and select an artwork image.');
    return;
  }

  publishBtn.disabled = true;
  statusBar.textContent = 'Optimizing image asset and committing to repository...';

  try {
    await loadDatabase();

    const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 24);
    const filename = `${slug}-${Date.now()}.webp`;
    const imagePath = `assets/${medium}/${filename}`;
    const base64Data = await blobToBase64(processedWebPBlob);

    // Commit WebP Asset
    const imgRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${imagePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add ${medium} asset: ${title}`,
        content: base64Data
      })
    });

    if (!imgRes.ok) throw new Error('Failed to upload image asset');

    // Add entry to beginning of medium array
    const newEntry = {
      id: `${medium[0]}${Date.now()}`,
      title,
      color1,
      color2
    };

    if (medium === 'music') {
      newEntry.artist = secondary;
      newEntry.year = parseInt(tertiary, 10) || tertiary;
      newEntry.cover = imagePath;
    } else if (medium === 'cinema') {
      newEntry.director = secondary;
      newEntry.year = parseInt(tertiary, 10) || tertiary;
      newEntry.still = imagePath;
      newEntry.quote = quote;
    } else {
      newEntry.creator = secondary;
      newEntry.seasons = tertiary;
      newEntry.still = imagePath;
      newEntry.quote = quote;
    }

    currentDb[medium].unshift(newEntry);

    const sha = await getLatestSha();
    const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(currentDb, null, 2))));
    const dbRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Curate ${title} to ${medium}`,
        content: updatedContent,
        sha: sha
      })
    });

    if (!dbRes.ok) throw new Error('Failed to update data.json');

    statusBar.textContent = 'Published successfully. Live in ~60s.';
    document.getElementById('entry-title').value = '';
    document.getElementById('entry-secondary').value = '';
    document.getElementById('entry-tertiary').value = '';
    document.getElementById('entry-quote').value = '';
    canvas.style.display = 'none';
  } catch (err) {
    console.error(err);
    statusBar.textContent = 'Publish failed: ' + err.message;
  } finally {
    publishBtn.disabled = false;
  }
});

// Manage & Reorder Engine
manageSelect.addEventListener('change', () => {
  hasUnsavedOrder = false;
  saveOrderBtn.disabled = true;
  reorderStatus.textContent = '';
  renderManageList();
});

let draggedItemIndex = null;

function renderManageList() {
  if (!currentDb) return;
  const medium = manageSelect.value;
  const items = currentDb[medium];

  manageList.innerHTML = items.map((item, index) => `
    <div class="item-row" draggable="true" data-index="${index}">
      <div class="item-meta">
        <span class="drag-handle">⋮⋮</span>
        <img class="item-thumb" src="${item.cover || item.still}">
        <div>
          <strong style="font-size: 0.9rem;">${item.title}</strong>
          <p style="font-size: 0.75rem; color: var(--sub);">${item.artist || item.director || item.creator} (${item.year || item.seasons})</p>
        </div>
      </div>
      <div class="action-btns">
        <button type="button" onclick="shiftPosition('${medium}', ${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move Up">↑</button>
        <button type="button" onclick="shiftPosition('${medium}', ${index}, 1)" ${index === items.length - 1 ? 'disabled' : ''} title="Move Down">↓</button>
        <button type="button" class="del" onclick="deleteEntry('${medium}', ${index})" title="Delete">✕</button>
      </div>
    </div>
  `).join('');

  attachDragAndDrop();
}

function attachDragAndDrop() {
  const rows = manageList.querySelectorAll('.item-row');
  rows.forEach(row => {
    row.addEventListener('dragstart', (e) => {
      draggedItemIndex = parseInt(row.dataset.index, 10);
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      rows.forEach(r => r.classList.remove('drag-over'));
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('drag-over');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over');
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const targetIndex = parseInt(row.dataset.index, 10);
      if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

      const medium = manageSelect.value;
      const movedItem = currentDb[medium].splice(draggedItemIndex, 1)[0];
      currentDb[medium].splice(targetIndex, 0, movedItem);

      markOrderChanged();
      renderManageList();
    });
  });
}

// Instant Local Array Shift: Up moves toward index 0 (top/start)
window.shiftPosition = (medium, index, direction) => {
  const target = index + direction;
  if (target < 0 || target >= currentDb[medium].length) return;

  const temp = currentDb[medium][index];
  currentDb[medium][index] = currentDb[medium][target];
  currentDb[medium][target] = temp;

  markOrderChanged();
  renderManageList();
};

function markOrderChanged() {
  hasUnsavedOrder = true;
  saveOrderBtn.disabled = false;
  reorderStatus.textContent = 'Unsaved layout changes';
}

// Single Clean Commit for Order
saveOrderBtn.addEventListener('click', async () => {
  if (!hasUnsavedOrder) return;

  saveOrderBtn.disabled = true;
  reorderStatus.textContent = 'Saving sequence to GitHub...';

  try {
    const sha = await getLatestSha();
    const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(currentDb, null, 2))));

    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update ${manageSelect.value} wall sequence`,
        content: updatedContent,
        sha: sha
      })
    });

    if (!res.ok) throw new Error('Failed to commit new order');

    hasUnsavedOrder = false;
    reorderStatus.textContent = 'Sequence saved. Live in ~60s.';
    setTimeout(() => { reorderStatus.textContent = ''; }, 4000);
  } catch (err) {
    console.error(err);
    reorderStatus.textContent = 'Save failed: ' + err.message;
    saveOrderBtn.disabled = false;
  }
});

// Delete Entry
window.deleteEntry = async (medium, index) => {
  const item = currentDb[medium][index];
  if (!confirm(`Delete "${item.title}" from the wall?`)) return;

  currentDb[medium].splice(index, 1);
  renderManageList();
  reorderStatus.textContent = 'Deleting from repository...';

  try {
    const sha = await getLatestSha();
    const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(currentDb, null, 2))));
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Delete ${item.title} from ${medium}`,
        content: updatedContent,
        sha: sha
      })
    });

    if (!res.ok) throw new Error('Failed to delete item');
    reorderStatus.textContent = 'Item removed successfully.';
    setTimeout(() => { reorderStatus.textContent = ''; }, 3000);
  } catch (err) {
    alert('Delete failed: ' + err.message);
    reorderStatus.textContent = '';
  }
};
// Check Initial Auth State
if (currentToken) {
  gateScreen.style.display = 'none';
  workbench.style.display = 'block';
  loadDatabase();
}

saveTokenBtn.addEventListener('click', () => {
  const val = tokenInput.value.trim();
  if (!val) return;
  localStorage.setItem('gallery_token', val);
  currentToken = val;
  gateScreen.style.display = 'none';
  workbench.style.display = 'block';
  loadDatabase();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('gallery_token');
  location.reload();
});

// Tab Switcher
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-create').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('tab-manage').style.display = tab === 'manage' ? 'block' : 'none';
    if (tab === 'manage') renderManageList();
  });
});

// Dynamic Schema Switching
mediumSelect.addEventListener('change', () => {
  const m = mediumSelect.value;
  if (m === 'music') {
    labelSec.textContent = 'Artist';
    labelTert.textContent = 'Release Year';
    labelFile.textContent = 'Artwork (1:1 Square recommended)';
    quoteGroup.style.display = 'none';
  } else if (m === 'cinema') {
    labelSec.textContent = 'Director';
    labelTert.textContent = 'Release Year';
    labelFile.textContent = 'Cinematic Still (16:9 Widescreen recommended)';
    quoteGroup.style.display = 'block';
  } else if (m === 'tv') {
    labelSec.textContent = 'Creator';
    labelTert.textContent = 'Season Count (e.g., 4 Seasons)';
    labelFile.textContent = 'Series Still (16:9 Widescreen recommended)';
    quoteGroup.style.display = 'block';
  }
});

// Canvas Eyedropper Selection
btnPickC1.addEventListener('click', () => {
  activeColorSlot = 1;
  btnPickC1.classList.add('active');
  btnPickC2.classList.remove('active');
});

btnPickC2.addEventListener('click', () => {
  activeColorSlot = 2;
  btnPickC2.classList.add('active');
  btnPickC1.classList.remove('active');
});

function updatePreview() {
  circleC1.style.background = color1;
  circleC2.style.background = color2;
  gradientPreview.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
}
updatePreview();

// In-Browser Image Compressor & Canvas Loader
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    const isMusic = mediumSelect.value === 'music';
    const targetW = isMusic ? 400 : 640;
    const targetH = isMusic ? 400 : 360;

    canvas.width = targetW;
    canvas.height = targetH;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    canvas.style.display = 'inline-block';
    document.getElementById('canvas-hint').textContent = 'Tap anywhere on the image to sample Color ' + activeColorSlot;

    canvas.toBlob((blob) => {
      processedWebPBlob = blob;
    }, 'image/webp', 0.85);
  };
  img.src = URL.createObjectURL(file);
});

// Eyedropper Pixel Tap
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const pixel = ctx.getImageData(x, y, 1, 1).data;
  const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);

  if (activeColorSlot === 1) {
    color1 = hex;
    activeColorSlot = 2;
    btnPickC2.classList.add('active');
    btnPickC1.classList.remove('active');
  } else {
    color2 = hex;
    activeColorSlot = 1;
    btnPickC1.classList.add('active');
    btnPickC2.classList.remove('active');
  }
  updatePreview();
});

// GitHub API: Load Data & SHA
async function loadDatabase() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data.json`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('Could not load data.json');
    const json = await res.json();
    currentDbSha = json.sha;
    currentDb = JSON.parse(decodeURIComponent(escape(atob(json.content))));
  } catch (err) {
    console.error(err);
    statusBar.textContent = 'Failed to connect with GitHub token. Please verify token permissions.';
  }
}

// Convert Blob to Base64
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

// Publish New Entry
publishBtn.addEventListener('click', async () => {
  const title = document.getElementById('entry-title').value.trim();
  const secondary = document.getElementById('entry-secondary').value.trim();
  const tertiary = document.getElementById('entry-tertiary').value.trim();
  const quote = document.getElementById('entry-quote').value.trim();
  const medium = mediumSelect.value;

  if (!title || !secondary || !tertiary || !processedWebPBlob) {
    alert('Please fill all fields and upload an image.');
    return;
  }

  publishBtn.disabled = true;
  statusBar.textContent = 'Optimizing image and committing to repository...';

  try {
    await loadDatabase();

    const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 24);
    const filename = `${slug}-${Date.now()}.webp`;
    const imagePath = `assets/${medium}/${filename}`;
    const base64Data = await blobToBase64(processedWebPBlob);

    // 1. Commit WebP image file
    const imgRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${imagePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add ${medium} asset: ${title}`,
        content: base64Data
      })
    });

    if (!imgRes.ok) throw new Error('Failed to commit image asset');

    // 2. Build entry structure
    const newEntry = {
      id: `${medium[0]}${Date.now()}`,
      title,
      color1,
      color2
    };

    if (medium === 'music') {
      newEntry.artist = secondary;
      newEntry.year = parseInt(tertiary, 10) || tertiary;
      newEntry.cover = imagePath;
    } else if (medium === 'cinema') {
      newEntry.director = secondary;
      newEntry.year = parseInt(tertiary, 10) || tertiary;
      newEntry.still = imagePath;
      newEntry.quote = quote;
    } else {
      newEntry.creator = secondary;
      newEntry.seasons = tertiary;
      newEntry.still = imagePath;
      newEntry.quote = quote;
    }

    currentDb[medium].unshift(newEntry);

    // 3. Commit updated data.json
    const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(currentDb, null, 2))));
    const dbRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Curate ${title} to ${medium}`,
        content: updatedContent,
        sha: currentDbSha
      })
    });

    if (!dbRes.ok) throw new Error('Failed to update data.json');

    statusBar.textContent = 'Published successfully! Changes will be live in ~60s.';
    document.getElementById('entry-title').value = '';
    document.getElementById('entry-secondary').value = '';
    document.getElementById('entry-tertiary').value = '';
    document.getElementById('entry-quote').value = '';
    canvas.style.display = 'none';
  } catch (err) {
    console.error(err);
    statusBar.textContent = 'Error publishing entry: ' + err.message;
  } finally {
    publishBtn.disabled = false;
  }
});

// Manage & Reorder List Renderer
const manageSelect = document.getElementById('manage-medium');
manageSelect.addEventListener('change', renderManageList);

function renderManageList() {
  if (!currentDb) return;
  const medium = manageSelect.value;
  const list = document.getElementById('manage-list');
  const items = currentDb[medium];

  list.innerHTML = items.map((item, index) => `
    <div class="item-row">
      <div class="item-meta">
        <img class="item-thumb" src="${item.cover || item.still}">
        <div>
          <strong style="font-size: 0.9rem;">${item.title}</strong>
          <p style="font-size: 0.75rem; color: var(--sub);">${item.artist || item.director || item.creator}</p>
        </div>
      </div>
      <div class="action-btns">
        <button onclick="moveCard('${medium}', ${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button onclick="moveCard('${medium}', ${index}, 1)" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="del" onclick="deleteCard('${medium}', ${index})">✕</button>
      </div>
    </div>
  `).join('');
}

// Global Move Card Order
window.moveCard = async (medium, index, direction) => {
  const target = index + direction;
  if (target < 0 || target >= currentDb[medium].length) return;
  
  const temp = currentDb[medium][index];
  currentDb[medium][index] = currentDb[medium][target];
  currentDb[medium][target] = temp;

  renderManageList();
  await commitDbUpdate(`Reorder ${medium} wall sequence`);
};

// Global Delete Card
window.deleteCard = async (medium, index) => {
  if (!confirm(`Delete "${currentDb[medium][index].title}" from ${medium}?`)) return;
  currentDb[medium].splice(index, 1);
  renderManageList();
  await commitDbUpdate(`Remove item from ${medium}`);
};

async function commitDbUpdate(commitMessage) {
  try {
    await loadDatabase();
    const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(currentDb, null, 2))));
    await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: updatedContent,
        sha: currentDbSha
      })
    });
  } catch (err) {
    alert('Failed to save changes: ' + err.message);
  }
}

