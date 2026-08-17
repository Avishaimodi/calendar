const dayjs = require('dayjs');

const MATRIX_SCORES = {
  '15_plus_days':   { easy: 1, medium: 2, hard: 3 },
  'within_14_days':  { easy: 2, medium: 4, hard: 6 },
  'urgent_3_days':   { easy: 3, medium: 6, hard: 9 },
};

/**
 * @param {string|Date} dueDate - a DATE value (e.g. '2026-08-20')
 * @param {string} [today] - override "today" for testing, format YYYY-MM-DD
 * @returns {'15_plus_days'|'within_14_days'|'urgent_3_days'}
 */
function getUrgencyBand(dueDate, today = dayjs().format('YYYY-MM-DD')) {
  const diffDays = dayjs(dueDate).startOf('day').diff(dayjs(today).startOf('day'), 'day');

  if (diffDays <= 3) return 'urgent_3_days';
  if (diffDays <= 14) return 'within_14_days';
  return '15_plus_days';
}

/**
 * @param {string} urgencyBand
 * @param {'easy'|'medium'|'hard'} difficulty
 * @returns {number}
 */
function getMatrixScore(urgencyBand, difficulty) {
  const band = MATRIX_SCORES[urgencyBand];
  if (!band || !(difficulty in band)) {
    throw new Error(`Invalid urgencyBand/difficulty combo: ${urgencyBand}/${difficulty}`);
  }
  return band[difficulty];
}

/** Convenience: compute both band + score from a due date + difficulty */
function computeUrgencyAndScore(dueDate, difficulty, today) {
  const urgency_band = getUrgencyBand(dueDate, today);
  const matrix_score = getMatrixScore(urgency_band, difficulty);
  return { urgency_band, matrix_score };
}

module.exports = { MATRIX_SCORES, getUrgencyBand, getMatrixScore, computeUrgencyAndScore };
