const { Router } = require('express');
const jwt = require('jsonwebtoken');
const { prisma } = require('shared');

const router = Router();

const DISCORD_API = 'https://discord.com/api/v10';
const REDIRECT_URI = `http://localhost:${process.env.API_PORT || 3001}/auth/callback`;

router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description);

    // Get user info
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const discordUser = await userRes.json();

    // Upsert user
    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: {
        username: discordUser.username,
        avatar: discordUser.avatar,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        avatar: discordUser.avatar,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, discordId: user.discordId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.CORS_ORIGIN}/callback?token=${jwtToken}`);
  } catch (err) {
    console.error('OAuth error:', err);
    res.redirect(`${process.env.CORS_ORIGIN}/login?error=auth_failed`);
  }
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, discordId: true, username: true, avatar: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.get('/guilds', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    // If user has a Discord access token, fetch guilds from Discord API
    if (user.accessToken) {
      const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      const discordGuilds = await guildsRes.json();
      if (!Array.isArray(discordGuilds)) {
        return res.status(502).json({ error: 'Failed to fetch guilds from Discord' });
      }

      const botGuilds = await prisma.guild.findMany({
        select: { id: true, discordId: true },
      });
      const botGuildMap = new Map(botGuilds.map(g => [g.discordId, g.id]));

      const guilds = discordGuilds.map(g => {
        const perms = parseInt(g.permissions);
        let role = 'USER';
        if (perms & 0x20) role = 'ADMIN';
        else if (perms & 0x2000) role = 'MOD';
        return {
          id: g.id,
          name: g.name,
          icon: g.icon,
          botPresent: botGuildMap.has(g.id),
          role,
        };
      });

      // Upsert GuildMember role for guilds where bot is present
      const upsertPromises = guilds
        .filter(g => g.botPresent)
        .map(g => prisma.guildMember.upsert({
          where: {
            userId_guildId: {
              userId: user.id,
              guildId: botGuildMap.get(g.id),
            },
          },
          update: { role: g.role },
          create: {
            userId: user.id,
            guildId: botGuildMap.get(g.id),
            role: g.role,
          },
        }).catch(() => {}));
      await Promise.all(upsertPromises);

      return res.json(guilds);
    }

    // Fallback: return guilds where the user is a member (from DB)
    const memberGuilds = await prisma.guildMember.findMany({
      where: { user: { id: user.id } },
      include: { guild: true },
    });
    const guilds = memberGuilds.map(m => ({
      id: m.guild.discordId,
      name: m.guild.name,
      icon: m.guild.icon,
      botPresent: true,
      role: m.role || 'USER',
    }));
    res.json(guilds);
  } catch (err) {
    console.error('Guilds error:', err);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

module.exports = router;
