const API = 'https://pokeapi.co/api/v2';
const PAGE_SIZE = 40;

const GEN_RANGES = {
  1: [1, 151], 2: [152, 251], 3: [252, 386], 4: [387, 493],
  5: [494, 649], 6: [650, 721], 7: [722, 809], 8: [810, 905], 9: [906, 1025],
};

// ── State ──────────────────────────────────────────────────────────────────
let allPokemon    = [];
let filtered      = [];
let offset        = 0;
let activeType    = '';
let activeGen     = '';
let searchTerm    = '';
let favoritesOnly = false;
let imageMode     = 'sprite'; // 'artwork' | 'sprite'
let showShiny     = false;

const favorites = new Set(
  JSON.parse(localStorage.getItem('pokedex-favorites') || '[]')
);
function saveFavorites() {
  localStorage.setItem('pokedex-favorites', JSON.stringify([...favorites]));
}
function toggleFavorite(id, btn) {
  if (favorites.has(id)) {
    favorites.delete(id);
    btn.classList.remove('active');
    btn.setAttribute('aria-label', 'Add to favorites');
  } else {
    favorites.add(id);
    btn.classList.add('active');
    btn.setAttribute('aria-label', 'Remove from favorites');
  }
  saveFavorites();
  // If favorites filter is active and we just un-favorited, remove the card
  if (favoritesOnly && !favorites.has(id)) {
    btn.closest('.card').remove();
    if (!grid.querySelector('.card')) applyFilters();
  }
}

// ── DOM refs ───────────────────────────────────────────────────────────────
const grid       = document.getElementById('grid');
const loading    = document.getElementById('loading');
const errorMsg   = document.getElementById('error-msg');
const loadMoreBtn= document.getElementById('load-more');
const searchInput= document.getElementById('search-input');
const searchBtn  = document.getElementById('search-btn');
const typeFilter = document.getElementById('type-filter');
const genFilter  = document.getElementById('gen-filter');
const favFilter       = document.getElementById('fav-filter');
const imageModeSelect = document.getElementById('image-mode');
const shinyToggle     = document.getElementById('shiny-toggle');
const modal      = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const modalBody  = document.getElementById('modal-body');

// ── Helpers ────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(3, '0');
const idFromUrl = url => parseInt(url.split('/').filter(Boolean).pop(), 10);

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function showLoading(on) {
  loading.classList.toggle('hidden', !on);
}
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}
function clearError() {
  errorMsg.classList.add('hidden');
}

// Returns all four sprite URLs for a pokemon sprites object
function spriteUrls(sprites) {
  const artDefault = sprites.other?.['official-artwork']?.front_default || sprites.front_default || '';
  const artShiny   = sprites.other?.['official-artwork']?.front_shiny   || sprites.front_shiny   || artDefault;
  const sprDefault = sprites.front_default || '';
  const sprShiny   = sprites.front_shiny   || sprDefault;
  return { artDefault, artShiny, sprDefault, sprShiny };
}

// Picks the right URL from a spriteUrls() object given current state
function pickSprite({ artDefault, artShiny, sprDefault, sprShiny }) {
  if (imageMode === 'artwork') return showShiny ? artShiny : artDefault;
  return showShiny ? sprShiny : sprDefault;
}

// Swaps all sprite-aware images to match current imageMode / showShiny
function updateCardImages() {
  document.querySelectorAll('img[data-art-default]').forEach(img => {
    const urls = {
      artDefault: img.dataset.artDefault,
      artShiny:   img.dataset.artShiny,
      sprDefault: img.dataset.sprDefault,
      sprShiny:   img.dataset.sprShiny,
    };
    const newSrc = pickSprite(urls);
    if (img.src === newSrc) return;
    img.style.opacity = '0';
    img.src = newSrc;
    img.onload = img.onerror = () => { img.style.opacity = '1'; };
  });
}

function typeBadge(type) {
  return `<span class="type-badge type-${type}">${type}</span>`;
}

function statLabel(key) {
  const map = { hp:'HP', attack:'ATK', defense:'DEF',
    'special-attack':'Sp.ATK', 'special-defense':'Sp.DEF', speed:'SPD' };
  return map[key] || key;
}

function statColor(val) {
  if (val >= 100) return '#4caf50';
  if (val >= 70)  return '#8bc34a';
  if (val >= 50)  return '#ffc107';
  return '#e3350d';
}

// ── Boot ───────────────────────────────────────────────────────────────────
async function init() {
  showLoading(true);
  try {
    const data = await fetchJson(`${API}/pokemon?limit=10000`);
    allPokemon = data.results.map((p, i) => ({ ...p, id: idFromUrl(p.url) }));
    await populateTypeFilter();
    applyFilters();
  } catch (e) {
    showError('Could not connect to PokéAPI. Check your internet connection.');
  } finally {
    showLoading(false);
  }
}

async function populateTypeFilter() {
  const data = await fetchJson(`${API}/type?limit=100`);
  data.results.forEach(t => {
    if (['unknown','shadow'].includes(t.name)) return;
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.name.charAt(0).toUpperCase() + t.name.slice(1);
    typeFilter.appendChild(opt);
  });
}

