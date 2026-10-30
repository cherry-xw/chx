const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const pkg = require('./package.json');
const { loadConfig } = require('./config');
const { createDatabase } = require('./db/sqlite');
const { createAuthRepository } = require('./db/authRepo');
const { createTokenService } = require('./utils/token');
const { createOidcService } = require('./utils/oidc');
const { createAuthRouter } = require('./routes/users');

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://ww.xcherry.top',
  'http://ww.xcherry.top',
  'https://www.xcherry.top',
  'http://www.xcherry.top',
  'https://xcherry.top',
  'http://xcherry.top'
];

function createApp(options = {}) {
  const config = loadConfig(options.config);
  const db = options.db || createDatabase(config.sqlitePath);
  const authRepo = createAuthRepository(db);
  const tokenService = createTokenService({ config, authRepo });
  const oidcService = createOidcService({
    pocketIdConfig: config.pocketId,
    getDynamicConfig: () => authRepo.getPocketIdSettings(),
    fetchImpl: options.fetchImpl
  });

  const app = express();
  app.locals.db = db;
  app.locals.config = config;
  app.locals.authRepo = authRepo;
  app.locals.tokenService = tokenService;
  app.locals.oidcService = oidcService;

  const allowedOrigins = new Set([
    ...DEFAULT_CORS_ORIGINS,
    config.frontendOrigin
  ]);

  app.all(
    '*',
    cors((req, callback) => {
      const origin = req.header('Origin');
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, { origin: true, credentials: true, optionsSuccessStatus: 200 });
      } else {
        callback(null, { origin: false });
      }
    })
  );

  if (options.enableLogger !== false && process.env.NODE_ENV !== 'test') {
    app.use(logger('dev'));
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.get('/api/test', (req, res) => {
    res.json({
      status: true,
      msg: '服务正常',
      data: { status: 'ok' }
    });
  });

  app.get('/api/version', (req, res) => {
    res.json({
      status: true,
      msg: '服务正常',
      data: {
        name: pkg.name,
        version: pkg.version
      }
    });
  });

  const authRouter = createAuthRouter({
    config,
    authRepo,
    tokenService,
    oidcService
  });
  app.use(config.prefix, authRouter);

  app.use((req, res) => {
    res.status(404).json({
      status: false,
      msg: '接口不存在',
      data: null
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({
      status: false,
      msg: err.message || '服务器内部错误',
      data: null
    });
  });

  return app;
}

const app = createApp();
app.createApp = createApp;

module.exports = app;
