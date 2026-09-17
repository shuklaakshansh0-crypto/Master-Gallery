let galleryData = null;
let currentMedium = 'music';

const grid = document.getElementById('gallery-grid');
const navButtons = document.querySelectorAll('.nav-btn');

// Deterministic waveform generator based on track string seed
function generateWaveformBars(seedString, barCount = 42) {
  let hash = 2166136261;
  for (let i = 0; i < seedString.length; i++) {
    hash ^= seedString.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  const bars = [];
  for (let i = 0; i < barCount; i++) {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    
    // Normalized amplitude between 15% and 95%
    const heightPercent = 15 + Math.abs(hash % 81);
    bars.push(`<div class="waveform-bar" style="height: ${heightPercent}%"></div>`);
  }
  return bars.join('');
}

function renderMusicCard(item) {
  const bars = generateWaveformBars(`${item.title}-${item.artist}`);
  return `
    <article class="banner" style="--c1: ${item.color1}; --c2: ${item.color2};">
      <div class="banner-bg"></div>
      <div class="banner-scrim"></div>
      <div class="banner-body">
        <div class="banner-top">
          <img class="media-thumb-square" src="${item.cover}" alt="${item.title}" loading="lazy" onerror="this.style.opacity='0.2'">
          <div class="banner-meta">
            <h2 class="banner-title">${item.title}</h2>
            <p class="banner-sub">${item.artist} · ${item.year}</p>
          </div>
        </div>
        <div class="banner-waveform">${bars}</div>
      </div>
    </article>
  `;
}

function renderCinemaCard(item) {
  return `
    <article class="banner" style="--c1: ${item.color1}; --c2: ${item.color2};">
      <div class="banner-bg"></div>
      <div class="banner-scrim"></div>
      <div class="banner-body">
        <div class="banner-top">
          <img class="media-thumb-wide" src="${item.still}" alt="${item.title}" loading="lazy" onerror="this.style.opacity='0.2'">
          <div class="banner-meta">
            <h2 class="banner-title">${item.title}</h2>
            <p class="banner-sub">${item.director} · ${item.year}</p>
          </div>
        </div>
        <p class="banner-quote">“${item.quote}”</p>
      </div>
    </article>
  `;
}

function renderTVCard(item) {
  return `
    <article class="banner" style="--c1: ${item.color1}; --c2: ${item.color2};">
      <div class="banner-bg"></div>
      <div class="banner-scrim"></div>
      <div class="banner-body">
        <div class="banner-top">
          <img class="media-thumb-wide" src="${item.still}" alt="${item.title}" loading="lazy" onerror="this.style.opacity='0.2'">
          <div class="banner-meta">
            <h2 class="banner-title">${item.title}</h2>
            <p class="banner-sub">${item.creator} · ${item.seasons}</p>
          </div>
        </div>
        <p class="banner-quote">“${item.quote}”</p>
      </div>
    </article>
  `;
}

function renderWall(medium) {
  if (!galleryData || !galleryData[medium]) return;

  grid.classList.add('fading');

  setTimeout(() => {
    let markup = '';
    const items = galleryData[medium];

    if (medium === 'music') {
      markup = items.map(renderMusicCard).join('');
    } else if (medium === 'cinema') {
      markup = items.map(renderCinemaCard).join('');
    } else if (medium === 'tv') {
      markup = items.map(renderTVCard).join('');
    }

    grid.innerHTML = markup;
    grid.classList.remove('fading');
  }, 220);
}

// Navigation Events
navButtons.forEach(button => {
  button.addEventListener('click', () => {
    const medium = button.dataset.medium;
    if (medium === currentMedium) return;

    navButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    currentMedium = medium;
    renderWall(currentMedium);
  });
});

// Initial Data Fetch
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    galleryData = data;
    renderWall(currentMedium);
  })
  .catch(err => {
    console.error('Failed to load gallery data:', err);
    grid.innerHTML = `<p style="grid-column: 2; text-align: center; color: rgba(255,255,255,0.4);">Unable to load exhibition data.</p>`;
  });
