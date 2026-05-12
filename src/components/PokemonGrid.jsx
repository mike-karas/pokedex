import PokemonCard from './PokemonCard';
import styles from './PokemonGrid.module.css';

export default function PokemonGrid({
  cards, loading, error, hasMore,
  imageMode, showShiny, favorites,
  onToggleFavorite, onCardClick, onLoadMore,
}) {
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
          <div className={styles.pokeballSpinner} />
          <p>Loading…</p>
        </div>
      )}

      {hasMore && !loading && (
        <button className={styles.loadMore} onClick={onLoadMore}>Load more</button>
      )}
    </main>
  );
}
