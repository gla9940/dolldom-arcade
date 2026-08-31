import { readJson, resetGameRecords, writeJson } from './storage.js';

const CURRENT_VERSION = 1;

export const achievementDefinitions = [
  { id: 'first-play', title: '첫 전파', description: '첫 게임을 완료했어요.', check: (data) => data.totalCompleted >= 1 },
  { id: 'all-games', title: '아케이드 탐험가', description: '모든 게임을 한 번 이상 플레이했어요.', check: (data, ids) => ids.every((id) => data.games[id]?.plays > 0) },
  { id: 'runner-1000', title: '네온 질주', description: '네온 러너에서 1,000점을 달성했어요.', check: (data) => data.games.runner?.bestRun >= 1000 },
  { id: 'memory-clear', title: '완벽한 기억', description: '메모리 플립을 클리어했어요.', check: (data) => data.games.memory?.clears >= 1 },
  { id: 'reaction-3000', title: '초고속 신호', description: '리액션 레인에서 3,000점을 달성했어요.', check: (data) => data.games.reaction?.bestRun >= 3000 },
  { id: 'dodge-1200', title: '보이드 생존자', description: '보이드 드리프터에서 1,200점을 달성했어요.', check: (data) => data.games.dodge?.bestRun >= 1200 },
];

function createEmptyData(gameIds) {
  return {
    version: CURRENT_VERSION,
    totalPlays: 0,
    totalCompleted: 0,
    totalScore: 0,
    achievements: [],
    games: Object.fromEntries(gameIds.map((id) => [id, { plays: 0, completed: 0, totalScore: 0, bestRun: 0, clears: 0 }])),
  };
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function normalizeProgress(rawData, gameIds) {
  const empty = createEmptyData(gameIds);
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return empty;

  empty.totalPlays = safeNumber(rawData.totalPlays);
  empty.totalCompleted = safeNumber(rawData.totalCompleted);
  empty.totalScore = safeNumber(rawData.totalScore);
  empty.achievements = Array.isArray(rawData.achievements)
    ? [...new Set(rawData.achievements.filter((id) => typeof id === 'string'))]
    : [];

  gameIds.forEach((id) => {
    const source = rawData.games?.[id];
    if (!source || typeof source !== 'object') return;
    empty.games[id] = {
      plays: safeNumber(source.plays),
      completed: safeNumber(source.completed),
      totalScore: safeNumber(source.totalScore),
      bestRun: safeNumber(source.bestRun),
      clears: safeNumber(source.clears),
    };
  });
  return empty;
}

export function createProgressManager(gameIds) {
  let data = normalizeProgress(readJson('progress', null), gameIds);

  function save() {
    writeJson('progress', data);
  }

  function unlockAchievements() {
    const unlocked = new Set(data.achievements);
    const newAchievements = achievementDefinitions.filter(
      (achievement) => !unlocked.has(achievement.id) && achievement.check(data, gameIds),
    );
    newAchievements.forEach((achievement) => data.achievements.push(achievement.id));
    return newAchievements;
  }

  return {
    recordStart(gameId) {
      if (!data.games[gameId]) return [];
      data.games[gameId].plays += 1;
      data.totalPlays += 1;
      const unlocked = unlockAchievements();
      save();
      return unlocked;
    },

    recordEnd(gameId, score, outcome = '') {
      if (!data.games[gameId]) return [];
      const safeScore = safeNumber(score);
      const game = data.games[gameId];
      game.completed += 1;
      game.totalScore += safeScore;
      game.bestRun = Math.max(game.bestRun, safeScore);
      if (gameId === 'memory' && outcome.includes('복구')) game.clears += 1;
      data.totalCompleted += 1;
      data.totalScore += safeScore;
      const unlocked = unlockAchievements();
      save();
      return unlocked;
    },

    getSnapshot() {
      return typeof globalThis.structuredClone === 'function'
        ? globalThis.structuredClone(data)
        : JSON.parse(JSON.stringify(data));
    },

    reset() {
      resetGameRecords(gameIds);
      data = createEmptyData(gameIds);
      return this.getSnapshot();
    },
  };
}
