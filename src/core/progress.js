import { readJson, resetGameRecords, writeJson } from './storage.js';

const CURRENT_VERSION = 2;
const RECENT_RUN_LIMIT = 8;

function achievement(id, title, description, target, getCurrent) {
  return {
    id,
    title,
    description,
    target,
    getCurrent,
    check: (data, gameIds) => {
      const resolvedTarget = typeof target === 'function' ? target(data, gameIds) : target;
      return getCurrent(data, gameIds) >= resolvedTarget;
    },
  };
}

export const achievementDefinitions = [
  achievement('first-play', '첫 전파', '첫 게임을 완료하세요.', 1, (data) => data.totalCompleted),
  achievement(
    'all-games',
    '아케이드 탐험가',
    '모든 게임을 한 번 이상 플레이하세요.',
    (_data, gameIds) => gameIds.length,
    (data, gameIds) => gameIds.filter((id) => data.games[id]?.plays > 0).length,
  ),
  achievement('runner-1000', '네온 질주', '네온 러너에서 1,000점을 달성하세요.', 1000, (data) => data.games.runner?.bestRun ?? 0),
  achievement('memory-clear', '완벽한 기억', '글리치 메모리를 한 번 복구하세요.', 1, (data) => data.games.memory?.clears ?? 0),
  achievement('reaction-3000', '초고속 신호', '블록 캐처에서 3,000점을 달성하세요.', 3000, (data) => data.games.reaction?.bestRun ?? 0),
  achievement('dodge-1200', '보이드 생존자', '보이드 드리프터에서 60초를 생존하세요.', 1200, (data) => data.games.dodge?.bestRun ?? 0),
];

function createGameStats() {
  return {
    plays: 0,
    completed: 0,
    totalScore: 0,
    bestRun: 0,
    clears: 0,
    lastScore: 0,
    lastPlayedAt: null,
  };
}

function createEmptyData(gameIds) {
  return {
    version: CURRENT_VERSION,
    totalPlays: 0,
    totalCompleted: 0,
    totalScore: 0,
    achievements: [],
    recentRuns: [],
    games: Object.fromEntries(gameIds.map((id) => [id, createGameStats()])),
  };
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function safeTimestamp(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
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
  empty.recentRuns = Array.isArray(rawData.recentRuns)
    ? rawData.recentRuns
      .filter((run) => gameIds.includes(run?.gameId))
      .slice(0, RECENT_RUN_LIMIT)
      .map((run) => ({
        gameId: run.gameId,
        score: safeNumber(run.score),
        outcome: typeof run.outcome === 'string' ? run.outcome.slice(0, 80) : '',
        playedAt: safeTimestamp(run.playedAt),
      }))
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
      lastScore: safeNumber(source.lastScore),
      lastPlayedAt: safeTimestamp(source.lastPlayedAt),
    };
  });
  return empty;
}

export function createProgressManager(gameIds, { now = () => new Date() } = {}) {
  let data = normalizeProgress(readJson('progress', null), gameIds);

  function save() {
    data.version = CURRENT_VERSION;
    writeJson('progress', data);
  }

  function unlockAchievements() {
    const unlocked = new Set(data.achievements);
    const newAchievements = achievementDefinitions.filter(
      (item) => !unlocked.has(item.id) && item.check(data, gameIds),
    );
    newAchievements.forEach((item) => data.achievements.push(item.id));
    return newAchievements;
  }

  save();

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
      const playedAt = now().toISOString();
      const game = data.games[gameId];
      game.completed += 1;
      game.totalScore += safeScore;
      game.bestRun = Math.max(game.bestRun, safeScore);
      game.lastScore = safeScore;
      game.lastPlayedAt = playedAt;
      if (gameId === 'memory' && outcome.includes('복구')) game.clears += 1;
      data.totalCompleted += 1;
      data.totalScore += safeScore;
      data.recentRuns.unshift({ gameId, score: safeScore, outcome: outcome.slice(0, 80), playedAt });
      data.recentRuns.length = Math.min(data.recentRuns.length, RECENT_RUN_LIMIT);
      const unlocked = unlockAchievements();
      save();
      return unlocked;
    },

    getAchievementProgress(definition) {
      const target = typeof definition.target === 'function'
        ? safeNumber(definition.target(data, gameIds))
        : definition.target;
      const current = Math.min(target, safeNumber(definition.getCurrent(data, gameIds)));
      return {
        current,
        target,
        percentage: target ? Math.round((current / target) * 100) : 100,
      };
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
