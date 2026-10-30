const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // 忽略格式错误的本地 .env，由下方默认值兜底
  }
}

function loadConfig(overrides = {}) {
  const port = Number(overrides.port || process.env.PORT || 4000);
  const frontendOrigin =
    overrides.frontendOrigin || process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  const sqlitePath =
    overrides.sqlitePath ||
    process.env.SQLITE_PATH ||
    path.resolve(__dirname, 'data', 'chery.db');

  const accessTokenSecret =
    overrides.accessTokenSecret ||
    process.env.ACCESS_TOKEN_SECRET ||
    'chery-dev-access-token-secret-change-in-prod';
  const refreshTokenSecret =
    overrides.refreshTokenSecret ||
    process.env.REFRESH_TOKEN_SECRET ||
    'chery-dev-refresh-token-secret-change-in-prod';
  const accessTokenTtl = Number(
    overrides.accessTokenTtl || process.env.ACCESS_TOKEN_TTL || 15 * 60
  );
  const refreshTokenTtl = Number(
    overrides.refreshTokenTtl || process.env.REFRESH_TOKEN_TTL || 7 * 24 * 60 * 60
  );

  const pocketIdIssuer = (
    overrides.pocketIdIssuer ??
    process.env.POCKET_ID_ISSUER ??
    ''
  ).trim();
  const pocketIdClientId = (
    overrides.pocketIdClientId ??
    process.env.POCKET_ID_CLIENT_ID ??
    ''
  ).trim();
  const pocketIdClientSecret = (
    overrides.pocketIdClientSecret ??
    process.env.POCKET_ID_CLIENT_SECRET ??
    ''
  ).trim();
  const pocketIdRedirectUri = (
    overrides.pocketIdRedirectUri ||
    process.env.POCKET_ID_REDIRECT_URI ||
    `http://localhost:${port}/api/auth/pocket-id/callback`
  ).trim();
  const pocketIdScopes = (
    overrides.pocketIdScopes ||
    process.env.POCKET_ID_SCOPES ||
    'openid profile email'
  ).trim();

  return {
    prefix: '/api',
    port,
    frontendOrigin,
    sqlitePath,
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenTtl,
    refreshTokenTtl,
    pocketId: {
      issuer: pocketIdIssuer,
      clientId: pocketIdClientId,
      clientSecret: pocketIdClientSecret,
      redirectUri: pocketIdRedirectUri,
      scopes: pocketIdScopes,
      enabled: Boolean(pocketIdIssuer && pocketIdClientId)
    }
  };
}

const defaultConfig = loadConfig();

module.exports = {
  ...defaultConfig,
  loadConfig
};
