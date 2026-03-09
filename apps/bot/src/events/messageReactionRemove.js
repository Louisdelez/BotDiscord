const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, user, client) {
    const locale = 'fr';
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => {});

    const rr = await prisma.reactionRole.findFirst({
      where: { messageId: reaction.message.id, emoji: reaction.emoji.name },
    });
    if (!rr) return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    await member.roles.remove(rr.roleId).catch(() => {});
  },
};
