const DIFFICULTIES = ['easy', 'medium', 'hard'];
const TASK_TYPES = ['daily', 'normal'];

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Validate an event payload.
 * @param {object} body
 * @param {{ asDraft?: boolean }} opts - asDraft=true skips "required" checks,
 *   but still type-checks any field that IS present.
 */
function validateEventPayload(body, { asDraft = false } = {}) {
  const errors = [];
  const { title, description, event_category_id, event_date, event_time } = body;

  if (!asDraft) {
    if (!isNonEmptyString(title)) errors.push('title is required');
    if (!isNonEmptyString(description)) errors.push('description is required');
    if (event_category_id === undefined || event_category_id === null) errors.push('event_category_id is required');
    if (!isNonEmptyString(event_date)) errors.push('event_date is required');
  } else {
    if (title !== undefined && title !== null && !isNonEmptyString(title)) errors.push('title cannot be blank if provided');
    if (description !== undefined && description !== null && !isNonEmptyString(description)) errors.push('description cannot be blank if provided');
  }

  if (event_category_id !== undefined && event_category_id !== null && !Number.isInteger(Number(event_category_id))) {
    errors.push('event_category_id must be an integer');
  }
  if (event_date !== undefined && event_date !== null && isNaN(Date.parse(event_date))) {
    errors.push('event_date must be a valid date');
  }
  if (event_time !== undefined && event_time !== null && !/^\d{2}:\d{2}(:\d{2})?$/.test(event_time)) {
    errors.push('event_time must be in HH:MM format');
  }

  if (errors.length) throw new ValidationError('Invalid event payload', errors);
}

/**
 * Validate a task payload. Enforces the daily/normal field rules
 * (mirrors the DB's chk_tasks_active_complete constraint) whenever
 * the task is being treated as a complete/active record.
 */
function validateTaskPayload(body, { asDraft = false } = {}) {
  const errors = [];
  const { title, description, task_category_id, task_type, due_date, due_time, difficulty } = body;

  if (!TASK_TYPES.includes(task_type)) {
    errors.push(`task_type is required and must be one of: ${TASK_TYPES.join(', ')}`);
  }

  if (!asDraft) {
    if (!isNonEmptyString(title)) errors.push('title is required');
    if (!isNonEmptyString(description)) errors.push('description is required');
    if (task_category_id === undefined || task_category_id === null) errors.push('task_category_id is required');

    if (task_type === 'daily') {
      if (due_date || due_time || difficulty) {
        errors.push('daily tasks must not have due_date, due_time, or difficulty');
      }
    } else if (task_type === 'normal') {
      if (!isNonEmptyString(due_date)) errors.push('due_date is required for normal tasks');
      if (!DIFFICULTIES.includes(difficulty)) errors.push(`difficulty is required for normal tasks and must be one of: ${DIFFICULTIES.join(', ')}`);
    }
  } else {
    if (title !== undefined && title !== null && !isNonEmptyString(title)) errors.push('title cannot be blank if provided');
    if (description !== undefined && description !== null && !isNonEmptyString(description)) errors.push('description cannot be blank if provided');
    if (difficulty !== undefined && difficulty !== null && !DIFFICULTIES.includes(difficulty)) {
      errors.push(`difficulty must be one of: ${DIFFICULTIES.join(', ')}`);
    }
    if (due_date !== undefined && due_date !== null && isNaN(Date.parse(due_date))) {
      errors.push('due_date must be a valid date');
    }
  }

  if (errors.length) throw new ValidationError('Invalid task payload', errors);
}

module.exports = { ValidationError, validateEventPayload, validateTaskPayload, DIFFICULTIES, TASK_TYPES };
