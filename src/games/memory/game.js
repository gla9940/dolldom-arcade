import { drawBackdrop, drawRoundRect, palette } from '../shared/rendering.js';

const CARD_GAP = 14;
const CARD_WIDTH = 142;
const CARD_HEIGHT = 80;
const GRID_START_X = 55;
const GRID_START_Y = 28;

export const memoryGame = {
  id: 'memory',
  name: 'GLITCH MEMORY',
  title: '글리치 메모리',
  kicker: 'GAME 02 / NORMAL',
  copy: '45초 안에 같은 네온 심볼 여섯 쌍을 모두 찾으세요.',
  hint: 'CLICK / TAP — 카드 뒤집기',

  create({ context, width, height, onScore, onEnd, sound }) {
    let state;

    function init() {
      const symbols = ['◆', '●', '▲', '✦', '⬟', '≋'];
      state = {
        deck: [...symbols, ...symbols]
          .sort(() => Math.random() - 0.5)
          .map((symbol) => ({ symbol, open: false, matched: false })),
        firstCardIndex: null,
        locked: false,
        closeDelay: 0,
        pendingPair: null,
        finishDelay: 0,
        finalScore: 0,
        timeRemaining: 45,
        matches: 0,
      };
      onScore(0);
    }

    function update(deltaTime) {
      if (state.finishDelay > 0) {
        state.finishDelay -= deltaTime;
        onScore(state.finalScore);
        if (state.finishDelay <= 0) onEnd('모든 기억 복구!', state.finalScore);
        return;
      }

      if (state.closeDelay > 0) {
        state.closeDelay -= deltaTime;
        if (state.closeDelay <= 0) {
          state.pendingPair.forEach((card) => {
            card.open = false;
          });
          state.pendingPair = null;
          state.firstCardIndex = null;
          state.locked = false;
        }
      }

      state.timeRemaining -= deltaTime;
      onScore(Math.max(0, state.matches * 220 + state.timeRemaining * 10));

      if (state.timeRemaining <= 0) onEnd('시간 초과!');
    }

    function pickCard(x, y) {
      if (state.locked || state.finishDelay > 0) return;

      const column = Math.floor((x - GRID_START_X) / (CARD_WIDTH + CARD_GAP));
      const row = Math.floor((y - GRID_START_Y) / (CARD_HEIGHT + CARD_GAP));
      if (column < 0 || column > 3 || row < 0 || row > 2) return;

      const cardIndex = row * 4 + column;
      const card = state.deck[cardIndex];
      if (!card || card.open || card.matched) return;

      card.open = true;
      sound.tone(360 + cardIndex * 18, 0.06);

      if (state.firstCardIndex === null) {
        state.firstCardIndex = cardIndex;
        return;
      }

      const firstCard = state.deck[state.firstCardIndex];
      if (firstCard.symbol === card.symbol) {
        firstCard.matched = true;
        card.matched = true;
        state.matches += 1;
        state.firstCardIndex = null;
        sound.tone(720, 0.12, 'sine');

        if (state.matches === 6) {
          state.finalScore = Math.round(1500 + state.timeRemaining * 30);
          state.finishDelay = 0.25;
          state.locked = true;
          onScore(state.finalScore);
        }
        return;
      }

      state.locked = true;
      state.closeDelay = 0.65;
      state.pendingPair = [firstCard, card];
    }

    function render() {
      drawBackdrop(context, width, height);

      state.deck.forEach((card, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const x = GRID_START_X + column * (CARD_WIDTH + CARD_GAP);
        const y = GRID_START_Y + row * (CARD_HEIGHT + CARD_GAP);

        drawRoundRect(
          context,
          x,
          y,
          CARD_WIDTH,
          CARD_HEIGHT,
          10,
          card.matched ? '#233d24' : card.open ? '#2b1749' : '#0f0b18',
          card.matched ? palette.lime : '#4b3869',
        );

        context.textAlign = 'center';
        context.textBaseline = 'middle';

        if (card.open || card.matched) {
          context.fillStyle = card.matched ? palette.lime : palette.pink;
          context.font = '700 34px sans-serif';
          context.shadowColor = context.fillStyle;
          context.shadowBlur = 12;
          context.fillText(card.symbol, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
          context.shadowBlur = 0;
        } else {
          context.fillStyle = '#392a50';
          context.font = '700 24px sans-serif';
          context.fillText('?', x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
        }
      });

      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.fillStyle = state.timeRemaining < 10 ? palette.danger : palette.lime;
      context.font = '700 14px monospace';
      context.fillText(`TIME ${Math.max(0, state.timeRemaining).toFixed(1)}s`, 55, 348);
    }

    return {
      init,
      update,
      render,
      onPointerDown: pickCard,
      destroy() {
        state.pendingPair = null;
        state.deck.length = 0;
      },
    };
  },
};
