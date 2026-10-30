const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { Duplex } = require('node:stream');
const { createApp } = require('../app');
const { aesEncrypt } = require('../utils/hashers');
const { base64UrlEncode } = require('../utils/oidc');

class MemorySocket extends Duplex {
  _read() {}
  _write(chunk, encoding, callback) {
    callback();
  }
}

function invokeApp(app, { method = 'GET', url = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new MemorySocket();
    socket.remoteAddress = '127.0.0.1';
    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.headers = {};

    for (const [k, v] of Object.entries(headers)) {
      req.headers[k.toLowerCase()] = String(v);
    }

    let rawBody = '';
    if (body !== undefined) {
      rawBody = typeof body === 'string' ? body : JSON.stringify(body);
      if (!req.headers['content-type']) {
        req.headers['content-type'] = 'application/json';
      }
      req.headers['content-length'] = String(Buffer.byteLength(rawBody));
    }

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    const chunks = [];
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = (chunk, encoding, cb) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return origWrite(chunk, encoding, cb);
    };

    res.end = (chunk, encoding, cb) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      origEnd(chunk, encoding, cb);
      const text = Buffer.concat(chunks).toString('utf8');
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        // 非 JSON 响应（如 302 重定向）
      }
      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        text,
        json
      });
    };

    app.handle(req, res, reject);

    process.nextTick(() => {
      if (rawBody) {
        req.push(rawBody);
      }
      req.push(null);
    });
  });
}

