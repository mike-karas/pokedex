import { useState, useEffect, useCallback } from 'react';
import { fetchJson, API } from '../utils/api';
import { spriteUrls, pickSprite } from '../utils/sprites';
import { pad, idFromUrl, statLabel, statColor } from '../utils/helpers';
import { attackMultiplier, superEffectiveTypes } from '../utils/typeChart';
import styles from './Modal.module.css';

const spriteCache = {};
const typeDataCache = {};

async function fetchTypeData(typeName) {
  if (typeDataCache[typeName]) return typeDataCache[typeName];
  const data = await fetchJson(`${API}/type/${typeName}`);
  typeDataCache[typeName] = data;
  return data;
}

async function buildStrongAgainst(pokemon) {
  const attackerTypes = pokemon.types.map(t => t.type.name);
  const selectedBst = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);

  const targets = superEffectiveTypes(attackerTypes);
  if (targets.length === 0) return [];

  const typeLists = await Promise.all(targets.map(t => fetchTypeData(t)));

  const candidateIds = new Set();
  for (const typeData of typeLists) {
    for (const entry of typeData.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
      if (id !== pokemon.id && id >= 1 && id <= 1025) candidateIds.add(id);
    }
  }
  if (candidateIds.size === 0) return [];

  const shuffled = [...candidateIds].sort(() => Math.random() - 0.5).slice(0, 12);
  const candidates = await Promise.all(shuffled.map(id => fetchJson(`${API}/pokemon/${id}`)));

  const bstBand = selectedBst * 0.25;
  let filtered = candidates.filter(c => {
    const defTypes = c.types.map(t => t.type.name);
    if (attackMultiplier(attackerTypes, defTypes) <= 1) return false;
    const cBst = c.stats.reduce((sum, s) => sum + s.base_stat, 0);
    return Math.abs(cBst - selectedBst) <= bstBand;
  });

  // Relax BST constraint if not enough matches
  if (filtered.length < 3) {
    filtered = candidates.filter(c =>
      attackMultiplier(attackerTypes, c.types.map(t => t.type.name)) > 1
    );
  }

  return filtered.sort(() => Math.random() - 0.5).slice(0, 3);
}

async function getSpriteById(id) {
  if (spriteCache[id]) return spriteCache[id];
  const p = await fetchJson(`${API}/pokemon/${id}`);
  const url = p.sprites.front_default || '';
  spriteCache[id] = url;
  return url;
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
    return steps.length > 1 ? steps : [];
  } catch {
    return [];
  }
}

