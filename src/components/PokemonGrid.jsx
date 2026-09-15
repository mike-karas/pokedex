import { useEffect, useRef } from 'react';
import PokemonCard from './PokemonCard';
import styles from './PokemonGrid.module.css';

export default function PokemonGrid({
  cards, loading, error, hasMore,
  imageMode, showShiny, favorites,
  onToggleFavorite, onCardClick, onLoadMore,
}) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <main className={styles.main}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {cards.map(pokemon => (
          <PokemonCard
            key={pokemon.id}
            pokemon={pokemon}
            imageMode={imageMode}
            showShiny={showShiny}
            isFavorite={favorites.has(pokemon.id)}
            onToggleFavorite={onToggleFavorite}
            onClick={() => onCardClick(pokemon.id)}
          />
        ))}
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className="pokeball-spinner" />
          <p>Loading…</p>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} />}
    </main>
  );
}
