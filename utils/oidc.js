const crypto = require('crypto');

function base64UrlEncode(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecodeToBuffer(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

function generatePkcePair() {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const challengeHash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(challengeHash);
  return { codeVerifier, codeChallenge };
}

function generateRandomToken(byteLength = 24) {
  return base64UrlEncode(crypto.randomBytes(byteLength));
}

function sanitizeReturnTo(rawReturnTo) {
  if (!rawReturnTo || typeof rawReturnTo !== 'string') return '/';
  const trimmed = rawReturnTo.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/';
  }
  if (trimmed.startsWith('/login')) {
    return '/';
  }
  return trimmed;
}

function verifyJwtWithJwk(idToken, jwks) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID Token format');
  }

  const [rawHeader, rawPayload, rawSignature] = parts;
  const header = JSON.parse(base64UrlDecodeToBuffer(rawHeader).toString('utf8'));
  const payload = JSON.parse(base64UrlDecodeToBuffer(rawPayload).toString('utf8'));
  const signature = base64UrlDecodeToBuffer(rawSignature);
  const signingInput = Buffer.from(`${rawHeader}.${rawPayload}`, 'utf8');

  const keys = Array.isArray(jwks?.keys) ? jwks.keys : [];
  const candidateKeys = header.kid
    ? keys.filter((k) => k.kid === header.kid)
    : keys;

  if (candidateKeys.length === 0) {
    throw new Error('No matching JWK found for ID Token');
  }

  let verified = false;
  for (const jwk of candidateKeys) {
    try {
      const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
      const alg = header.alg || jwk.alg || 'RS256';
      if (alg === 'RS256' || alg === 'RS384' || alg === 'RS512') {
        const hashAlg = `RSA-SHA${alg.slice(2)}`;
        if (crypto.verify(hashAlg, signingInput, publicKey, signature)) {
          verified = true;
          break;
        }
      } else if (alg === 'ES256' || alg === 'ES384' || alg === 'ES512') {
        const hashAlg = `SHA${alg.slice(2)}`;
        if (
          crypto.verify(
            hashAlg,
            signingInput,
            { key: publicKey, dsaEncoding: 'ieee-p1363' },
            signature
          )
        ) {
          verified = true;
          break;
        }
      } else if (alg === 'EdDSA') {
        if (crypto.verify(null, signingInput, publicKey, signature)) {
          verified = true;
          break;
        }
      }
    } catch {
      // 尝试下一个候选公钥
    }
  }

  if (!verified) {
    throw new Error('ID Token signature verification failed');
  }

  return payload;
}

