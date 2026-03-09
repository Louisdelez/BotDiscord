const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('randomuser')
    .setDescription('Sélectionner un membre aléatoire du serveur')
    .addRoleOption(o => o.setName('role').setDescription('Filtrer par rôle')),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    await interaction.guild.members.fetch();
    let members = interaction.guild.members.cache.filter(m => !m.user.bot);

    const role = interaction.options.getRole('role');
    if (role) {
      members = members.filter(m => m.roles.cache.has(role.id));
    }

    if (members.size === 0) return interaction.reply({ content: t(locale, 'bot.randomuser.noMembers'), ephemeral: true });

    const arr = [...members.values()];
    const winner = arr[Math.floor(Math.random() * arr.length)];

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'bot.randomuser.title'))
      .setDescription(t(locale, 'bot.randomuser.result', { winner: winner.user.username }))
      .setThumbnail(winner.user.displayAvatarURL())
      .setColor(0xe74c3c)
      .setFooter({ text: t(locale, 'bot.randomuser.among', { count: members.size }) });

    await interaction.reply({ embeds: [embed] });
  },
};
