import { dodgeGame } from './dodge/game.js';
import { memoryGame } from './memory/game.js';
import { reactionGame } from './reaction/game.js';
import { runnerGame } from './runner/game.js';

function validateGameDefinition(game, index) {
  const label = game?.id || `index ${index}`;
  const requiredTextFields = ['id', 'name', 'title', 'kicker', 'copy', 'hint'];
  requiredTextFields.forEach((field) => {
    if (typeof game?.[field] !== 'string' || !game[field].trim()) {
      throw new TypeError(`게임 ${label}의 ${field} 값이 필요합니다.`);
    }
  });

  if (typeof game.create !== 'function') {
    throw new TypeError(`게임 ${label}의 create 함수가 필요합니다.`);
  }
  if (!game.card || typeof game.card !== 'object') {
    throw new TypeError(`게임 ${label}의 카드 정보가 필요합니다.`);
  }
  ['badge', 'icon', 'theme', 'summary', 'difficulty', 'estimatedTime', 'controls'].forEach((field) => {
    if (typeof game.card[field] !== 'string' || !game.card[field].trim()) {
      throw new TypeError(`게임 ${label}의 card.${field} 값이 필요합니다.`);
    }
  });

  return Object.freeze(game);
}

export function createGameRegistry(definitions) {
  const validatedGames = definitions.map(validateGameDefinition);
  const gameIds = new Set(validatedGames.map((game) => game.id));
  if (gameIds.size !== validatedGames.length) {
    throw new TypeError('게임 id는 서로 달라야 합니다.');
  }

  return Object.freeze(validatedGames);
}

export const games = createGameRegistry([runnerGame, memoryGame, reactionGame, dodgeGame]);

export const gamesById = new Map(games.map((game) => [game.id, game]));
