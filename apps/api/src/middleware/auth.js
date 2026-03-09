const jwt = require('jsonwebtoken');
const { prisma } = require('shared');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.discordId = payload.discordId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const ROLE_HIERARCHY = { USER: 0, MOD: 1, ADMIN: 2, OWNER: 3 };

function requireRole(...roles) {
  // Find the minimum required level from the roles passed
  const minLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] ?? 0));

  return async (req, res, next) => {
    const { guildId } = req.params;
    if (!guildId) return res.status(400).json({ error: 'Guild ID required' });

    const member = await prisma.guildMember.findFirst({
      where: {
        user: { discordId: req.discordId },
        guild: { discordId: guildId },
      },
    });

    const memberLevel = ROLE_HIERARCHY[member?.role] ?? -1;
    if (!member || memberLevel < minLevel) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.member = member;
    next();
  };
}

module.exports = { authMiddleware, requireRole };
