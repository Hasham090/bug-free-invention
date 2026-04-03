// ===== STATE =====
const state = {
  genres: [],
  moods: [],
  length: null,
  western: '',
  results: [],
  favorites: JSON.parse(localStorage.getItem('animeFavorites') || '[]'),
};

// ===== JIKAN API =====
const JIKAN_BASE = 'https://api.jikan.moe/v4';

// Genre mapping for Jikan API
const GENRE_MAP = {
  'Action': 1,
  'Adventure': 2,
  'Comedy': 4,
  'Drama': 8,
  'Fantasy': 10,
  'Horror': 14,
  'Mystery': 7,
  'Romance': 22,
  'Sci-Fi': 24,
  'Thriller': 41,
};

// Mood to genre/theme mapping
const MOOD_GENRES = {
  'dark': [40, 14, 7],        // Psychological, Horror, Mystery
  'feel-good': [4, 22, 36],   // Comedy, Romance, Slice of Life
  'mind-bending': [24, 40, 7], // Sci-Fi, Psychological, Mystery
  'action-packed': [1, 2, 38], // Action, Adventure, Military
  'emotional': [8, 22, 36],   // Drama, Romance, Slice of Life
  'chill': [36, 4, 8],        // Slice of Life, Comedy, Drama
};

// Western movie to anime mapping for taste-matching
const WESTERN_ANIME_MAP = {
  'inception': { genres: [24, 40], keywords: ['psychological', 'sci-fi'] },
  'matrix': { genres: [1, 24], keywords: ['sci-fi', 'action', 'cyberpunk'] },
  'interstellar': { genres: [24, 8], keywords: ['space', 'sci-fi', 'drama'] },
  'breaking bad': { genres: [8, 40], keywords: ['psychological', 'drama', 'thriller'] },
  'game of thrones': { genres: [1, 10], keywords: ['fantasy', 'action', 'dark'] },
  'spirited away': { genres: [10, 2], keywords: ['fantasy', 'adventure'] },
  'blade runner': { genres: [24, 8], keywords: ['sci-fi', 'cyberpunk'] },
  'fight club': { genres: [40, 8], keywords: ['psychological', 'drama'] },
  'john wick': { genres: [1, 2], keywords: ['action', 'martial arts'] },
  'stranger things': { genres: [14, 7, 24], keywords: ['mystery', 'horror', 'sci-fi'] },
  'dark': { genres: [24, 7, 40], keywords: ['sci-fi', 'mystery', 'psychological'] },
  'attack on titan': { genres: [1, 8], keywords: ['action', 'drama'] },
  'the shining': { genres: [14, 40], keywords: ['horror', 'psychological'] },
  'avengers': { genres: [1, 2, 10], keywords: ['action', 'adventure', 'fantasy'] },
  'marvel': { genres: [1, 2, 10], keywords: ['action', 'adventure', 'fantasy'] },
  'star wars': { genres: [24, 1, 2], keywords: ['sci-fi', 'action', 'space'] },
  'titanic': { genres: [22, 8], keywords: ['romance', 'drama'] },
  'notebook': { genres: [22, 8], keywords: ['romance', 'drama'] },
  'her': { genres: [22, 24, 8], keywords: ['romance', 'sci-fi', 'drama'] },
  'parasite': { genres: [40, 8], keywords: ['psychological', 'thriller', 'drama'] },
  'joker': { genres: [40, 8], keywords: ['psychological', 'drama'] },
};

// Streaming platform suggestions based on genre
function getStreamingSuggestion(genres) {
  const genreNames = genres.map(g => g.name.toLowerCase());
  if (genreNames.some(g => ['action', 'adventure', 'fantasy'].includes(g))) {
    return 'Try Crunchyroll or Netflix';
  }
  if (genreNames.some(g => ['drama', 'romance', 'slice of life'].includes(g))) {
    return 'Try Crunchyroll or Funimation';
  }
  if (genreNames.some(g => ['horror', 'thriller', 'mystery'].includes(g))) {
    return 'Try Crunchyroll or HIDIVE';
  }
  return 'Try Crunchyroll or Netflix';
}

