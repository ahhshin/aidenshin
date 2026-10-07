// Illustration of a reinforcement-learning idea using a Block Blast-style
// board. The scores are made up to show the concept, not project results.
import { motion } from './motion.js';

const SIZE = 8;
const TILE_COLOURS = ['#6d5ba6', '#4f8f88', '#a5566b', '#7b6aa8', '#3f7d86'];

// Rows top to bottom. "#" is a filled block, "." is empty.
const START = [
  '........',
  '........',
  '........',
  '.......#',
  '##....##',
  '###..###',
  '.#####.#',
  '#.######',
];

const MOVES = {
  a: [[5, 3], [5, 4]], // completes row 6
  b: [[1, 1], [1, 2]],
  c: [[3, 4], [3, 5]],
};

const SCORES = {
  early: { a: 0.3, b: 0.38, c: 0.32 },
  later: { a: 0.86, b: 0.06, c: 0.08 },
};

export function initBlast(figure) {
  const board = figure.querySelector('.blast-board');
  const scoreRows = Array.from(figure.querySelectorAll('.blast-scores li'));
  const phaseInputs = Array.from(figure.querySelectorAll('input[name="blast-phase"]'));
  const play = figure.querySelector('[data-blast-play]');
  const reset = figure.querySelector('[data-blast-reset]');
  const status = figure.querySelector('.blast-status');
  const cells = [];
  let grid;
  let played = false;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      board.appendChild(cell);
      cells.push(cell);
    }
  }
  const cellAt = (r, c) => cells[r * SIZE + c];

  function phase() {
    return phaseInputs.find((input) => input.checked)?.value || 'early';
  }

  function topMove() {
    const scores = SCORES[phase()];
    return Object.keys(scores).sort((x, y) => scores[y] - scores[x])[0];
  }

  function render() {
    cells.forEach((cell, i) => {
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      cell.className = 'cell';
      cell.removeAttribute('data-label');
      cell.style.removeProperty('--cand');
      if (grid[r][c] === 1) {
        cell.classList.add('filled');
        cell.style.setProperty('--tile', TILE_COLOURS[(r * 3 + c) % TILE_COLOURS.length]);
      } else if (grid[r][c] === 2) {
        cell.classList.add('placed');
      }
    });
    if (!played) {
      Object.entries(MOVES).forEach(([key, spots]) => {
        const colour = `var(--${{ a: 'ember', b: 'sage', c: 'rose' }[key]})`;
        spots.forEach(([r, c], i) => {
          const cell = cellAt(r, c);
          cell.classList.add('cand');
          cell.style.setProperty('--cand', colour);
          if (i === 0) {
            cell.classList.add('cand-label');
            cell.dataset.label = key.toUpperCase();
          }
        });
      });
    }
  }

  function renderScores() {
    const scores = SCORES[phase()];
    const best = topMove();
    scoreRows.forEach((row) => {
      const key = row.dataset.move;
      row.querySelector('.score-bar > span').style.setProperty('--w', `${Math.round(scores[key] * 100)}%`);
      row.querySelector('.score-text').textContent = key === best ? ': highest score' : ': lower score';
    });
  }

  function start() {
    grid = START.map((row) => Array.from(row, (ch) => (ch === '#' ? 1 : 0)));
    played = false;
    play.disabled = false;
    status.textContent = '';
    render();
    renderScores();
  }

  play.addEventListener('click', () => {
    if (played) return;
    const key = topMove();
    played = true;
    play.disabled = true;
    MOVES[key].forEach(([r, c]) => (grid[r][c] = 2));
    render();
    const full = grid.map((row, r) => (row.every((v) => v > 0) ? r : -1)).filter((r) => r >= 0);
    if (!full.length) {
      status.textContent = `Played spot ${key.toUpperCase()}. No line cleared, so no reward this time.`;
      reset.focus();
      return;
    }
    const finish = () => {
      full.forEach((r) => grid[r].fill(0));
      render();
      status.textContent = `Played spot ${key.toUpperCase()}. A full line cleared, which earns a reward.`;
      reset.focus();
    };
    full.forEach((r) => {
      for (let c = 0; c < SIZE; c++) cellAt(r, c).classList.add('clearing');
    });
    if (motion.on) setTimeout(finish, 700);
    else finish();
  });

  reset.addEventListener('click', () => {
    start();
    play.focus();
  });
  phaseInputs.forEach((input) => input.addEventListener('change', start));

  start();
}
