const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { ValidationError } = require('./utils/validation');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api', routes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — turns DB CHECK-constraint violations and
// ValidationErrors into clean 400s instead of leaking raw Postgres errors.
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  // Postgres error codes: 23514 = check_violation, 23503 = foreign_key_violation,
  // 23505 = unique_violation, 22P02 = invalid_text_representation (bad enum value, etc.)
  if (err.code === '23514') {
    return res.status(400).json({ error: 'This item is missing required fields to be active/complete.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced category does not exist.' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'This action conflicts with an existing record.' });
  }
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'One or more fields have an invalid value.' });
  }

  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
