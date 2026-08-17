require('dotenv').config();
const app = require('./app');
const { startJobs } = require('./jobs');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Flow backend listening on port ${PORT}`);
  startJobs();
});
