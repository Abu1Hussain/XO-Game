/* Local-play draw policy follows the common online chess conventions documented
 * at support.chess.com. Move legality and position validation use chess.js. */
const BoardroomRules = (() => {
  function pieces(game, color) {
    return game.board().flat().filter(piece => piece && piece.color === color && piece.type !== 'k');
  }
  function timeoutCanWin(game, color) {
    const material = pieces(game, color);
    if (material.some(piece => ['p','r','q'].includes(piece.type))) return true;
    if (material.length < 2) return false;
    if (material.every(piece => piece.type === 'b')) {
      const colors = new Set(material.map(piece => (piece.square.charCodeAt(0) + Number(piece.square[1])) % 2));
      return colors.size > 1;
    }
    // Two knights can win on time under the online timeout convention.
    return true;
  }
  function insufficientMaterial(game) {
    if (game.isInsufficientMaterial()) return true;
    const white = pieces(game, 'w'), black = pieces(game, 'b');
    const singleMinor = material => material.length <= 1 && material.every(piece => ['b','n'].includes(piece.type));
    if (singleMinor(white) && singleMinor(black)) return true;
    const twoKnights = material => material.length === 2 && material.every(piece => piece.type === 'n');
    return (!white.length && twoKnights(black)) || (!black.length && twoKnights(white));
  }
  return {timeoutCanWin, insufficientMaterial};
})();
