const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');
const { handleStarReaction } = require('../modules/starboard');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user, client) {
    const locale = 'fr';
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => {});

    // Reaction roles
    const rr = await prisma.reactionRole.findFirst({
      where: { messageId: reaction.message.id, emoji: reaction.emoji.name },
    });
    if (rr) {
      const guild = reaction.message.guild;
      if (guild) {
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member) await member.roles.add(rr.roleId).catch(() => {});
      }
      return;
    }

    // Starboard
    await handleStarReaction(reaction, user, client);
  },
};