// Build "why it matches" text
function buildMatchReason(anime, userPrefs) {
  const animeGenres = anime.genres.map(g => g.name.toLowerCase());
  const reasons = [];

  // Check genre matches
  const matchedGenres = userPrefs.genres.filter(ug =>
    animeGenres.includes(ug.toLowerCase())
  );
  if (matchedGenres.length > 0) {
    reasons.push(`Matches your love for ${matchedGenres.join(', ')}`);
  }

  // Check mood match
  if (userPrefs.moods.length > 0) {
    const moodLabels = {
      'dark': 'dark & psychological',
      'feel-good': 'feel-good',
      'mind-bending': 'mind-bending',
      'action-packed': 'action-packed',
      'emotional': 'emotional',
      'chill': 'chill & relaxing',
    };
    const moodText = userPrefs.moods.map(m => moodLabels[m]).join(', ');
    reasons.push(`Fits your ${moodText} mood`);
  }

  // Score mention
  if (anime.score >= 8) {
    reasons.push(`Highly rated at ${anime.score}/10`);
  }

  if (reasons.length === 0) {
    reasons.push('A great anime movie pick for you!');
  }

  return reasons.join('. ') + '.';
}

// Duration category helper
function getDurationCategory(duration) {
  if (!duration) return 'medium';
  const match = duration.match(/(\d+)/);
  if (!match) return 'medium';
  const mins = parseInt(match[1]);
  if (mins < 90) return 'short';
  if (mins <= 120) return 'medium';
  return 'long';
}

