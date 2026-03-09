const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ROLES = {
  ADMIN: 'ADMIN',
  MOD: 'MOD',
  USER: 'USER',
};

const MOD_ACTIONS = {
  WARN: 'WARN',
  MUTE: 'MUTE',
  UNMUTE: 'UNMUTE',
  BAN: 'BAN',
  UNBAN: 'UNBAN',
  KICK: 'KICK',
};

function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

function levelFromXp(xp) {
  let level = 0;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return level;
}

const { aiGenerate, aiChat, aiEmbed } = require('./ai');

module.exports = { prisma, ROLES, MOD_ACTIONS, xpForLevel, levelFromXp, aiGenerate, aiChat, aiEmbed };