// ── Filtering ──────────────────────────────────────────────────────────────
async function applyFilters() {
  clearError();
  grid.innerHTML = '';
  offset = 0;

  showLoading(true);
  try {
    let list = allPokemon;

    if (activeType) {
      const data = await fetchJson(`${API}/type/${activeType}`);
      const typeIds = new Set(
        data.pokemon
          .map(e => idFromUrl(e.pokemon.url))
          .filter(id => id <= 10000)
      );
      list = list.filter(p => typeIds.has(p.id));
    }

    if (activeGen) {
      const [lo, hi] = GEN_RANGES[activeGen];
      list = list.filter(p => p.id >= lo && p.id <= hi);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const asNum = parseInt(q, 10);
      list = list.filter(p => p.name.includes(q) || p.id === asNum);
    }

    if (favoritesOnly) {
      list = list.filter(p => favorites.has(p.id));
    }

    filtered = list;
  } catch (e) {
    showError('Failed to apply filters.');
    showLoading(false);
    return;
  }
  showLoading(false);

  renderPage();
}

async function renderPage() {
  if (filtered.length === 0) {
    showError('No Pokémon found matching those filters.');
    loadMoreBtn.classList.add('hidden');
    return;
  }

  showLoading(true);
  const slice = filtered.slice(offset, offset + PAGE_SIZE);

  const cards = await Promise.allSettled(
    slice.map(p => fetchJson(p.url))
  );

  for (const result of cards) {
    if (result.status !== 'fulfilled') continue;
    grid.appendChild(buildCard(result.value));
  }

  offset += PAGE_SIZE;

  loadMoreBtn.classList.toggle('hidden', offset >= filtered.length);
  showLoading(false);
}

function buildCard(pokemon) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = pokemon.id;

  const urls  = spriteUrls(pokemon.sprites);
  const sprite = pickSprite(urls);
  const types  = pokemon.types.map(t => typeBadge(t.type.name)).join('');

  const isFav = favorites.has(pokemon.id);
  card.innerHTML = `
    <button class="fav-btn ${isFav ? 'active' : ''}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">♥</button>
    <div class="card-num">#${pad(pokemon.id)}</div>
    <img src="${sprite}" alt="${pokemon.name}" loading="lazy"
      data-art-default="${urls.artDefault}"
      data-art-shiny="${urls.artShiny}"
      data-spr-default="${urls.sprDefault}"
      data-spr-shiny="${urls.sprShiny}" />
    <div class="card-name">${pokemon.name}</div>
    <div class="types">${types}</div>
  `;

  card.querySelector('.fav-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(pokemon.id, e.currentTarget);
  });
  card.addEventListener('click', () => openDetail(pokemon.id));
  return card;
}

// ── Detail modal ───────────────────────────────────────────────────────────
async function openDetail(id) {
  modal.classList.remove('hidden');
  modalBody.innerHTML = `<div class="loading" style="min-height:200px"><div class="pokeball-spinner"></div><p>Loading…</p></div>`;

  try {
    const [pokemon, species] = await Promise.all([
      fetchJson(`${API}/pokemon/${id}`),
      fetchJson(`${API}/pokemon-species/${id}`),
    ]);

    const evoChain = await buildEvoChain(species.evolution_chain.url);
    modalBody.innerHTML = buildDetail(pokemon, species, evoChain);

    // wire evo clicks
    modalBody.querySelectorAll('.evo-mon').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.id));
    });

    // wire modal fav button
    const modalFavBtn = modalBody.querySelector('.detail-fav-btn');
    modalFavBtn.addEventListener('click', () => {
      const pid = parseInt(modalFavBtn.dataset.id, 10);
      toggleFavorite(pid, modalFavBtn);
      // sync the matching card in the grid if visible
      const cardBtn = grid.querySelector(`.card[data-id="${pid}"] .fav-btn`);
      if (cardBtn) {
        cardBtn.classList.toggle('active', favorites.has(pid));
        cardBtn.setAttribute('aria-label', favorites.has(pid) ? 'Remove from favorites' : 'Add to favorites');
      }
    });
  } catch (e) {
    modalBody.innerHTML = `<p class="error">Failed to load Pokémon details.</p>`;
  }
}