function getDurationMinutes(duration) {
  if (!duration) return null;
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// ===== API CALLS =====
async function jikanFetch(url) {
  const res = await fetch(url);
  if (res.status === 429) {
    // Rate limited, wait and retry
    await new Promise(r => setTimeout(r, 1500));
    const retry = await fetch(url);
    return retry.json();
  }
  return res.json();
}

async function searchAnimeMovies(genreIds, page = 1) {
  const genreParam = genreIds.length > 0 ? `&genres=${genreIds.join(',')}` : '';
  const url = `${JIKAN_BASE}/anime?type=movie&order_by=score&sort=desc&min_score=6&status=complete${genreParam}&page=${page}&limit=10`;
  return jikanFetch(url);
}

async function getTopAnimeMovies() {
  const url = `${JIKAN_BASE}/top/anime?type=movie&filter=bypopularity&limit=25`;
  return jikanFetch(url);
}

async function getRandomAnimeMovies() {
  // Fetch top movies and pick random ones
  const url = `${JIKAN_BASE}/top/anime?type=movie&limit=25&filter=bypopularity`;
  const data = await jikanFetch(url);

  // Also fetch page 2 for more variety
  await new Promise(r => setTimeout(r, 400));
  const url2 = `${JIKAN_BASE}/top/anime?type=movie&limit=25&page=2&filter=bypopularity`;
  const data2 = await jikanFetch(url2);

  const allMovies = [...(data.data || []), ...(data2.data || [])];
  // Shuffle and pick 5
  const shuffled = allMovies.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

// ===== RECOMMENDATION ENGINE =====
async function getRecommendations(prefs) {
  const allGenreIds = new Set();

  // Add selected genres
  prefs.genres.forEach(g => {
    if (GENRE_MAP[g]) allGenreIds.add(GENRE_MAP[g]);
  });

  // Add mood-based genres
  prefs.moods.forEach(m => {
    (MOOD_GENRES[m] || []).forEach(id => allGenreIds.add(id));
  });

  // Add western-taste genres
  if (prefs.western) {
    const westernLower = prefs.western.toLowerCase();
    Object.entries(WESTERN_ANIME_MAP).forEach(([key, val]) => {
      if (westernLower.includes(key)) {
        val.genres.forEach(id => allGenreIds.add(id));
      }
    });
  }

  const genreIds = [...allGenreIds];
  let movies = [];

  if (genreIds.length > 0) {
    // Fetch with top 3 genres first (Jikan limits genre combos)
    const primaryGenres = genreIds.slice(0, 3);
    const data = await searchAnimeMovies(primaryGenres);
    movies = data.data || [];

    // If not enough results, try with fewer genres
    if (movies.length < 5 && genreIds.length > 1) {
      await new Promise(r => setTimeout(r, 400));
      const data2 = await searchAnimeMovies(genreIds.slice(0, 1));
      const newMovies = (data2.data || []).filter(
        m => !movies.some(existing => existing.mal_id === m.mal_id)
      );
      movies = [...movies, ...newMovies];
    }
  }

  // Fallback: get top movies if no genre results
  if (movies.length < 5) {
    await new Promise(r => setTimeout(r, 400));
    const topData = await getTopAnimeMovies();
    const topMovies = (topData.data || []).filter(
      m => !movies.some(existing => existing.mal_id === m.mal_id)
    );
    movies = [...movies, ...topMovies];
  }

  // Filter by length preference
  if (prefs.length) {
    const filtered = movies.filter(m => getDurationCategory(m.duration) === prefs.length);
    if (filtered.length >= 3) {
      movies = filtered;
    }
  }

  // Sort by relevance (score + genre match count)
  movies.sort((a, b) => {
    const aGenreMatch = a.genres.filter(g =>
      genreIds.includes(GENRE_MAP[g.name])
    ).length;
    const bGenreMatch = b.genres.filter(g =>
      genreIds.includes(GENRE_MAP[g.name])
    ).length;
    const aScore = (a.score || 0) + aGenreMatch * 2;
    const bScore = (b.score || 0) + bGenreMatch * 2;
    return bScore - aScore;
  });

  return movies.slice(0, 5);
}

// ===== UI RENDERING =====
function createAnimeCard(anime, userPrefs, index = 0) {
  const card = document.createElement('div');
  card.className = 'anime-card';
  card.style.animationDelay = `${index * 0.1}s`;
  card.dataset.duration = getDurationCategory(anime.duration);

  const isFav = state.favorites.some(f => f.mal_id === anime.mal_id);
  const poster = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
  const title = anime.title_english || anime.title;
  const synopsis = anime.synopsis
    ? anime.synopsis.replace(/\[Written by MAL Rewrite\]/g, '').trim()
    : 'No description available.';
  const score = anime.score ? anime.score.toFixed(1) : 'N/A';
  const durationMins = getDurationMinutes(anime.duration);
  const durationText = durationMins ? `${durationMins} min` : anime.duration || 'Unknown';
  const malUrl = anime.url || `https://myanimelist.net/anime/${anime.mal_id}`;
  const streaming = getStreamingSuggestion(anime.genres || []);
  const matchReason = userPrefs
    ? buildMatchReason(anime, userPrefs)
    : 'A highly-rated anime movie worth watching!';

  card.innerHTML = `
    <div class="card-poster-wrap">
      <img class="card-poster" src="${poster}" alt="${title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 400%22><rect fill=%22%231a1a2e%22 width=%22300%22 height=%22400%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%239e9eb8%22 text-anchor=%22middle%22 font-size=%2220%22>No Image</text></svg>'" />
      <span class="card-score">&#9733; ${score}</span>
      <span class="card-duration">${durationText}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">${title}</h3>
      <div class="card-genres">
        ${(anime.genres || []).map(g => `<span class="card-genre-tag">${g.name}</span>`).join('')}
      </div>
      <p class="card-desc">${synopsis}</p>
      <div class="card-match">${matchReason}</div>
      <div class="card-actions">
        <a class="card-link" href="${malUrl}" target="_blank" rel="noopener">MyAnimeList &#8599;</a>
        <span class="card-stream">${streaming}</span>
        <button class="btn-fav ${isFav ? 'favorited' : ''}" data-id="${anime.mal_id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
          ${isFav ? '&#9829;' : '&#9825;'}
        </button>
      </div>
    </div>
  `;

  // Favorite button handler
  card.querySelector('.btn-fav').addEventListener('click', () => {
    toggleFavorite(anime);
  });

  return card;
}

function renderResults(movies, userPrefs) {
  const grid = document.getElementById('results-grid');
  const noResults = document.getElementById('no-results');

  grid.innerHTML = '';

  if (!movies || movies.length === 0) {
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');
  movies.forEach((movie, i) => {
    grid.appendChild(createAnimeCard(movie, userPrefs, i));
  });
}

function renderFavorites() {
  const grid = document.getElementById('favorites-grid');
  const noFavs = document.getElementById('no-favorites');
  const count = document.getElementById('fav-count');

  grid.innerHTML = '';
  count.textContent = state.favorites.length;

  if (state.favorites.length === 0) {
    noFavs.classList.remove('hidden');
    return;
  }

  noFavs.classList.add('hidden');
  state.favorites.forEach((anime, i) => {
    grid.appendChild(createAnimeCard(anime, null, i));
  });
}

function toggleFavorite(anime) {
  const idx = state.favorites.findIndex(f => f.mal_id === anime.mal_id);
  if (idx >= 0) {
    state.favorites.splice(idx, 1);
  } else {
    state.favorites.push(anime);
  }
  localStorage.setItem('animeFavorites', JSON.stringify(state.favorites));

  // Re-render current section
  updateFavButtons();
  renderFavorites();
}

function updateFavButtons() {
  document.querySelectorAll('.btn-fav').forEach(btn => {
    const id = parseInt(btn.dataset.id);
    const isFav = state.favorites.some(f => f.mal_id === id);
    btn.classList.toggle('favorited', isFav);
    btn.innerHTML = isFav ? '&#9829;' : '&#9825;';
    btn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
  });
  document.getElementById('fav-count').textContent = state.favorites.length;
}

// ===== NAVIGATION =====
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });
}

