import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchJson, API, GEN_RANGES, PAGE_SIZE } from './utils/api';
import { idFromUrl } from './utils/helpers';
import Header from './components/Header';
import PokemonGrid from './components/PokemonGrid';
import Modal from './components/Modal';
import LCDOverlay from './components/LCDOverlay';

function loadFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem('pokedex-favorites') || '[]')); }
  catch { return new Set(); }
}
function saveFavorites(set) {
  localStorage.setItem('pokedex-favorites', JSON.stringify([...set]));
}

export default function App() {
  const [allPokemon, setAllPokemon]     = useState([]);
  const [typeOptions, setTypeOptions]   = useState([]);
  const [activeType, setActiveType]     = useState('');
  const [typeIds, setTypeIds]           = useState(null);
  const [habitatOptions, setHabitatOptions] = useState([]);
  const [activeHabitat, setActiveHabitat]   = useState('');
  const [habitatIds, setHabitatIds]         = useState(null);
  const [activeGen, setActiveGen]       = useState('');
  const [searchTerm, setSearchTerm]     = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [imageMode, setImageMode]       = useState('sprite');
  const [showShiny, setShowShiny]       = useState(false);
  const [showLCD, setShowLCD]           = useState(true);
  const [favorites, setFavorites]       = useState(loadFavorites);
  const [cards, setCards]               = useState([]);
  const [offset, setOffset]             = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [modalId, setModalId]           = useState(null);

  // Fetch all pokemon names + ids once
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [listData, typeData, habitatData] = await Promise.all([
          fetchJson(`${API}/pokemon?limit=10000`),
          fetchJson(`${API}/type?limit=100`),
          fetchJson(`${API}/pokemon-habitat?limit=100`),
        ]);
        setAllPokemon(listData.results.map(p => ({ ...p, id: idFromUrl(p.url) })));
        setTypeOptions(
          typeData.results
            .map(t => t.name)
            .filter(n => !['unknown', 'shadow'].includes(n))
        );
        setHabitatOptions(habitatData.results.map(h => h.name));
      } catch {
        setError('Could not connect to PokéAPI. Check your internet connection.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // When activeType changes, fetch the type's pokemon id set
  useEffect(() => {
    if (!activeType) { setTypeIds(null); return; }
    fetchJson(`${API}/type/${activeType}`)
      .then(data => {
        const ids = new Set(
          data.pokemon.map(e => idFromUrl(e.pokemon.url)).filter(id => id <= 10000)
        );
        setTypeIds(ids);
      })
      .catch(() => setTypeIds(null));
  }, [activeType]);

  // When activeHabitat changes, fetch the habitat's pokemon id set
  useEffect(() => {
    if (!activeHabitat) { setHabitatIds(null); return; }
    fetchJson(`${API}/pokemon-habitat/${activeHabitat}`)
      .then(data => {
        const ids = new Set(data.pokemon_species.map(s => idFromUrl(s.url)));
        setHabitatIds(ids);
      })
      .catch(() => setHabitatIds(null));
  }, [activeHabitat]);

  // Derived filtered list
  const filtered = useMemo(() => {
    let list = allPokemon;
    if (activeType && typeIds) list = list.filter(p => typeIds.has(p.id));
    if (activeHabitat && habitatIds) list = list.filter(p => habitatIds.has(p.id));
    if (activeGen) {
      const [lo, hi] = GEN_RANGES[activeGen];
      list = list.filter(p => p.id >= lo && p.id <= hi);
    }
    if (committedSearch) {
      const q = committedSearch.toLowerCase();
      const asNum = parseInt(q, 10);
      list = list.filter(p => p.name.includes(q) || p.id === asNum);
    }
    if (favoritesOnly) list = list.filter(p => favorites.has(p.id));
    return list;
  }, [allPokemon, activeType, typeIds, activeHabitat, habitatIds, activeGen, committedSearch, favoritesOnly, favorites]);

  // Reset pagination when filters change
  const prevFilteredRef = useRef(filtered);
  useEffect(() => {
    if (prevFilteredRef.current !== filtered) {
      setCards([]);
      setOffset(0);
      prevFilteredRef.current = filtered;
    }
  }, [filtered]);

  // Fetch a page of card details whenever offset or filtered changes
  useEffect(() => {
    if (allPokemon.length === 0) return;
    if (filtered.length === 0) { setCards([]); setError('No Pokémon found matching those filters.'); return; }
    setError(null);

    const slice = filtered.slice(offset, offset + PAGE_SIZE);
    if (slice.length === 0) return;

    setLoading(true);
    Promise.allSettled(slice.map(p => fetchJson(p.url)))
      .then(results => {
        const fetched = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        setCards(prev => offset === 0 ? fetched : [...prev, ...fetched]);
      })
      .catch(() => setError('Failed to load Pokémon.'))
      .finally(() => setLoading(false));
  }, [filtered, offset, allPokemon.length]);

  const handleLoadMore = useCallback(() => {
    setOffset(prev => prev + PAGE_SIZE);
  }, []);

  const handleSearch = useCallback(term => {
    setSearchTerm(term);
    setCommittedSearch(term);
  }, []);

  const handleTypeChange = useCallback(type => {
    setActiveType(type);
    setTypeIds(null);
  }, []);

  const handleHabitatChange = useCallback(habitat => {
    setActiveHabitat(habitat);
    setHabitatIds(null);
  }, []);

  const handleReset = useCallback(() => {
    handleSearch('');
    handleTypeChange('');
    handleHabitatChange('');
    setActiveGen('');
    setFavoritesOnly(false);
    setShowShiny(false);
    setImageMode('sprite');
  }, [handleSearch, handleTypeChange, handleHabitatChange]);

  const toggleFavorite = useCallback(id => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const hasMore = offset + PAGE_SIZE < filtered.length;

  return (
    <>
      <Header
        searchTerm={searchTerm}
        onSearch={handleSearch}
        activeType={activeType}
        onTypeChange={handleTypeChange}
        typeOptions={typeOptions}
        activeHabitat={activeHabitat}
        onHabitatChange={handleHabitatChange}
        habitatOptions={habitatOptions}
        activeGen={activeGen}
        onGenChange={setActiveGen}
        favoritesOnly={favoritesOnly}
        onFavChange={setFavoritesOnly}
        imageMode={imageMode}
        onImageModeChange={setImageMode}
        showShiny={showShiny}
        onShinyChange={setShowShiny}
        showLCD={showLCD}
        onLCDChange={setShowLCD}
        onReset={handleReset}
      />

      <PokemonGrid
        cards={cards}
        loading={loading}
        error={error}
        hasMore={hasMore}
        imageMode={imageMode}
        showShiny={showShiny}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onCardClick={setModalId}
        onLoadMore={handleLoadMore}
      />

      {showLCD && <LCDOverlay />}

      {modalId !== null && (
        <Modal
          pokemonId={modalId}
          imageMode={imageMode}
          showShiny={showShiny}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onClose={() => setModalId(null)}
          onEvoClick={setModalId}
        />
      )}
    </>
  );
}