function createSignedIdToken({
  privateKey,
  kid,
  issuer,
  clientId,
  sub,
  nonce,
  name,
  preferredUsername,
  email,
  expOffsetSec = 300
}) {
  const header = { alg: 'RS256', typ: 'JWT', kid };
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuer,
    sub,
    aud: clientId,
    iat: nowSec,
    exp: nowSec + expOffsetSec,
    nonce,
    name,
    preferred_username: preferredUsername || name,
    email
  };
  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8');
  const sig = crypto.sign('RSA-SHA256', signingInput, privateKey);
  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(sig)}`;
}

test('GET /api/version 专用接口正常返回 package.json 声明的名称与版本号，且部署脚本支持递增小版本', async () => {
  const pkg = require('../package.json');
  const { bumpPatchVersion, bumpPackageVersion } = require('../scripts/deploy');
  const ecosystem = require('../ecosystem.config');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');

  const app = createApp({
    enableLogger: false,
    config: {
      sqlitePath: ':memory:'
    }
  });

  const res = await invokeApp(app, { method: 'GET', url: '/api/version' });
  assert.equal(res.status, 200);
  assert.equal(res.json.status, true);
  assert.equal(res.json.msg, '服务正常');
  assert.equal(res.json.data.name, pkg.name);
  assert.equal(res.json.data.version, pkg.version);

  // 校验 PM2 watch 包含 package.json，确保版本号变更可触发自动重载
  assert.ok(ecosystem.apps[0].watch.includes('package.json'));

  // 校验版本号递增逻辑
  assert.equal(bumpPatchVersion('1.0.0'), '1.0.1');
  assert.equal(bumpPatchVersion('1.2.9'), '1.2.10');
  assert.equal(bumpPatchVersion('0.0.0'), '1.0.1');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chery-backend-ver-'));
  try {
    const tmpPkgPath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(tmpPkgPath, JSON.stringify({ name: 'cheryservice', version: '1.0.0' }, null, 2));
    const bumped = bumpPackageVersion(tmpPkgPath);
    assert.deepEqual(bumped, { previousVersion: '1.0.0', nextVersion: '1.0.1' });
    const updated = JSON.parse(fs.readFileSync(tmpPkgPath, 'utf8'));
    assert.equal(updated.version, '1.0.1');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('受控注册与邀请码闭环：禁止无邀请码随意注册，chery 管理员生成邀请码后单次有效', async () => {
  const app = createApp({
    enableLogger: false,
    config: {
      sqlitePath: ':memory:',
      accessTokenTtl: 60,
      refreshTokenTtl: 3600
    }
  });

  // 1. 普通用户 alice 无邀请码直接注册必须被拒绝
  const codeNoInvite = await invokeApp(app, { method: 'GET', url: '/api/verifycode' });
  const rejectRes = await invokeApp(app, {
    method: 'POST',
    url: '/api/regist',
    body: {
      username: aesEncrypt('alice', codeNoInvite.json.data.value),
      password: aesEncrypt('pass123456', codeNoInvite.json.data.value),
      verifyCodeKey: codeNoInvite.json.data.key
    }
  });
  assert.equal(rejectRes.json.status, false);
  assert.match(rejectRes.json.msg, /邀请码/);

  // 2. 首次初始化管理员 chery 免邀请码注册成功
  const codeChery = await invokeApp(app, { method: 'GET', url: '/api/verifycode' });
  const cheryReg = await invokeApp(app, {
    method: 'POST',
    url: '/api/regist',
    body: {
      username: aesEncrypt('chery', codeChery.json.data.value),
      password: aesEncrypt('admin123456', codeChery.json.data.value),
      verifyCodeKey: codeChery.json.data.key,
      name: 'chery'
    }
  });
  assert.equal(cheryReg.status, 200);
  assert.equal(cheryReg.json.status, true);
  assert.equal(cheryReg.json.data.user.username, 'chery');
  assert.equal(cheryReg.json.data.user.isAdmin, true);
  const cheryAccessToken = cheryReg.json.data.accessToken;

  // 3. chery 管理员生成邀请码
  const inviteRes = await invokeApp(app, {
    method: 'POST',
    url: '/api/admin/invite-codes',
    headers: { Authorization: cheryAccessToken },
    body: { note: '给 Alice 测试使用', expiresInDays: 7 }
  });
  assert.equal(inviteRes.status, 200);
  assert.equal(inviteRes.json.status, true);
  const inviteCode = inviteRes.json.data.code;
  assert.ok(inviteCode.startsWith('CHX-'));

  // 4. alice 使用邀请码注册成功
  const code1 = await invokeApp(app, { method: 'GET', url: '/api/verifycode' });
  const regRes = await invokeApp(app, {
    method: 'POST',
    url: '/api/regist',
    body: {
      username: aesEncrypt('alice', code1.json.data.value),
      password: aesEncrypt('pass123456', code1.json.data.value),
      verifyCodeKey: code1.json.data.key,
      name: 'Alice',
      inviteCode
    }
  });
  assert.equal(regRes.status, 200);
  assert.equal(regRes.json.status, true);
  assert.equal(regRes.json.data.user.name, 'Alice');
  assert.equal(regRes.json.data.user.isAdmin, false);

  // 5. 非 chery 用户（alice）尝试生成邀请码必须返回 403
  const forbiddenInvite = await invokeApp(app, {
    method: 'POST',
    url: '/api/admin/invite-codes',
    headers: { Authorization: regRes.json.data.accessToken },
    body: {}
  });
  assert.equal(forbiddenInvite.status, 403);

  // 6. 同一邀请码二次使用注册 bob 必须失败
  const codeBob = await invokeApp(app, { method: 'GET', url: '/api/verifycode' });
  const bobRes = await invokeApp(app, {
    method: 'POST',
    url: '/api/regist',
    body: {
      username: aesEncrypt('bob', codeBob.json.data.value),
      password: aesEncrypt('pass123456', codeBob.json.data.value),
      verifyCodeKey: codeBob.json.data.key,
      inviteCode
    }
  });
  assert.equal(bobRes.json.status, false);
  assert.match(bobRes.json.msg, /邀请码/);

  // 7. 本地登录与双 Token 轮换、防重放、登出
  const code2 = await invokeApp(app, { method: 'GET', url: '/api/verifycode' });
  const loginRes = await invokeApp(app, {
    method: 'POST',
    url: '/api/login',
    body: {
      username: aesEncrypt('alice', code2.json.data.value),
      password: aesEncrypt('pass123456', code2.json.data.value),
      verifyCodeKey: code2.json.data.key
    }
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.json.status, true);
  const { accessToken, refreshToken } = loginRes.json.data;

  const meRes = await invokeApp(app, {
    method: 'GET',
    url: '/api/userinfo',
    headers: { Authorization: accessToken }
  });
  assert.equal(meRes.status, 200);
  assert.equal(meRes.json.data.username, 'alice');

  const refreshRes = await invokeApp(app, {
    method: 'POST',
    url: '/api/refreshToken',
    headers: { Authorization: refreshToken }
  });
  assert.equal(refreshRes.status, 200);
  assert.equal(refreshRes.json.status, true);

  const replayRefresh = await invokeApp(app, {
    method: 'POST',
    url: '/api/refreshToken',
    headers: { Authorization: refreshToken }
  });
  assert.equal(replayRefresh.status, 401);

  const logoutRes = await invokeApp(app, {
    method: 'POST',
    url: '/api/logout',
    body: { refreshToken: refreshRes.json.data.refreshToken }
  });
  assert.equal(logoutRes.status, 200);
});

test('Pocket ID 在线配置、chery 同名自动合并、以及陌生 Pocket ID 强制邀请码激活闭环', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicJwk = {
    ...publicKey.export({ format: 'jwk' }),
    kid: 'pocket-key-1',
    alg: 'RS256',
    use: 'sig'
  };

  const issuer = 'https://pocket.example.com';
  const clientId = 'chery-web-client';
  const clientSecret = 'chery-web-secret';
  let currentNonce = '';
  let lastCodeVerifier = '';
  let currentSub = 'pocket-chery-001';
  let currentName = 'chery';
  let currentPreferredUsername = 'chery';
  let currentEmail = 'chery@example.com';

  const mockFetch = async (url, options = {}) => {
    const target = String(url);
    if (target === `${issuer}/.well-known/openid-configuration`) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            issuer,
            authorization_endpoint: `${issuer}/authorize`,
            token_endpoint: `${issuer}/token`,
            jwks_uri: `${issuer}/jwks.json`,
            userinfo_endpoint: `${issuer}/userinfo`
          };
        }
      };
    }

    if (target === `${issuer}/token`) {
      const params = new URLSearchParams(options.body);
      lastCodeVerifier = params.get('code_verifier') || '';
      const idToken = createSignedIdToken({
        privateKey,
        kid: 'pocket-key-1',
        issuer,
        clientId,
        sub: currentSub,
        nonce: currentNonce,
        name: currentName,
        preferredUsername: currentPreferredUsername,
        email: currentEmail
      });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            access_token: 'mock-oidc-access-token',
            id_token: idToken,
            token_type: 'Bearer',
            expires_in: 300
          };
        }
      };
    }

    if (target === `${issuer}/jwks.json`) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { keys: [publicJwk] };
        }
      };
    }

    throw new Error(`Unexpected fetch URL: ${target}`);
  };

  // 启动时故意不配环境变量中的 Pocket ID，验证管理员通过前端管理后台在线配置生效
  const app = createApp({
    enableLogger: false,
    fetchImpl: mockFetch,
    config: {
      sqlitePath: ':memory:',
      frontendOrigin: 'http://localhost:5173',
      pocketIdIssuer: '',
      pocketIdClientId: '',
      pocketIdClientSecret: ''
    }
  });

  // 1. 初始化本地 chery 管理员并在线配置 Pocket ID
  const codeChery = await invokeApp(app, { method: 'GET', url: '/api/verifycode' });
  const cheryReg = await invokeApp(app, {
    method: 'POST',
    url: '/api/regist',
    body: {
      username: aesEncrypt('chery', codeChery.json.data.value),
      password: aesEncrypt('admin123456', codeChery.json.data.value),
      verifyCodeKey: codeChery.json.data.key
    }
  });
  const cheryId = cheryReg.json.data.user.id;
  const cheryToken = cheryReg.json.data.accessToken;

  const saveCfgRes = await invokeApp(app, {
    method: 'PUT',
    url: '/api/admin/pocket-id',
    headers: { Authorization: cheryToken },
    body: {
      issuer,
      clientId,
      clientSecret,
      redirectUri: 'https://www.xcherry.top/api/auth/pocket-id/callback',
      scopes: 'openid profile email'
    }
  });
  assert.equal(saveCfgRes.status, 200);
  assert.equal(saveCfgRes.json.data.enabled, true);

  // 2. Pocket ID 中的 chery 登录，应自动合并绑定到已有的本地 chery 管理员账号（同一 user_id）
  const loginRedirect = await invokeApp(app, {
    method: 'GET',
    url: '/api/auth/pocket-id/login?from=%2Fmain%2Fmqtt'
  });
  assert.equal(loginRedirect.status, 302);
  const authUrl = new URL(loginRedirect.headers.location);
  const state = authUrl.searchParams.get('state');
  currentNonce = authUrl.searchParams.get('nonce');
  const expectedChallenge = authUrl.searchParams.get('code_challenge');

  const callbackRes = await invokeApp(app, {
    method: 'GET',
    url: `/api/auth/pocket-id/callback?code=auth_code_123&state=${encodeURIComponent(state)}`
  });
  assert.equal(callbackRes.status, 302);
  assert.ok(
    String(callbackRes.headers.location).startsWith('https://www.xcherry.top/#/login?'),
    '回调重定向应自动使用在线配置 redirectUri 的前端域名而非 localhost:5173'
  );

  const computedChallenge = base64UrlEncode(
    crypto.createHash('sha256').update(lastCodeVerifier).digest()
  );
  assert.equal(computedChallenge, expectedChallenge);

  const hashQuery = new URLSearchParams(String(callbackRes.headers.location).split('?')[1]);
  const oidcCode = hashQuery.get('oidcCode');
  assert.ok(oidcCode);

  const exchangeRes = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/pocket-id/exchange',
    body: { code: oidcCode }
  });
  assert.equal(exchangeRes.status, 200);
  assert.equal(exchangeRes.json.data.user.id, cheryId);
  assert.equal(exchangeRes.json.data.user.isAdmin, true);

  // 3. 第二个未在本地注册过的陌生 Pocket ID 用户（Carol）登录 -> 必须跳转要求输入邀请码（oidcPending）
  currentSub = 'pocket-user-002';
  currentName = 'Carol Pocket';
  currentPreferredUsername = 'carol';
  currentEmail = 'carol@example.com';

  const loginRedirect2 = await invokeApp(app, {
    method: 'GET',
    url: '/api/auth/pocket-id/login?from=%2Fmain%2Fservices'
  });
  const authUrl2 = new URL(loginRedirect2.headers.location);
  currentNonce = authUrl2.searchParams.get('nonce');
  const callbackRes2 = await invokeApp(app, {
    method: 'GET',
    url: `/api/auth/pocket-id/callback?code=auth_code_456&state=${encodeURIComponent(
      authUrl2.searchParams.get('state')
    )}`
  });
  assert.equal(callbackRes2.status, 302);
  const hashQuery2 = new URLSearchParams(String(callbackRes2.headers.location).split('?')[1]);
  const pendingToken = hashQuery2.get('oidcPending');
  assert.ok(pendingToken);
  assert.equal(hashQuery2.get('oidcCode'), null);

  // 4. 错误邀请码激活 Carol 应被拒绝；使用 chery 生成的有效邀请码激活成功
  const badActivate = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/pocket-id/complete-registration',
    body: { pendingToken, inviteCode: 'CHX-INVALID' }
  });
  assert.equal(badActivate.json.status, false);

  const newInvite = await invokeApp(app, {
    method: 'POST',
    url: '/api/admin/invite-codes',
    headers: { Authorization: cheryToken },
    body: { note: '给 Carol OIDC 激活' }
  });
  const carolActivate = await invokeApp(app, {
    method: 'POST',
    url: '/api/auth/pocket-id/complete-registration',
    body: { pendingToken, inviteCode: newInvite.json.data.code }
  });
  assert.equal(carolActivate.json.status, true);
  assert.equal(carolActivate.json.data.user.username, 'carol');
  assert.notEqual(carolActivate.json.data.user.id, cheryId);
  assert.equal(carolActivate.json.data.returnTo, '/main/services');

  // 5. Carol 激活绑定后再次通过 Pocket ID 登录，无需再填邀请码直接返回 oidcCode
  const loginRedirect3 = await invokeApp(app, {
    method: 'GET',
    url: '/api/auth/pocket-id/login'
  });
  const authUrl3 = new URL(loginRedirect3.headers.location);
  currentNonce = authUrl3.searchParams.get('nonce');
  const callbackRes3 = await invokeApp(app, {
    method: 'GET',
    url: `/api/auth/pocket-id/callback?code=auth_code_789&state=${encodeURIComponent(
      authUrl3.searchParams.get('state')
    )}`
  });
  const oidcCode3 = new URLSearchParams(String(callbackRes3.headers.location).split('?')[1]).get(
    'oidcCode'
  );
  assert.ok(oidcCode3);
});

test('accessToken 过期返回 401 时，通过 refreshToken 无感刷新并重放 /api/userinfo 成功', async () => {
  const jwt = require('jsonwebtoken');
  const app = createApp({
    enableLogger: false,
    config: {
      sqlitePath: ':memory:',
      accessTokenSecret: 'test-access-secret',
      refreshTokenSecret: 'test-refresh-secret',
      accessTokenTtl: 60,
      refreshTokenTtl: 3600
    }
  });

  // 初始化 chery 获取 refreshToken
  const code = await invokeApp(app, { method: 'GET', url: '/api/verifycode' });
  const reg = await invokeApp(app, {
    method: 'POST',
    url: '/api/regist',
    body: {
      username: aesEncrypt('chery', code.json.data.value),
      password: aesEncrypt('secret123', code.json.data.value),
      verifyCodeKey: code.json.data.key,
      name: 'chery'
    }
  });
  assert.equal(reg.json.status, true);

  // 构造一个已过期的 accessToken
  const expiredAccess =
    'Bearer ' +
    jwt.sign(
      { id: reg.json.data.user.id, username: 'chery', name: 'chery', type: 'access' },
      'test-access-secret',
      { expiresIn: -10 }
    );

  let currentAccessToken = expiredAccess;
  let currentRefreshToken = reg.json.data.refreshToken;
  let refreshCalledCount = 0;

  // 模拟前端 chery-fetch tokenRefreshMiddleware 的 401 -> /refreshToken -> next(true) 重放流程
  async function requestWithAutoRefresh(url) {
    let res = await invokeApp(app, {
      method: 'GET',
      url,
      headers: { Authorization: currentAccessToken }
    });
    if (res.status === 401) {
      refreshCalledCount += 1;
      const refreshRes = await invokeApp(app, {
        method: 'POST',
        url: '/api/refreshToken',
        headers: { Authorization: currentRefreshToken }
      });
      assert.equal(refreshRes.status, 200);
      assert.equal(refreshRes.json.status, true);
      currentAccessToken = refreshRes.json.data.accessToken;
      currentRefreshToken = refreshRes.json.data.refreshToken;
      res = await invokeApp(app, {
        method: 'GET',
        url,
        headers: { Authorization: currentAccessToken }
      });
    }
    return res;
  }

  const finalRes = await requestWithAutoRefresh('/api/userinfo');
  assert.equal(refreshCalledCount, 1);
  assert.equal(finalRes.status, 200);
  assert.equal(finalRes.json.status, true);
  assert.equal(finalRes.json.data.name, 'chery');
});
