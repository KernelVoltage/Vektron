let allGames = [];
let selectedCategory = 'All';

// DOM Elements Selection
const gameGrid = document.getElementById('gameGrid');
const recommendationsList = document.getElementById('recommendationsList');
const categorySidebar = document.getElementById('categorySidebar');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const gridTitle = document.getElementById('gridTitle');

const playerContainer = document.getElementById('playerContainer');
const gameFrame = document.getElementById('gameFrame');
const gameLoader = document.getElementById('gameLoader');
const loaderThumb = document.getElementById('loaderThumb');
const loaderTitle = document.getElementById('loaderTitle');
const loaderBackdrop = document.getElementById('loaderBackdrop');
const progressBar = document.getElementById('progressBar');
const activeGameTitle = document.getElementById('activeGameTitle');
const closeGameBtn = document.getElementById('closeGameBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// 1. Fetch Data from Master Storage / LocalStorage (Synced with Admin Panel)
async function loadPortalData() {
  try {
    let savedGames = JSON.parse(localStorage.getItem('vektron_master_games'));
    
    if (!savedGames || savedGames.length === 0) {
      const response = await fetch('games.json');
      if (response.ok) {
        allGames = await response.json();
        localStorage.setItem('vektron_master_games', JSON.stringify(allGames));
      }
    } else {
      allGames = savedGames;
    }

    if (!allGames || allGames.length === 0) {
      if (gameGrid) {
        gameGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No games found. Add some games from the studio dashboard.</p>';
      }
      return;
    }

    buildCategorySidebar();
    renderGames();
    renderRecommendations();

    // URL play parameter check
    const urlParams = new URLSearchParams(window.location.search);
    const playTitle = urlParams.get('play');
    if (playTitle) {
      const targetGame = allGames.find(g => g.title && g.title.toLowerCase() === decodeURIComponent(playTitle).toLowerCase());
      if (targetGame) {
        launchGame(targetGame);
      }
    }

  } catch (err) {
    console.error("Error loading portal data:", err);
    if (gameGrid) {
      gameGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">Failed to load games data.</p>`;
    }
  }
}

// 2. Dynamic Category Sidebar Generator (Smart Case Normalization to avoid duplicates like Action/action)
function buildCategorySidebar() {
  if (!categorySidebar) return;
  categorySidebar.innerHTML = '';
  
  const rawCategories = allGames.map(g => g.category).filter(Boolean);
  const categoryMap = new Map();
  
  rawCategories.forEach(cat => {
    const trimmed = cat.trim();
    const lower = trimmed.toLowerCase();
    if (!categoryMap.has(lower)) {
      categoryMap.set(lower, trimmed);
    }
  });

  const categories = ['All', ...categoryMap.values()];
  const fragment = document.createDocumentFragment();

  categories.forEach(cat => {
    const btn = document.createElement('button');
    const isActive = cat.toLowerCase() === selectedCategory.toLowerCase();
    btn.className = `cat-btn ${isActive ? 'active' : ''}`;
    btn.textContent = cat;
    
    btn.addEventListener('click', () => {
      selectedCategory = cat;
      categorySidebar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (gridTitle) {
        gridTitle.textContent = cat === 'All' ? 'All Arcade Games' : `${cat} Games`;
      }

      if (playerContainer) playerContainer.classList.add('hidden');
      if (gameFrame) gameFrame.src = '';

      renderGames();
    });

    fragment.appendChild(btn);
  });

  categorySidebar.appendChild(fragment);
}

// 3. Dynamic Grid Renderer (Smart Case-Insensitive Filter & Search)
function renderGames() {
  if (!gameGrid || !searchInput) return;
  gameGrid.innerHTML = '';
  
  const query = searchInput.value.toLowerCase().trim();
  
  if (query.length > 0) {
    if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
    if (playerContainer) playerContainer.classList.add('hidden');
    if (gameFrame) gameFrame.src = '';
  } else {
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
  }

  const filtered = allGames.filter(game => {
    const gameCat = (game.category || '').trim().toLowerCase();
    const matchesCategory = selectedCategory === 'All' || gameCat === selectedCategory.toLowerCase();
    const matchesSearch = (game.title && game.title.toLowerCase().includes(query)) || 
                          (game.category && game.category.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    gameGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px;">No games found matching your search.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  filtered.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${game.thumbnail || ''}" alt="${game.title || 'Game'}" loading="lazy">
      </div>
      <div class="card-info">
        <h4>${game.title || 'Untitled'}</h4>
        <span class="card-tag">${game.category || 'Arcade'}</span>
      </div>
    `;
    card.addEventListener('click', () => launchGame(game));
    fragment.appendChild(card);
  });

  gameGrid.appendChild(fragment);
}

// 4. Up Next Recommendation Panel
function renderRecommendations() {
  if (!recommendationsList) return;
  recommendationsList.innerHTML = '';
  
  const fragment = document.createDocumentFragment();

  allGames.forEach(game => {
    const item = document.createElement('div');
    item.className = 'mini-card';
    item.innerHTML = `
      <img src="${game.thumbnail || ''}" alt="${game.title || 'Game'}" loading="lazy">
      <div>
        <h4>${game.title || 'Untitled'}</h4>
        <span style="font-size: 0.68rem; color: var(--accent-cyan); font-weight: 600;">${game.category || 'Arcade'}</span>
      </div>
    `;
    item.addEventListener('click', () => launchGame(game));
    fragment.appendChild(item);
  });

  recommendationsList.appendChild(fragment);
}

// 5. Game Launcher & Screen Transition
function launchGame(game) {
  if (!game.embedUrl) {
    alert("This game does not have a valid embed URL!");
    return;
  }

  if (playerContainer) playerContainer.classList.remove('hidden');
  if (gameLoader) gameLoader.classList.remove('hidden');
  
  if (loaderThumb) loaderThumb.src = game.thumbnail || '';
  if (loaderTitle) loaderTitle.textContent = game.title || 'Loading Game...';
  if (loaderBackdrop) loaderBackdrop.style.backgroundImage = `url('${game.thumbnail || ''}')`;
  if (activeGameTitle) activeGameTitle.textContent = game.title || 'Game';
  if (gameFrame) gameFrame.src = '';

  if (playerContainer) {
    playerContainer.scrollIntoView({ behavior: 'smooth' });
  }

  let progress = 0;
  if (progressBar) progressBar.style.width = '0%';
  
  const timer = setInterval(() => {
    progress += 25;
    if (progressBar) progressBar.style.width = `${progress}%`;
    
    if (progress >= 100) {
      clearInterval(timer);
      setTimeout(() => {
        if (gameLoader) gameLoader.classList.add('hidden');
        if (gameFrame) gameFrame.src = game.embedUrl;
      }, 100);
    }
  }, 35);
}

// 6. Search & Clear Event Listeners
if (searchInput) {
  searchInput.addEventListener('input', renderGames);
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    clearSearchBtn.classList.add('hidden');
    renderGames();
  });
}

// 7. Fullscreen Toggle Support
if (fullscreenBtn && gameFrame) {
  fullscreenBtn.addEventListener('click', () => {
    if (gameFrame.requestFullscreen) {
      gameFrame.requestFullscreen();
    } else if (gameFrame.webkitRequestFullscreen) {
      gameFrame.webkitRequestFullscreen();
    }
  });
}

// 8. Close Game Window Handler
if (closeGameBtn && playerContainer && gameFrame) {
  closeGameBtn.addEventListener('click', () => {
    playerContainer.classList.add('hidden');
    gameFrame.src = '';
  });
}

// Initialize Engine Execution
loadPortalData();