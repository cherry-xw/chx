const express = require('express');
const { customAlphabet, nanoid } = require('nanoid');
const { checkPassword, aesDecrypt, makePassword } = require('../utils/hashers');

const nanoid8 = customAlphabet('abcdefghijklmnopqrstuvwxyz', 8);
const VERIFY_CODE_TTL_MS = 5 * 60 * 1000;

function createAuthRouter({ config, authRepo, tokenService, oidcService }) {
  const router = express.Router();
  const verifyCache = new Map();

  function cleanupVerifyCache() {
    const now = Date.now();
    for (const [k, entry] of verifyCache.entries()) {
      if (entry.expiresAt <= now) {
        verifyCache.delete(k);
      }
    }
  }

  function consumeVerifyCode(key) {
    cleanupVerifyCache();
    if (!key || !verifyCache.has(key)) return null;
    const entry = verifyCache.get(key);
    verifyCache.delete(key);
    if (entry.expiresAt <= Date.now()) return null;
    return entry.value;
  }

  function isLocalhostOrigin(origin) {
    if (!origin) return true;
    try {
      const { hostname } = new URL(origin);
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    } catch {
      return true;
    }
  }

  function resolveFrontendOrigin(req) {
    const configuredFrontend = String(config.frontendOrigin || '').trim().replace(/\/+$/, '');
    if (configuredFrontend && !isLocalhostOrigin(configuredFrontend)) {
      return configuredFrontend;
    }

    const effective = oidcService.getEffectiveConfig();
    if (effective?.redirectUri) {
      try {
        const redirectOrigin = new URL(effective.redirectUri).origin;
        if (!isLocalhostOrigin(redirectOrigin)) {
          return redirectOrigin;
        }
      } catch {
        // 忽略非法 redirectUri
      }
    }

    if (req?.headers) {
      const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
        .split(',')[0]
        .trim();
      const rawProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http')
        .split(',')[0]
        .trim();
      if (rawHost) {
        const reqOrigin = `${rawProto || 'http'}://${rawHost}`;
        if (!isLocalhostOrigin(reqOrigin)) {
          return reqOrigin;
        }
      }
    }

    return configuredFrontend || 'http://localhost:5173';
  }

  function buildFrontendLoginRedirect(req, params = {}) {
    const base = resolveFrontendOrigin(req).replace(/\/+$/, '');
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        search.set(k, String(v));
      }
    }
    const qs = search.toString();
    return `${base}/#/login${qs ? `?${qs}` : ''}`;
  }

  function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const payload = tokenService.verifyAccessToken(authHeader);
    if (!payload) {
      return res.status(401).json({
        status: false,
        msg: '当前未登录或登录状态已过期',
        data: null
      });
    }
    const user = authRepo.findUserById(payload.id);
    if (!user || user.state !== 1) {
      return res.status(401).json({
        status: false,
        msg: '用户不存在或已被禁用',
        data: null
      });
    }
    req.user = authRepo.toPublicUser(user);
    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        status: false,
        msg: '仅管理员 chery 可执行此操作',
        data: null
      });
    }
    next();
  }

  router.get('/verifycode', (req, res) => {
    cleanupVerifyCache();
    const key = nanoid(12);
    const value = nanoid8();
    verifyCache.set(key, {
      value,
      expiresAt: Date.now() + VERIFY_CODE_TTL_MS
    });
    res.json({
      status: true,
      msg: '获取成功',
      which: '获取成功',
      data: { key, value }
    });
  });

  router.post('/regist', (req, res) => {
    const code = consumeVerifyCode(req.body?.verifyCodeKey);
    if (!code || !req.body?.username || !req.body?.password) {
      return res.json({
        status: false,
        msg: '验证码已失效或参数缺失，请重试',
        which: '验证码已失效或参数缺失，请重试',
        data: null
      });
    }

    const username = aesDecrypt(req.body.username, code).trim();
    const rawPassword = aesDecrypt(req.body.password, code);
    const displayName = req.body.name ? String(req.body.name).trim() : username;
    const inviteCode = req.body.inviteCode ? String(req.body.inviteCode).trim() : '';

    if (!username || username === 'err' || !rawPassword || rawPassword === 'err') {
      return res.json({
        status: false,
        msg: '用户名或密码解析失败',
        which: '用户名或密码解析失败',
        data: null
      });
    }

    if (username.length < 2 || username.length > 32) {
      return res.json({
        status: false,
        msg: '用户名长度需在 2-32 个字符之间',
        which: '用户名长度需在 2-32 个字符之间',
        data: null
      });
    }

    const result = authRepo.registerLocalUser({
      username,
      passwordHash: makePassword(rawPassword),
      name: displayName || username,
      inviteCode
    });

    if (!result.ok) {
      return res.json({
        status: false,
        msg: result.error,
        which: result.error,
        data: null
      });
    }

    const tokens = tokenService.issueTokenPair(result.user);
    const publicUser = authRepo.toPublicUser(result.user);

    return res.json({
      status: true,
      msg: '注册成功',
      which: '注册成功',
      data: {
        ...tokens,
        user: publicUser
      }
    });
  });

  router.post('/login', (req, res) => {
    const code = consumeVerifyCode(req.body?.verifyCodeKey);
    if (!code || !req.body?.username || !req.body?.password) {
      return res.json({
        status: false,
        msg: '请刷新后重试',
        which: '请刷新后重试',
        data: null
      });
    }

    const username = aesDecrypt(req.body.username, code).trim();
    const pwd = aesDecrypt(req.body.password, code);

    if (!username || username === 'err' || !pwd || pwd === 'err') {
      return res.json({
        status: false,
        msg: '用户名或密码错误',
        which: '用户名或密码错误',
        data: null
      });
    }

    const user = authRepo.findUserByUsername(username);
    if (!user || !user.password_hash || user.state !== 1) {
      return res.json({
        status: false,
        msg: '用户名或密码错误',
        which: '用户名或密码错误',
        data: null
      });
    }

    if (!checkPassword(pwd, user.password_hash)) {
      return res.json({
        status: false,
        msg: '用户名或密码错误',
        which: '用户名或密码错误',
        data: null
      });
    }

    const tokens = tokenService.issueTokenPair(user);
    const publicUser = authRepo.toPublicUser(user);

    return res.json({
      status: true,
      msg: '登录成功',
      which: '登录成功',
      data: {
        ...tokens,
        user: publicUser
      }
    });
  });

  router.post('/refreshToken', (req, res) => {
    const rawRefresh = req.headers.authorization || req.body?.refreshToken;
    const rotated = tokenService.rotateTokenPair(rawRefresh);
    if (!rotated) {
      return res.status(401).json({
        status: false,
        msg: '刷新令牌无效或已过期，请重新登录',
        data: null
      });
    }

    return res.json({
      status: true,
      msg: '刷新成功',
      data: {
        accessToken: rotated.accessToken,
        refreshToken: rotated.refreshToken,
        user: rotated.user
      }
    });
  });

  router.get('/userinfo', requireAuth, (req, res) => {
    res.json({
      status: true,
      msg: '获取成功',
      data: req.user
    });
  });

  router.post('/logout', (req, res) => {
    const rawRefresh =
      req.body?.refreshToken || req.headers['x-refresh-token'] || req.headers.authorization;
    const refreshPayload = tokenService.verifyRefreshToken(rawRefresh);
    if (refreshPayload?.jti) {
      authRepo.revokeRefreshToken(refreshPayload.jti);
    } else {
      const accessPayload = tokenService.verifyAccessToken(req.headers.authorization);
      if (accessPayload?.id) {
        authRepo.revokeAllUserRefreshTokens(accessPayload.id);
      }
    }
    res.json({
      status: true,
      msg: '登出成功',
      data: null
    });
  });

  router.get('/auth/pocket-id/config', (req, res) => {
    res.json({
      status: true,
      msg: '获取成功',
      data: {
        enabled: oidcService.isEnabled(),
        bootstrapRequired: !authRepo.hasAdminUser()
      }
    });
  });

  router.get('/auth/pocket-id/login', async (req, res) => {
    const returnTo = req.query.from || req.query.returnTo || '/';
    if (!oidcService.isEnabled()) {
      return res.redirect(
        302,
        buildFrontendLoginRedirect(req, {
          oidcError: 'Pocket ID 尚未配置，请先登录 chery 管理员账号在“管理后台”中配置 Pocket ID',
          from: returnTo
        })
      );
    }

    try {
      const tx = await oidcService.buildAuthorizationTransaction({ returnTo });
      authRepo.createOidcTransaction({
        state: tx.state,
        nonce: tx.nonce,
        codeVerifier: tx.codeVerifier,
        returnTo: tx.returnTo
      });
      return res.redirect(302, tx.authorizationUrl);
    } catch {
      return res.redirect(
        302,
        buildFrontendLoginRedirect(req, {
          oidcError: '无法连接 Pocket ID 认证服务，请稍后重试',
          from: returnTo
        })
      );
    }
  });

  router.get('/auth/pocket-id/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const tx = state ? authRepo.consumeOidcTransaction(String(state)) : null;
    const returnTo = tx?.returnTo || '/';

    if (error) {
      return res.redirect(
        302,
        buildFrontendLoginRedirect(req, {
          oidcError:
            error === 'access_denied' ? '已取消或无权限通过 Pocket ID 登录' : 'Pocket ID 认证未通过',
          from: returnTo
        })
      );
    }

    if (!tx || !code) {
      return res.redirect(
        302,
        buildFrontendLoginRedirect(req, {
          oidcError: '登录请求已过期或状态校验失败，请重新发起登录',
          from: returnTo
        })
      );
    }

    try {
      const identity = await oidcService.exchangeCodeAndVerify({
        code: String(code),
        codeVerifier: tx.codeVerifier,
        expectedNonce: tx.nonce
      });

      const resolved = authRepo.resolveOidcLogin({
        ...identity,
        returnTo: tx.returnTo
      });

      if (resolved.status === 'invite_required') {
        return res.redirect(
          302,
          buildFrontendLoginRedirect(req, {
            oidcPending: resolved.pendingToken,
            oidcName: resolved.displayName,
            from: resolved.returnTo
          })
        );
      }

      const user = resolved.user;
      if (!user || user.state !== 1) {
        return res.redirect(
          302,
          buildFrontendLoginRedirect(req, {
            oidcError: '当前账号已被禁用',
            from: returnTo
          })
        );
      }

      const oidcCode = authRepo.createExchangeCode({
        userId: user.id,
        returnTo: tx.returnTo
      });

      return res.redirect(
        302,
        buildFrontendLoginRedirect(req, {
          oidcCode,
          from: tx.returnTo
        })
      );
    } catch {
      return res.redirect(
        302,
        buildFrontendLoginRedirect(req, {
          oidcError: 'Pocket ID 身份验证失败，请重试',
          from: returnTo
        })
      );
    }
  });

  router.post('/auth/pocket-id/exchange', (req, res) => {
    const code = req.body?.code;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        status: false,
        msg: '缺少 OIDC 交换凭证',
        data: null
      });
    }

    const consumed = authRepo.consumeExchangeCode(code);
    if (!consumed) {
      return res.status(400).json({
        status: false,
        msg: 'OIDC 登录凭证无效或已过期，请重新登录',
        data: null
      });
    }

    const tokens = tokenService.issueTokenPair(consumed.user);
    return res.json({
      status: true,
      msg: '登录成功',
      data: {
        ...tokens,
        user: consumed.user,
        returnTo: consumed.returnTo
      }
    });
  });

  router.post('/auth/pocket-id/complete-registration', (req, res) => {
    const pendingToken = req.body?.pendingToken;
    const inviteCode = req.body?.inviteCode;
    const result = authRepo.completeOidcRegistration({ pendingToken, inviteCode });
    if (!result.ok) {
      return res.json({
        status: false,
        msg: result.error,
        data: null
      });
    }

    const tokens = tokenService.issueTokenPair(result.user);
    return res.json({
      status: true,
      msg: 'Pocket ID 账号激活并登录成功',
      data: {
        ...tokens,
        user: result.user,
        returnTo: result.returnTo
      }
    });
  });

  // ==================== 管理员 (chery) 专属管理接口 ====================

  router.get('/admin/invite-codes', requireAuth, requireAdmin, (req, res) => {
    res.json({
      status: true,
      msg: '获取成功',
      data: authRepo.listInviteCodes()
    });
  });

  router.post('/admin/invite-codes', requireAuth, requireAdmin, (req, res) => {
    const note = req.body?.note ? String(req.body.note).trim().slice(0, 64) : '';
    const expiresInDays = Number(req.body?.expiresInDays) || 7;
    const created = authRepo.createInviteCode({
      createdBy: req.user.username,
      note,
      expiresInDays
    });
    res.json({
      status: true,
      msg: '邀请码已生成',
      data: created
    });
  });

  router.delete('/admin/invite-codes/:code', requireAuth, requireAdmin, (req, res) => {
    const deleted = authRepo.deleteInviteCode(req.params.code);
    if (!deleted) {
      return res.json({
        status: false,
        msg: '邀请码不存在或已被使用，无法删除',
        data: null
      });
    }
    return res.json({
      status: true,
      msg: '邀请码已作废删除',
      data: null
    });
  });

  router.get('/admin/pocket-id', requireAuth, requireAdmin, (req, res) => {
    const effective = oidcService.getEffectiveConfig();
    res.json({
      status: true,
      msg: '获取成功',
      data: {
        issuer: effective.issuer,
        clientId: effective.clientId,
        hasClientSecret: Boolean(effective.clientSecret),
        redirectUri: effective.redirectUri,
        scopes: effective.scopes,
        enabled: effective.enabled
      }
    });
  });

  router.put('/admin/pocket-id', requireAuth, requireAdmin, (req, res) => {
    const current = oidcService.getEffectiveConfig();
    const issuer = String(req.body?.issuer ?? current.issuer ?? '')
      .trim()
      .replace(/\/+$/, '');
    const clientId = String(req.body?.clientId ?? current.clientId ?? '').trim();
    const incomingSecret =
      typeof req.body?.clientSecret === 'string' ? req.body.clientSecret.trim() : '';
    const clientSecret = req.body?.clearClientSecret
      ? ''
      : incomingSecret || current.clientSecret || '';
    const redirectUri = String(req.body?.redirectUri || current.redirectUri || '').trim();
    const scopes = String(req.body?.scopes || current.scopes || 'openid profile email').trim();

    authRepo.savePocketIdSettings({
      issuer,
      clientId,
      clientSecret,
      redirectUri,
      scopes
    });
    oidcService.clearCache();

    const updated = oidcService.getEffectiveConfig();
    res.json({
      status: true,
      msg: 'Pocket ID 配置已保存并生效',
      data: {
        issuer: updated.issuer,
        clientId: updated.clientId,
        hasClientSecret: Boolean(updated.clientSecret),
        redirectUri: updated.redirectUri,
        scopes: updated.scopes,
        enabled: updated.enabled
      }
    });
  });

  return router;
}

module.exports = {
  createAuthRouter
};
