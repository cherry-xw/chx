const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');

function stripBearer(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

function createTokenService({ config, authRepo }) {
  const {
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenTtl,
    refreshTokenTtl
  } = config;

  function issueAccessToken(user) {
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username || user.name,
        name: user.name,
        type: 'access'
      },
      accessTokenSecret,
      { expiresIn: accessTokenTtl }
    );
    return `Bearer ${token}`;
  }

  function issueTokenPair(user) {
    const accessToken = issueAccessToken(user);
    const jti = nanoid(24);
    const refreshJwt = jwt.sign(
      {
        id: user.id,
        jti,
        type: 'refresh'
      },
      refreshTokenSecret,
      { expiresIn: refreshTokenTtl }
    );
    const expiresAt = Date.now() + refreshTokenTtl * 1000;
    authRepo.saveRefreshToken({
      jti,
      userId: user.id,
      expiresAt
    });
    return {
      accessToken,
      refreshToken: `Bearer ${refreshJwt}`
    };
  }

  function verifyAccessToken(rawHeader) {
    const token = stripBearer(rawHeader);
    if (!token) return null;
    try {
      const payload = jwt.verify(token, accessTokenSecret);
      if (!payload || payload.type !== 'access' || !payload.id) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  function verifyRefreshToken(rawHeader) {
    const token = stripBearer(rawHeader);
    if (!token) return null;
    try {
      const payload = jwt.verify(token, refreshTokenSecret);
      if (!payload || payload.type !== 'refresh' || !payload.id || !payload.jti) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  function rotateTokenPair(rawRefreshHeader) {
    const payload = verifyRefreshToken(rawRefreshHeader);
    if (!payload) return null;

    const user = authRepo.findUserById(payload.id);
    if (!user || user.state !== 1) {
      return null;
    }

    const newJti = nanoid(24);
    const expiresAt = Date.now() + refreshTokenTtl * 1000;
    const rotated = authRepo.rotateRefreshToken({
      oldJti: payload.jti,
      newJti,
      userId: user.id,
      expiresAt
    });

    if (!rotated) {
      return null;
    }

    const accessToken = issueAccessToken(user);
    const refreshJwt = jwt.sign(
      {
        id: user.id,
        jti: newJti,
        type: 'refresh'
      },
      refreshTokenSecret,
      { expiresIn: refreshTokenTtl }
    );

    return {
      accessToken,
      refreshToken: `Bearer ${refreshJwt}`,
      user: authRepo.toPublicUser(user)
    };
  }

  return {
    issueAccessToken,
    issueTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    rotateTokenPair
  };
}

module.exports = {
  createTokenService,
  stripBearer
};
