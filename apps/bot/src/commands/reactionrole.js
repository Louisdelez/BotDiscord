const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Configurer les rôles par réaction')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Créer un message de rôles par réaction')
      .addStringOption(o => o.setName('titre').setDescription('Titre du message').setRequired(true))
      .addStringOption(o => o.setName('roles').setDescription('emoji:@role séparés par | (ex: 🎮:@Gamer|🎵:@Music)').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Lister les rôles par réaction')),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const title = interaction.options.getString('titre');
      const rolesStr = interaction.options.getString('roles');

      const pairs = rolesStr.split('|').map(s => s.trim());
      const roleEntries = [];

      for (const pair of pairs) {
        const [emoji, roleMention] = pair.split(':').map(s => s.trim());
        if (!emoji || !roleMention) continue;

        const roleId = roleMention.replace(/[<@&>]/g, '');
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) continue;

        roleEntries.push({ emoji, roleId: role.id, roleName: role.name });
      }

      if (roleEntries.length === 0) return interaction.reply({ content: t(locale, 'bot.reactionrole.invalidFormat'), ephemeral: true });

      const description = roleEntries.map(r => `${r.emoji} — ${r.roleName}`).join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`🎭 ${title}`)
        .setDescription(t(locale, 'bot.reactionrole.description', { roles: description }))
        .setColor(0x3498db)
        .setFooter({ text: t(locale, 'bot.reactionrole.footer') });

      const msg = await interaction.channel.send({ embeds: [embed] });

      // Add reactions
      for (const entry of roleEntries) {
        await msg.react(entry.emoji).catch(() => {});
        await prisma.reactionRole.create({
          data: {
            guildId: guild.id,
            messageId: msg.id,
            channelId: interaction.channel.id,
            emoji: entry.emoji,
            roleId: entry.roleId,
            roleName: entry.roleName,
          },
        });
      }

      await interaction.reply({ content: t(locale, 'bot.reactionrole.created'), ephemeral: true });
    }

    if (sub === 'list') {
      const rrs = await prisma.reactionRole.findMany({ where: { guildId: guild.id } });
      if (rrs.length === 0) return interaction.reply({ content: t(locale, 'bot.reactionrole.noRoles'), ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'bot.reactionrole.title'))
        .setColor(0x3498db)
        .setDescription(rrs.map(r => `${r.emoji} → **${r.roleName}** (message: ${r.messageId})`).join('\n'));

      await interaction.reply({ embeds: [embed] });
    }
  },
};
