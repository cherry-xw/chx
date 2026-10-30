const { customAlphabet, nanoid } = require('nanoid');

const generateInviteCodeStr = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);
const POCKET_ID_SETTINGS_KEY = 'pocket_id_config';

function isAdminUsername(username) {
  return String(username || '').trim().toLowerCase() === 'chery';
}

function toPublicUser(row) {
  if (!row) return null;
  const username = row.username || row.name;
  return {
    id: row.id,
    userName: username,
    username,
    name: row.name,
    email: row.email || '',
    authProvider: row.auth_provider || 'local',
    isAdmin: isAdminUsername(row.username),
    state: row.state,
    createTime: row.created_at,
    updateTime: row.updated_at
  };
}

function formatInviteCodeRow(row, now = Date.now()) {
  if (!row) return null;
  let status = 'active';
  if (row.consumed_at) {
    status = 'used';
  } else if (row.expires_at <= now) {
    status = 'expired';
  }
  return {
    code: row.code,
    createdBy: row.created_by,
    note: row.note || '',
    usedBy: row.used_by || null,
    usedByUsername: row.used_by_username || null,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at || null,
    createdAt: row.created_at,
    status
  };
}

function createAuthRepository(db) {
  const selectUserByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const selectUserByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const selectUserByUsernameLowerStmt = db.prepare(
    'SELECT * FROM users WHERE LOWER(username) = LOWER(?)'
  );
  const selectUserByEmailLowerStmt = db.prepare(
    'SELECT * FROM users WHERE email IS NOT NULL AND email != \'\' AND LOWER(email) = LOWER(?)'
  );
  const insertUserStmt = db.prepare(`
    INSERT INTO users (id, username, name, email, password_hash, auth_provider, state, created_at, updated_at)
    VALUES (@id, @username, @name, @email, @password_hash, @auth_provider, @state, @created_at, @updated_at)
  `);
  const updateUserProfileStmt = db.prepare(`
    UPDATE users
    SET name = @name,
        email = COALESCE(@email, email),
        updated_at = @updated_at
    WHERE id = @id
  `);

  const selectOidcIdentityStmt = db.prepare(`
    SELECT * FROM oidc_identities WHERE issuer = ? AND subject = ?
  `);
  const insertOidcIdentityStmt = db.prepare(`
    INSERT INTO oidc_identities (id, user_id, issuer, subject, email, name, last_login_at, created_at)
    VALUES (@id, @user_id, @issuer, @subject, @email, @name, @last_login_at, @created_at)
  `);
  const updateOidcIdentityStmt = db.prepare(`
    UPDATE oidc_identities
    SET email = @email,
        name = @name,
        last_login_at = @last_login_at
    WHERE id = @id
  `);

  const insertRefreshTokenStmt = db.prepare(`
    INSERT INTO refresh_tokens (jti, user_id, expires_at, revoked_at, replaced_by_jti, created_at)
    VALUES (@jti, @user_id, @expires_at, NULL, NULL, @created_at)
  `);
  const selectRefreshTokenStmt = db.prepare(`
    SELECT * FROM refresh_tokens WHERE jti = ?
  `);
  const revokeRefreshTokenStmt = db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = @revoked_at,
        replaced_by_jti = COALESCE(@replaced_by_jti, replaced_by_jti)
    WHERE jti = @jti AND revoked_at IS NULL
  `);
  const revokeUserRefreshTokensStmt = db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = ?
    WHERE user_id = ? AND revoked_at IS NULL
  `);

  const insertOidcTxStmt = db.prepare(`
    INSERT INTO oidc_transactions (state, nonce, code_verifier, return_to, expires_at, created_at)
    VALUES (@state, @nonce, @code_verifier, @return_to, @expires_at, @created_at)
  `);
  const selectOidcTxStmt = db.prepare('SELECT * FROM oidc_transactions WHERE state = ?');
  const deleteOidcTxStmt = db.prepare('DELETE FROM oidc_transactions WHERE state = ?');
  const cleanupExpiredOidcTxStmt = db.prepare('DELETE FROM oidc_transactions WHERE expires_at <= ?');

  const insertExchangeCodeStmt = db.prepare(`
    INSERT INTO oidc_exchange_codes (code, user_id, return_to, expires_at, consumed_at, created_at)
    VALUES (@code, @user_id, @return_to, @expires_at, NULL, @created_at)
  `);
  const selectExchangeCodeStmt = db.prepare('SELECT * FROM oidc_exchange_codes WHERE code = ?');
  const markExchangeCodeConsumedStmt = db.prepare(`
    UPDATE oidc_exchange_codes
    SET consumed_at = @consumed_at
    WHERE code = @code AND consumed_at IS NULL
  `);
  const cleanupExpiredExchangeCodesStmt = db.prepare(
    'DELETE FROM oidc_exchange_codes WHERE expires_at <= ?'
  );

  // 邀请码相关语句
  const insertInviteCodeStmt = db.prepare(`
    INSERT INTO invite_codes (code, created_by, note, used_by, used_by_username, expires_at, consumed_at, created_at)
    VALUES (@code, @created_by, @note, NULL, NULL, @expires_at, NULL, @created_at)
  `);
  const selectInviteCodeStmt = db.prepare('SELECT * FROM invite_codes WHERE code = ?');
  const listInviteCodesStmt = db.prepare('SELECT * FROM invite_codes ORDER BY created_at DESC');
  const consumeInviteCodeStmt = db.prepare(`
    UPDATE invite_codes
    SET used_by = @used_by,
        used_by_username = @used_by_username,
        consumed_at = @consumed_at
    WHERE code = @code AND consumed_at IS NULL
  `);
  const deleteUnusedInviteCodeStmt = db.prepare(`
    DELETE FROM invite_codes WHERE code = ? AND consumed_at IS NULL
  `);

  // OIDC 待邀请码激活记录相关语句
  const insertOidcPendingStmt = db.prepare(`
    INSERT INTO oidc_pending_registrations (token, issuer, subject, name, preferred_username, email, return_to, expires_at, created_at)
    VALUES (@token, @issuer, @subject, @name, @preferred_username, @email, @return_to, @expires_at, @created_at)
  `);
  const selectOidcPendingStmt = db.prepare(
    'SELECT * FROM oidc_pending_registrations WHERE token = ?'
  );
  const deleteOidcPendingStmt = db.prepare(
    'DELETE FROM oidc_pending_registrations WHERE token = ?'
  );
  const cleanupExpiredOidcPendingStmt = db.prepare(
    'DELETE FROM oidc_pending_registrations WHERE expires_at <= ?'
  );

  // 系统设置相关语句
  const selectSettingStmt = db.prepare('SELECT * FROM system_settings WHERE key = ?');
  const upsertSettingStmt = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (@key, @value, @updated_at)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  function hasAdminUser() {
    return Boolean(selectUserByUsernameLowerStmt.get('chery'));
  }

  const registerLocalUserTx = db.transaction(
    ({ username, passwordHash, name, email, inviteCode }) => {
      const normalizedInputUsername = String(username || '').trim();
      const isCheryTarget = isAdminUsername(normalizedInputUsername);
      const finalUsername = isCheryTarget ? 'chery' : normalizedInputUsername;

      const existing = selectUserByUsernameLowerStmt.get(finalUsername);
      if (existing) {
        return { ok: false, error: '账号已存在' };
      }

      // 仅当数据库中尚不存在 chery 管理员且当前注册账号为 chery 时，允许免邀请码初始化管理员
      const allowBootstrapWithoutInvite = isCheryTarget && !hasAdminUser();
      const normalizedCode = String(inviteCode || '').trim().toUpperCase();
      const now = Date.now();

      let inviteRow = null;
      if (!allowBootstrapWithoutInvite) {
        if (!normalizedCode) {
          return { ok: false, error: '禁止随意注册，请输入管理员生成的邀请码' };
        }
        inviteRow = selectInviteCodeStmt.get(normalizedCode);
        if (!inviteRow || inviteRow.consumed_at !== null || inviteRow.expires_at <= now) {
          return { ok: false, error: '邀请码无效、已被使用或已过期' };
        }
      } else if (normalizedCode) {
        const candidate = selectInviteCodeStmt.get(normalizedCode);
        if (candidate && candidate.consumed_at === null && candidate.expires_at > now) {
          inviteRow = candidate;
        }
      }

      const nowIso = new Date().toISOString();
      const id = nanoid(16);
      insertUserStmt.run({
        id,
        username: finalUsername,
        name: (name || finalUsername).trim(),
        email: email || null,
        password_hash: passwordHash,
        auth_provider: 'local',
        state: 1,
        created_at: nowIso,
        updated_at: nowIso
      });

      if (inviteRow) {
        const info = consumeInviteCodeStmt.run({
          code: inviteRow.code,
          used_by: id,
          used_by_username: finalUsername,
          consumed_at: now
        });
        if (info.changes !== 1) {
          throw new Error('邀请码已被并发消费');
        }
      }

      return {
        ok: true,
        user: selectUserByIdStmt.get(id)
      };
    }
  );

  const resolveOidcLoginTx = db.transaction(
    ({ issuer, subject, name, preferredUsername, email, returnTo }) => {
      const nowIso = new Date().toISOString();
      const existingIdentity = selectOidcIdentityStmt.get(issuer, subject);
      const displayName = (
        name ||
        preferredUsername ||
        email ||
        `user_${subject.slice(0, 8)}`
      ).trim();

      // 1. 已绑定过该 Pocket ID 身份 -> 直接更新并登录
      if (existingIdentity) {
        updateOidcIdentityStmt.run({
          id: existingIdentity.id,
          email: email || null,
          name: displayName,
          last_login_at: nowIso
        });
        updateUserProfileStmt.run({
          id: existingIdentity.user_id,
          name: displayName,
          email: email || null,
          updated_at: nowIso
        });
        return {
          status: 'linked',
          user: selectUserByIdStmt.get(existingIdentity.user_id)
        };
      }

      // 2. 检查是否匹配本地已有同名账号或同邮箱账号（含已注册的 chery 管理员或普通用户）
      const candidateUsername = String(preferredUsername || name || '').trim();
      let matchedLocalUser = null;
      if (candidateUsername) {
        matchedLocalUser = selectUserByUsernameLowerStmt.get(candidateUsername);
      }
      if (!matchedLocalUser && email) {
        matchedLocalUser = selectUserByEmailLowerStmt.get(String(email).trim());
      }

      if (matchedLocalUser) {
        insertOidcIdentityStmt.run({
          id: nanoid(16),
          user_id: matchedLocalUser.id,
          issuer,
          subject,
          email: email || null,
          name: displayName,
          last_login_at: nowIso,
          created_at: nowIso
        });
        updateUserProfileStmt.run({
          id: matchedLocalUser.id,
          name: matchedLocalUser.name || displayName,
          email: email || matchedLocalUser.email || null,
          updated_at: nowIso
        });
        return {
          status: 'linked',
          user: selectUserByIdStmt.get(matchedLocalUser.id)
        };
      }

      // 3. 若 Pocket ID 登录账号本身就是管理员 chery 且本地尚无 chery 账号 -> 直接自动创建 chery 管理员并绑定
      if (isAdminUsername(preferredUsername) || isAdminUsername(name)) {
        const userId = nanoid(16);
        insertUserStmt.run({
          id: userId,
          username: 'chery',
          name: displayName || 'chery',
          email: email || null,
          password_hash: null,
          auth_provider: 'pocket-id',
          state: 1,
          created_at: nowIso,
          updated_at: nowIso
        });
        insertOidcIdentityStmt.run({
          id: nanoid(16),
          user_id: userId,
          issuer,
          subject,
          email: email || null,
          name: displayName || 'chery',
          last_login_at: nowIso,
          created_at: nowIso
        });
        return {
          status: 'linked',
          user: selectUserByIdStmt.get(userId)
        };
      }

      // 4. 其他未注册过的陌生 Pocket ID 账号 -> 生成待激活记录，要求前端输入邀请码后方可建号
      const now = Date.now();
      cleanupExpiredOidcPendingStmt.run(now);
      const token = nanoid(32);
      insertOidcPendingStmt.run({
        token,
        issuer,
        subject,
        name: displayName,
        preferred_username: candidateUsername || displayName,
        email: email || null,
        return_to: returnTo || '/',
        expires_at: now + 15 * 60 * 1000,
        created_at: now
      });

      return {
        status: 'invite_required',
        pendingToken: token,
        displayName,
        returnTo: returnTo || '/'
      };
    }
  );

  const completeOidcRegistrationTx = db.transaction(({ pendingToken, inviteCode }) => {
    const now = Date.now();
    cleanupExpiredOidcPendingStmt.run(now);
    const pending = selectOidcPendingStmt.get(String(pendingToken || '').trim());
    if (!pending || pending.expires_at <= now) {
      return { ok: false, error: 'Pocket ID 登录凭证已过期，请重新点击 Pocket ID 登录' };
    }

    const normalizedCode = String(inviteCode || '').trim().toUpperCase();
    if (!normalizedCode) {
      return { ok: false, error: '请输入管理员生成的邀请码' };
    }

    const inviteRow = selectInviteCodeStmt.get(normalizedCode);
    if (!inviteRow || inviteRow.consumed_at !== null || inviteRow.expires_at <= now) {
      return { ok: false, error: '邀请码无效、已被使用或已过期' };
    }

    // 检查是否已经绑定过
    const existingIdentity = selectOidcIdentityStmt.get(pending.issuer, pending.subject);
    if (existingIdentity) {
      deleteOidcPendingStmt.run(pending.token);
      const existingUser = selectUserByIdStmt.get(existingIdentity.user_id);
      return {
        ok: true,
        user: toPublicUser(existingUser),
        returnTo: pending.return_to
      };
    }

    const nowIso = new Date().toISOString();
    const userId = nanoid(16);
    let candidateUsername = (
      pending.preferred_username ||
      pending.email ||
      `oidc_${pending.subject.slice(0, 8)}`
    ).trim();
    if (selectUserByUsernameLowerStmt.get(candidateUsername)) {
      candidateUsername = `${candidateUsername}_${nanoid(6)}`;
    }

    insertUserStmt.run({
      id: userId,
      username: candidateUsername,
      name: pending.name || candidateUsername,
      email: pending.email || null,
      password_hash: null,
      auth_provider: 'pocket-id',
      state: 1,
      created_at: nowIso,
      updated_at: nowIso
    });

    insertOidcIdentityStmt.run({
      id: nanoid(16),
      user_id: userId,
      issuer: pending.issuer,
      subject: pending.subject,
      email: pending.email || null,
      name: pending.name || candidateUsername,
      last_login_at: nowIso,
      created_at: nowIso
    });

    const info = consumeInviteCodeStmt.run({
      code: inviteRow.code,
      used_by: userId,
      used_by_username: candidateUsername,
      consumed_at: now
    });
    if (info.changes !== 1) {
      throw new Error('邀请码已被并发消费');
    }

    deleteOidcPendingStmt.run(pending.token);
    const createdUser = selectUserByIdStmt.get(userId);
    return {
      ok: true,
      user: toPublicUser(createdUser),
      returnTo: pending.return_to
    };
  });

  const rotateRefreshTokenTx = db.transaction(({ oldJti, newJti, userId, expiresAt }) => {
    const now = Date.now();
    const row = selectRefreshTokenStmt.get(oldJti);
    if (!row || row.user_id !== userId || row.revoked_at !== null || row.expires_at <= now) {
      return false;
    }
    const info = revokeRefreshTokenStmt.run({
      jti: oldJti,
      revoked_at: now,
      replaced_by_jti: newJti
    });
    if (info.changes !== 1) {
      return false;
    }
    insertRefreshTokenStmt.run({
      jti: newJti,
      user_id: userId,
      expires_at: expiresAt,
      created_at: now
    });
    return true;
  });

  const consumeExchangeCodeTx = db.transaction((code) => {
    const now = Date.now();
    cleanupExpiredExchangeCodesStmt.run(now);
    const row = selectExchangeCodeStmt.get(code);
    if (!row || row.consumed_at !== null || row.expires_at <= now) {
      return null;
    }
    const info = markExchangeCodeConsumedStmt.run({
      code,
      consumed_at: now
    });
    if (info.changes !== 1) {
      return null;
    }
    const user = selectUserByIdStmt.get(row.user_id);
    if (!user || user.state !== 1) {
      return null;
    }
    return {
      user: toPublicUser(user),
      returnTo: row.return_to
    };
  });

  return {
    toPublicUser,
    isAdminUsername,
    hasAdminUser,
    findUserById(id) {
      return selectUserByIdStmt.get(id) || null;
    },
    findUserByUsername(username) {
      return (
        selectUserByUsernameStmt.get(username) ||
        selectUserByUsernameLowerStmt.get(username) ||
        null
      );
    },
    registerLocalUser(payload) {
      return registerLocalUserTx(payload);
    },
    resolveOidcLogin(payload) {
      return resolveOidcLoginTx(payload);
    },
    completeOidcRegistration(payload) {
      return completeOidcRegistrationTx(payload);
    },
    createInviteCode({ createdBy, note = '', expiresInDays = 7 }) {
      const now = Date.now();
      const days = Math.min(Math.max(Number(expiresInDays) || 7, 1), 365);
      const expiresAt = now + days * 24 * 60 * 60 * 1000;
      let code = `CHX-${generateInviteCodeStr()}`;
      while (selectInviteCodeStmt.get(code)) {
        code = `CHX-${generateInviteCodeStr()}`;
      }
      insertInviteCodeStmt.run({
        code,
        created_by: createdBy,
        note: String(note || '').trim(),
        expires_at: expiresAt,
        created_at: now
      });
      return formatInviteCodeRow(selectInviteCodeStmt.get(code), now);
    },
    listInviteCodes() {
      const now = Date.now();
      return listInviteCodesStmt.all().map((row) => formatInviteCodeRow(row, now));
    },
    deleteInviteCode(code) {
      const normalized = String(code || '').trim().toUpperCase();
      const info = deleteUnusedInviteCodeStmt.run(normalized);
      return info.changes > 0;
    },
    getPocketIdSettings() {
      const row = selectSettingStmt.get(POCKET_ID_SETTINGS_KEY);
      if (!row || !row.value) return null;
      try {
        return JSON.parse(row.value);
      } catch {
        return null;
      }
    },
    savePocketIdSettings(settings) {
      const nowIso = new Date().toISOString();
      upsertSettingStmt.run({
        key: POCKET_ID_SETTINGS_KEY,
        value: JSON.stringify(settings),
        updated_at: nowIso
      });
      return this.getPocketIdSettings();
    },
    saveRefreshToken({ jti, userId, expiresAt }) {
      insertRefreshTokenStmt.run({
        jti,
        user_id: userId,
        expires_at: expiresAt,
        created_at: Date.now()
      });
    },
    getRefreshToken(jti) {
      return selectRefreshTokenStmt.get(jti) || null;
    },
    rotateRefreshToken(params) {
      return rotateRefreshTokenTx(params);
    },
    revokeRefreshToken(jti) {
      const info = revokeRefreshTokenStmt.run({
        jti,
        revoked_at: Date.now(),
        replaced_by_jti: null
      });
      return info.changes > 0;
    },
    revokeAllUserRefreshTokens(userId) {
      revokeUserRefreshTokensStmt.run(Date.now(), userId);
    },
    createOidcTransaction({ state, nonce, codeVerifier, returnTo, ttlMs = 10 * 60 * 1000 }) {
      const now = Date.now();
      cleanupExpiredOidcTxStmt.run(now);
      insertOidcTxStmt.run({
        state,
        nonce,
        code_verifier: codeVerifier,
        return_to: returnTo,
        expires_at: now + ttlMs,
        created_at: now
      });
    },
    consumeOidcTransaction(state) {
      const now = Date.now();
      cleanupExpiredOidcTxStmt.run(now);
      const row = selectOidcTxStmt.get(state);
      if (!row) return null;
      deleteOidcTxStmt.run(state);
      if (row.expires_at <= now) return null;
      return {
        state: row.state,
        nonce: row.nonce,
        codeVerifier: row.code_verifier,
        returnTo: row.return_to
      };
    },
    createExchangeCode({ userId, returnTo, ttlMs = 60 * 1000 }) {
      const now = Date.now();
      const code = nanoid(32);
      insertExchangeCodeStmt.run({
        code,
        user_id: userId,
        return_to: returnTo || '/',
        expires_at: now + ttlMs,
        created_at: now
      });
      return code;
    },
    consumeExchangeCode(code) {
      return consumeExchangeCodeTx(code);
    }
  };
}

module.exports = {
  createAuthRepository,
  toPublicUser,
  isAdminUsername
};