function createOidcService({ pocketIdConfig, getDynamicConfig, fetchImpl = globalThis.fetch }) {
  let cachedMetadata = null;
  let cachedIssuer = '';
  let cachedAt = 0;
  const CACHE_TTL_MS = 5 * 60 * 1000;

  function normalizeIssuer(issuer) {
    return String(issuer || '').trim().replace(/\/+$/, '');
  }

  function getEffectiveConfig() {
    const base = pocketIdConfig || {};
    const dynamic = typeof getDynamicConfig === 'function' ? getDynamicConfig() : null;
    const issuer = normalizeIssuer(dynamic?.issuer ?? base.issuer ?? '');
    const clientId = String(dynamic?.clientId ?? base.clientId ?? '').trim();
    const clientSecret = String(dynamic?.clientSecret ?? base.clientSecret ?? '').trim();
    const redirectUri = String(dynamic?.redirectUri || base.redirectUri || '').trim();
    const scopes = String(dynamic?.scopes || base.scopes || 'openid profile email').trim();
    return {
      issuer,
      clientId,
      clientSecret,
      redirectUri,
      scopes,
      enabled: Boolean(issuer && clientId)
    };
  }

  function clearCache() {
    cachedMetadata = null;
    cachedIssuer = '';
    cachedAt = 0;
  }

  async function discover() {
    const cfg = getEffectiveConfig();
    if (!cfg.enabled) {
      throw new Error('Pocket ID OIDC 尚未配置');
    }
    const now = Date.now();
    if (cachedMetadata && cachedIssuer === cfg.issuer && now - cachedAt < CACHE_TTL_MS) {
      return { metadata: cachedMetadata, cfg };
    }
    const discoveryUrl = `${cfg.issuer}/.well-known/openid-configuration`;
    const res = await fetchImpl(discoveryUrl, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`OIDC discovery 请求失败 (${res.status})`);
    }
    const metadata = await res.json();
    cachedMetadata = metadata;
    cachedIssuer = cfg.issuer;
    cachedAt = now;
    return { metadata, cfg };
  }

  async function buildAuthorizationTransaction({ returnTo }) {
    const { metadata, cfg } = await discover();
    const state = generateRandomToken(24);
    const nonce = generateRandomToken(24);
    const { codeVerifier, codeChallenge } = generatePkcePair();
    const safeReturnTo = sanitizeReturnTo(returnTo);

    const authUrl = new URL(metadata.authorization_endpoint);
    authUrl.searchParams.set('client_id', cfg.clientId);
    authUrl.searchParams.set('redirect_uri', cfg.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', cfg.scopes || 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return {
      authorizationUrl: authUrl.toString(),
      state,
      nonce,
      codeVerifier,
      returnTo: safeReturnTo
    };
  }

  async function exchangeCodeAndVerify({ code, codeVerifier, expectedNonce }) {
    const { metadata, cfg } = await discover();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId,
      code_verifier: codeVerifier
    });

    if (cfg.clientSecret) {
      body.set('client_secret', cfg.clientSecret);
    }

    const tokenRes = await fetchImpl(metadata.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: body.toString()
    });

    if (!tokenRes.ok) {
      throw new Error(`OIDC token 交换失败 (${tokenRes.status})`);
    }

    const tokenSet = await tokenRes.json();
    if (!tokenSet.id_token) {
      throw new Error('OIDC 响应缺少 id_token');
    }

    const jwksRes = await fetchImpl(metadata.jwks_uri, {
      headers: { Accept: 'application/json' }
    });
    if (!jwksRes.ok) {
      throw new Error(`OIDC JWKS 获取失败 (${jwksRes.status})`);
    }
    const jwks = await jwksRes.json();

    const claims = verifyJwtWithJwk(tokenSet.id_token, jwks);
    const expectedIssuer = normalizeIssuer(metadata.issuer || cfg.issuer);
    const actualIssuer = normalizeIssuer(claims.iss);

    if (actualIssuer !== expectedIssuer) {
      throw new Error('ID Token issuer 不匹配');
    }

    const audList = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audList.includes(cfg.clientId)) {
      throw new Error('ID Token audience 不匹配');
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== 'number' || claims.exp <= nowSec - 30) {
      throw new Error('ID Token 已过期');
    }

    if (claims.nonce !== expectedNonce) {
      throw new Error('ID Token nonce 不匹配');
    }

    if (!claims.sub) {
      throw new Error('ID Token 缺少 sub 声明');
    }

    let userInfo = {};
    if (
      tokenSet.access_token &&
      metadata.userinfo_endpoint &&
      (!claims.name && !claims.preferred_username && !claims.email)
    ) {
      try {
        const uiRes = await fetchImpl(metadata.userinfo_endpoint, {
          headers: {
            Authorization: `Bearer ${tokenSet.access_token}`,
            Accept: 'application/json'
          }
        });
        if (uiRes.ok) {
          const uiData = await uiRes.json();
          if (uiData && uiData.sub === claims.sub) {
            userInfo = uiData;
          }
        }
      } catch {
        // userinfo 作为补充信息，失败不阻断已验证的 ID Token
      }
    }

    return {
      issuer: expectedIssuer,
      subject: String(claims.sub),
      name:
        claims.name ||
        userInfo.name ||
        claims.preferred_username ||
        userInfo.preferred_username ||
        '',
      preferredUsername:
        claims.preferred_username || userInfo.preferred_username || claims.name || '',
      email: claims.email || userInfo.email || ''
    };
  }

  return {
    isEnabled() {
      return getEffectiveConfig().enabled;
    },
    getEffectiveConfig,
    clearCache,
    buildAuthorizationTransaction,
    exchangeCodeAndVerify,
    sanitizeReturnTo
  };
}

module.exports = {
  createOidcService,
  generatePkcePair,
  sanitizeReturnTo,
  verifyJwtWithJwk,
  base64UrlEncode
};
