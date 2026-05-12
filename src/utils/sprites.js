export function spriteUrls(sprites) {
  const artDefault = sprites.other?.['official-artwork']?.front_default || sprites.front_default || '';
  const artShiny   = sprites.other?.['official-artwork']?.front_shiny   || sprites.front_shiny   || artDefault;
  const sprDefault = sprites.front_default || '';
  const sprShiny   = sprites.front_shiny   || sprDefault;
  return { artDefault, artShiny, sprDefault, sprShiny };
}

export function pickSprite({ artDefault, artShiny, sprDefault, sprShiny }, imageMode, showShiny) {
  if (imageMode === 'artwork') return showShiny ? artShiny : artDefault;
  return showShiny ? sprShiny : sprDefault;
}