function buildDetail(pokemon, species, evoChain) {
  const urls   = spriteUrls(pokemon.sprites);
  const sprite = pickSprite(urls);

  const types = pokemon.types.map(t => typeBadge(t.type.name)).join('');

  const flavour = species.flavor_text_entries
    .find(e => e.language.name === 'en')
    ?.flavor_text.replace(/\f|\n/g, ' ') || '';

  const stats = pokemon.stats.map(s => {
    const pct = Math.min((s.base_stat / 255) * 100, 100).toFixed(1);
    return `
      <div class="stat-row">
        <span class="stat-label">${statLabel(s.stat.name)}</span>
        <span class="stat-val">${s.base_stat}</span>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width:${pct}%;background:${statColor(s.base_stat)}"></div>
        </div>
      </div>`;
  }).join('');

  const abilities = pokemon.abilities.map(a => `
    <span class="ability-pill ${a.is_hidden ? 'hidden-ability' : ''}" title="${a.is_hidden ? 'Hidden ability' : ''}">
      ${a.ability.name}${a.is_hidden ? ' ★' : ''}
    </span>`).join('');

  const genus = species.genera.find(g => g.language.name === 'en')?.genus || '';
  const isFav = favorites.has(pokemon.id);

  return `
    <div class="detail-header">
      <button class="fav-btn detail-fav-btn ${isFav ? 'active' : ''}"
        data-id="${pokemon.id}"
        aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">♥</button>
      <div class="detail-num">#${pad(pokemon.id)} · ${genus}</div>
      <div class="detail-name">${pokemon.name}</div>
      <img class="detail-img" src="${sprite}" alt="${pokemon.name}"
        data-art-default="${urls.artDefault}"
        data-art-shiny="${urls.artShiny}"
        data-spr-default="${urls.sprDefault}"
        data-spr-shiny="${urls.sprShiny}" />
      <div class="types detail-types">${types}</div>
    </div>

    ${flavour ? `<div class="detail-section"><p class="flavour-text">${flavour}</p></div>` : ''}

    <div class="detail-section">
      <h3>Info</h3>
      <div class="info-grid">
        <div class="info-item"><label>Height</label><span>${(pokemon.height / 10).toFixed(1)} m</span></div>
        <div class="info-item"><label>Weight</label><span>${(pokemon.weight / 10).toFixed(1)} kg</span></div>
        <div class="info-item"><label>Base Exp</label><span>${pokemon.base_experience ?? '—'}</span></div>
        <div class="info-item"><label>Capture Rate</label><span>${species.capture_rate}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Base Stats</h3>
      ${stats}
    </div>

    <div class="detail-section">
      <h3>Abilities</h3>
      <div class="ability-list">${abilities}</div>
    </div>

    ${evoChain ? `<div class="detail-section"><h3>Evolution Chain</h3><div class="evo-chain">${evoChain}</div></div>` : ''}
  `;
}

async function buildEvoChain(url) {
  try {
    const data = await fetchJson(url);
    const steps = [];
    let node = data.chain;

    while (node) {
      const id = idFromUrl(node.species.url);
      const sprite = await getSpriteById(id);
      steps.push({ id, name: node.species.name, sprite });
      node = node.evolves_to?.[0];
    }

    if (steps.length <= 1) return '';

    return steps.map((s, i) => `
      <div class="evo-step">
        ${i > 0 ? '<span class="evo-arrow">→</span>' : ''}
        <div class="evo-mon" data-id="${s.id}">
          <img src="${s.sprite}" alt="${s.name}" />
          <span>${s.name}</span>
        </div>
      </div>`).join('');
  } catch {
    return '';
  }
}

// lightweight sprite cache
const spriteCache = {};
async function getSpriteById(id) {
  if (spriteCache[id]) return spriteCache[id];
  const p = await fetchJson(`${API}/pokemon/${id}`);
  const url = p.sprites.front_default || '';
  spriteCache[id] = url;
  return url;
}

// ── Events ─────────────────────────────────────────────────────────────────
searchBtn.addEventListener('click', () => {
  searchTerm = searchInput.value.trim();
  applyFilters();
});
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchBtn.click();
});

typeFilter.addEventListener('change', () => {
  activeType = typeFilter.value;
  applyFilters();
});
genFilter.addEventListener('change', () => {
  activeGen = genFilter.value;
  applyFilters();
});
favFilter.addEventListener('change', () => {
  favoritesOnly = favFilter.value === 'favorites';
  applyFilters();
});
imageModeSelect.addEventListener('change', () => {
  imageMode = imageModeSelect.value;
  updateCardImages();
});
shinyToggle.addEventListener('change', () => {
  showShiny = shinyToggle.checked;
  if (showShiny) burstStars(shinyToggle);
  requestAnimationFrame(updateCardImages);
});

function burstStars(originEl) {
  const rect = originEl.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;

  // Screen flash
  const flash = document.createElement('div');
  flash.className = 'screen-flash';
  flash.style.cssText = `--ox:${cx}px; --oy:${cy}px;`;
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove(), { once: true });

  // Shockwave ring
  const wave = document.createElement('div');
  wave.className = 'shockwave';
  wave.style.cssText = `left:${cx}px; top:${cy}px; width:30px; height:30px;`;
  document.body.appendChild(wave);
  wave.addEventListener('animationend', () => wave.remove(), { once: true });

  // Label flash
  const label = shinyToggle.closest('.shiny-label');
  label.classList.remove('flash');
  requestAnimationFrame(() => label.classList.add('flash'));
  label.addEventListener('animationend', () => label.classList.remove('flash'), { once: true });
}

loadMoreBtn.addEventListener('click', renderPage);

modalClose.addEventListener('click', closeModal);
modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function closeModal() {
  modal.classList.add('hidden');
  modalBody.innerHTML = '';
}

// ── Go ─────────────────────────────────────────────────────────────────────
init();
