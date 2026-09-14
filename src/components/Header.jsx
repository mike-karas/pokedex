import { useRef } from 'react';
import { burstStars } from '../utils/burst';
import styles from './Header.module.css';

const GEN_OPTIONS = [
  { value: '', label: 'All generations' },
  { value: '1', label: 'Gen I (1–151)' },
  { value: '2', label: 'Gen II (152–251)' },
  { value: '3', label: 'Gen III (252–386)' },
  { value: '4', label: 'Gen IV (387–493)' },
  { value: '5', label: 'Gen V (494–649)' },
  { value: '6', label: 'Gen VI (650–721)' },
  { value: '7', label: 'Gen VII (722–809)' },
  { value: '8', label: 'Gen VIII (810–905)' },
  { value: '9', label: 'Gen IX (906–1025)' },
];

export default function Header({
  searchTerm, onSearch,
  activeType, onTypeChange, typeOptions,
  activeHabitat, onHabitatChange, habitatOptions,
  activeGen, onGenChange,
  favoritesOnly, onFavChange,
  imageMode, onImageModeChange,
  showShiny, onShinyChange,
  showLCD, onLCDChange,
  onReset,
}) {
  const shinyRef = useRef(null);

  function handleShinyChange(e) {
    const checked = e.target.checked;
    onShinyChange(checked);
    if (checked) requestAnimationFrame(() => burstStars(shinyRef.current));
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <h1 className={styles.logo}>Pokédex</h1>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by name or number…"
            autoComplete="off"
            value={searchTerm}
            onChange={e => onSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch(searchTerm)}
          />
          <button onClick={() => onSearch(searchTerm)}>Search</button>
        </div>

        <div className={styles.filterRow}>
          <select value={activeType} onChange={e => onTypeChange(e.target.value)}>
            <option value="">All types</option>
            {typeOptions.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>

          <select value={activeHabitat} onChange={e => onHabitatChange(e.target.value)}>
            <option value="">All habitats</option>
            {habitatOptions.map(h => (
              <option key={h} value={h}>
                {h.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </option>
            ))}
          </select>

          <select value={activeGen} onChange={e => onGenChange(e.target.value)}>
            {GEN_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select value={favoritesOnly ? 'favorites' : ''} onChange={e => onFavChange(e.target.value === 'favorites')}>
            <option value="">Any</option>
            <option value="favorites">Favorites ♥</option>
          </select>

          <select value={imageMode} onChange={e => onImageModeChange(e.target.value)}>
            <option value="artwork">Artwork</option>
            <option value="sprite">Sprite</option>
          </select>

          <label className="shiny-label" ref={shinyRef}>
            <input
              type="checkbox"
              checked={showShiny}
              onChange={handleShinyChange}
            />
            Shiny
          </label>

          <label className="lcd-label">
            <input
              type="checkbox"
              checked={showLCD}
              onChange={e => onLCDChange(e.target.checked)}
            />
            LCD
          </label>

          <button className={styles.resetBtn} onClick={onReset}>Reset</button>
        </div>
      </div>
    </header>
  );
}