export default function Modal({ pokemonId, imageMode, showShiny, favorites, onToggleFavorite, onClose, onEvoClick }) {
  const [pokemon, setPokemon] = useState(null);
  const [species, setSpecies] = useState(null);
  const [evoSteps, setEvoSteps] = useState([]);
  const [strongAgainst, setStrongAgainst] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pokemonId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPokemon(null);
    setStrongAgainst([]);

    async function load() {
      try {
        const poke = await fetchJson(`${API}/pokemon/${pokemonId}`);
        const spec = await fetchJson(poke.species.url);
        const evos = await buildEvoChain(spec.evolution_chain.url);
        if (!cancelled) {
          setPokemon(poke);
          setSpecies(spec);
          setEvoSteps(evos);
          setLoading(false);
        }
        try {
          const strong = await buildStrongAgainst(poke);
          if (!cancelled) setStrongAgainst(strong);
        } catch {
          // strong-against is optional; fail silently
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load Pokémon details.');
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [pokemonId]);

  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const isFav = pokemon ? favorites.has(pokemon.id) : false;
  const urls = pokemon ? spriteUrls(pokemon.sprites) : null;
  const sprite = urls ? pickSprite(urls, imageMode, showShiny) : '';

  const flavour = species?.flavor_text_entries
    .find(e => e.language.name === 'en')
    ?.flavor_text.replace(/\f|\n/g, ' ') || '';
  const genus = species?.genera.find(g => g.language.name === 'en')?.genus || '';

  return (
    <div className={styles.modal} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.card}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.pokeballSpinner} />
            <p>Loading…</p>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        {pokemon && species && (
          <>
            <div className={styles.detailHeader}>
              <button
                className={`${styles.favBtn}${isFav ? ' ' + styles.active : ''}`}
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                onClick={() => onToggleFavorite(pokemon.id)}
              >♥</button>
              <div className={styles.detailNum}>#{pad(pokemon.id)} · {genus}</div>
              <div className={styles.detailName}>{pokemon.name}</div>
              <img className={styles.detailImg} src={sprite} alt={pokemon.name} />
              <div className={styles.detailTypes}>
                {pokemon.types.map(t => (
                  <span key={t.type.name} className={`type-badge type-${t.type.name}`}>{t.type.name}</span>
                ))}
              </div>
            </div>

            {flavour && (
              <div className={styles.section}>
                <p className={styles.flavourText}>{flavour}</p>
              </div>
            )}

            <div className={styles.section}>
              <h3>Info</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}><label>Height</label><span>{(pokemon.height / 10).toFixed(1)} m</span></div>
                <div className={styles.infoItem}><label>Weight</label><span>{(pokemon.weight / 10).toFixed(1)} kg</span></div>
                <div className={styles.infoItem}><label>Base Exp</label><span>{pokemon.base_experience ?? '—'}</span></div>
                <div className={styles.infoItem}><label>Capture Rate</label><span>{species.capture_rate}</span></div>
              </div>
            </div>

            <div className={styles.section}>
              <h3>Base Stats</h3>
              {pokemon.stats.map(s => {
                const pct = Math.min((s.base_stat / 255) * 100, 100).toFixed(1);
                return (
                  <div key={s.stat.name} className={styles.statRow}>
                    <span className={styles.statLabel}>{statLabel(s.stat.name)}</span>
                    <span className={styles.statVal}>{s.base_stat}</span>
                    <div className={styles.statBarBg}>
                      <div className={styles.statBarFill} style={{ width: `${pct}%`, background: statColor(s.base_stat) }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.section}>
              <h3>Abilities</h3>
              <div className={styles.abilityList}>
                {pokemon.abilities.map(a => (
                  <span
                    key={a.ability.name}
                    className={`${styles.abilityPill}${a.is_hidden ? ' ' + styles.hidden : ''}`}
                    title={a.is_hidden ? 'Hidden ability' : ''}
                  >
                    {a.ability.name}{a.is_hidden ? ' ★' : ''}
                  </span>
                ))}
              </div>
            </div>

            {evoSteps.length > 0 && (
              <div className={styles.section}>
                <h3>Evolution Chain</h3>
                <div className={styles.evoChain}>
                  {evoSteps.map((s, i) => (
                    <div key={s.id} className={styles.evoStep}>
                      {i > 0 && <span className={styles.evoArrow}>→</span>}
                      <div className={styles.evoMon} onClick={() => onEvoClick(s.id)}>
                        <img src={s.sprite} alt={s.name} />
                        <span>{s.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {strongAgainst.length > 0 && (
              <div className={styles.section}>
                <h3>Strong Against</h3>
                <div className={styles.strongAgainstGrid}>
                  {strongAgainst.map(p => {
                    const mult = attackMultiplier(
                      pokemon.types.map(t => t.type.name),
                      p.types.map(t => t.type.name)
                    );
                    return (
                      <div key={p.id} className={styles.strongMon} onClick={() => onEvoClick(p.id)}>
                        <img src={p.sprites.front_default || ''} alt={p.name} />
                        <span className={styles.strongMonMult}>{mult}×</span>
                        <span className={styles.strongMonName}>{p.name}</span>
                        <div className={styles.strongMonTypes}>
                          {p.types.map(t => (
                            <span key={t.type.name} className={`type-badge type-${t.type.name}`}>
                              {t.type.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
