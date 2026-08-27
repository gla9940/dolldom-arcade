import { memoryGame } from './memory/game.js';
import { reactionGame } from './reaction/game.js';
import { runnerGame } from './runner/game.js';

export const games = [runnerGame, memoryGame, reactionGame];

export const gamesById = new Map(games.map((game) => [game.id, game]));
