const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const authRouter = require('./routes/auth');
const fileRouter = require('./routes/file');
const openapiDocument = require('./openapi.json');

const app = express();

app.use(
  cors({
    origin: true,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/openapi.json', (_req, res) => {
  res.json(openapiDocument);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument, {
    customSiteTitle: 'ERP.AERO API',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  })
);

app.use(authRouter);
app.use('/file', fileRouter);

app.use((err, _req, res, _next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
