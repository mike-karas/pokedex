import { useRef, useEffect } from 'react';
import { spriteUrls, pickSprite } from '../utils/sprites';
import { pad } from '../utils/helpers';
import styles from './PokemonCard.module.css';

export default function PokemonCard({ pokemon, imageMode, showShiny, isFavorite, onToggleFavorite, onClick }) {
  const imgRef = useRef(null);
  const urls = spriteUrls(pokemon.sprites);
  const src = pickSprite(urls, imageMode, showShiny);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || img.src === src) return;
    img.style.opacity = '0';
    img.src = src;
    const restore = () => { img.style.opacity = '1'; };
    img.addEventListener('load', restore, { once: true });
    img.addEventListener('error', restore, { once: true });
  }, [src]);

  return (
    <div className={styles.card} onClick={onClick}>
      <button
        className={`${styles.favBtn}${isFavorite ? ' ' + styles.active : ''}`}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onClick={e => { e.stopPropagation(); onToggleFavorite(pokemon.id); }}
      >♥</button>
      <div className={styles.cardNum}>#{pad(pokemon.id)}</div>
      <img
        ref={imgRef}
        className={`${styles.cardImg}${imageMode !== 'artwork' ? ' ' + styles.pixelated : ''}`}
        src={src}
        alt={pokemon.name}
        loading="lazy"
      />
      <div className={styles.cardName}>{pokemon.name}</div>
      <div className={styles.types}>
        {pokemon.types.map(t => (
          <span key={t.type.name} className={`type-badge type-${t.type.name}`}>{t.type.name}</span>
        ))}
      </div>
    </div>
  );
}