// ===== LENGTH FILTER =====
document.getElementById('length-filter').addEventListener('change', (e) => {
  const filter = e.target.value;
  const cards = document.querySelectorAll('#results-grid .anime-card');

  cards.forEach(card => {
    if (filter === 'all' || card.dataset.duration === filter) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
});

// ===== CHIP SELECTION =====
document.querySelectorAll('.chip-group').forEach(group => {
  const isSingleSelect = group.classList.contains('single-select');

  group.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (isSingleSelect) {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        if (chip.classList.contains('selected')) {
          chip.classList.remove('selected');
        } else {
          chip.classList.add('selected');
        }
      } else {
        chip.classList.toggle('selected');
      }
    });
  });
});

// ===== NAV BUTTONS =====
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    showSection(btn.dataset.section);
    if (btn.dataset.section === 'favorites-section') {
      renderFavorites();
    }
  });
});

// ===== FORM SUBMISSION =====
document.getElementById('taste-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Collect form data
  const genres = [...document.querySelectorAll('#genre-chips .chip.selected')]
    .map(c => c.dataset.value);
  const moods = [...document.querySelectorAll('#mood-chips .chip.selected')]
    .map(c => c.dataset.value);
  const lengthChip = document.querySelector('#length-chips .chip.selected');
  const length = lengthChip ? lengthChip.dataset.value : null;
  const western = document.getElementById('western-input').value;

  const prefs = { genres, moods, length, western };

  // Show results section with loading
  showSection('results-section');
  document.getElementById('results-title').textContent = 'Your Recommendations';
  document.getElementById('results-grid').innerHTML = '';
  document.getElementById('no-results').classList.add('hidden');
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('length-filter').value = 'all';

  try {
    const movies = await getRecommendations(prefs);
    state.results = movies;
    document.getElementById('loading').classList.add('hidden');
    renderResults(movies, prefs);
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('no-results').classList.remove('hidden');
  }
});

// ===== SURPRISE ME =====
document.getElementById('surprise-btn').addEventListener('click', async () => {
  showSection('results-section');
  document.getElementById('results-title').textContent = '&#10024; Surprise Picks';
  document.getElementById('results-grid').innerHTML = '';
  document.getElementById('no-results').classList.add('hidden');
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('length-filter').value = 'all';

  try {
    const movies = await getRandomAnimeMovies();
    state.results = movies;
    document.getElementById('loading').classList.add('hidden');
    renderResults(movies, null);
  } catch (err) {
    console.error('Error fetching surprise picks:', err);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('no-results').classList.remove('hidden');
  }
});

// ===== INIT =====
renderFavorites();
