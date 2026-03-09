const { prisma } = require('shared');
const { t } = require('i18n');

const DEFAULT_BADGES = [
  { name: t('fr', 'bot.badges.defaultBavard'), description: t('fr', 'bot.badges.defaultBavardDesc'), icon: '💬', condition: 'messages_100', threshold: 100 },
  { name: t('fr', 'bot.badges.defaultMsgPro'), description: t('fr', 'bot.badges.defaultMsgProDesc'), icon: '📝', condition: 'messages_1000', threshold: 1000 },
  { name: t('fr', 'bot.badges.defaultLvl10'), description: t('fr', 'bot.badges.defaultLvl10Desc'), icon: '⭐', condition: 'level_10', threshold: 10 },
  { name: t('fr', 'bot.badges.defaultLvl25'), description: t('fr', 'bot.badges.defaultLvl25Desc'), icon: '🌟', condition: 'level_25', threshold: 25 },
  { name: t('fr', 'bot.badges.defaultVocal5h'), description: t('fr', 'bot.badges.defaultVocal5hDesc'), icon: '🎙️', condition: 'voice_hours_5', threshold: 300 },
  { name: t('fr', 'bot.badges.defaultVocal24h'), description: t('fr', 'bot.badges.defaultVocal24hDesc'), icon: '🎧', condition: 'voice_hours_24', threshold: 1440 },
  { name: t('fr', 'bot.badges.defaultVeteran'), description: t('fr', 'bot.badges.defaultVeteranDesc'), icon: '🏛️', condition: 'member_days_30', threshold: 30 },
  { name: t('fr', 'bot.badges.defaultQuiz'), description: t('fr', 'bot.badges.defaultQuizDesc'), icon: '🧠', condition: 'quiz_first_win', threshold: 1 },
];

async function ensureDefaultBadges(guildId) {
  const existing = await prisma.badge.findMany({ where: { guildId } });
  if (existing.length > 0) return;

  await prisma.badge.createMany({
    data: DEFAULT_BADGES.map(b => ({ guildId, ...b })),
    skipDuplicates: true,
  });
}

async function checkAndAwardBadges(member, guildId) {
  await ensureDefaultBadges(guildId);

  const badges = await prisma.badge.findMany({ where: { guildId } });
  const existingAwards = await prisma.badgeAward.findMany({
    where: { memberId: member.id },
    select: { badgeId: true },
  });
  const awardedIds = new Set(existingAwards.map(a => a.badgeId));

  const freshMember = await prisma.guildMember.findUnique({ where: { id: member.id } });
  if (!freshMember) return [];

  const newAwards = [];

  for (const badge of badges) {
    if (awardedIds.has(badge.id)) continue;

    let earned = false;
    switch (badge.condition) {
      case 'messages_100':
      case 'messages_1000':
        earned = freshMember.messageCount >= badge.threshold;
        break;
      case 'level_10':
      case 'level_25':
        earned = freshMember.level >= badge.threshold;
        break;
      case 'voice_hours_5':
      case 'voice_hours_24':
        earned = freshMember.voiceMinutes >= badge.threshold;
        break;
      case 'member_days_30': {
        const days = (Date.now() - new Date(freshMember.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        earned = days >= badge.threshold;
        break;
      }
      case 'quiz_first_win':
        // Checked externally when quiz is won
        break;
      default:
        // Custom badges - check threshold against condition value
        break;
    }

    if (earned) {
      try {
        await prisma.badgeAward.create({
          data: { badgeId: badge.id, memberId: member.id },
        });
        newAwards.push(badge);
      } catch {
        // Already awarded (race condition)
      }
    }
  }

  return newAwards;
}

async function awardSpecificBadge(memberId, guildId, condition) {
  const badge = await prisma.badge.findFirst({
    where: { guildId, condition },
  });
  if (!badge) return null;

  try {
    await prisma.badgeAward.create({
      data: { badgeId: badge.id, memberId },
    });
    return badge;
  } catch {
    return null;
  }
}

module.exports = { checkAndAwardBadges, awardSpecificBadge, ensureDefaultBadges };
