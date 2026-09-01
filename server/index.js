require('dotenv').config();

const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`AuditMe API listening on http://localhost:${PORT}`);
});
