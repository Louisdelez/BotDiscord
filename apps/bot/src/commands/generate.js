const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma, aiChat } = require('shared');
const { t, resolveLocale } = require('i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Générer du contenu créatif avec l\'IA')
    .addSubcommand(sub => sub
      .setName('text')
      .setDescription('Générer du texte créatif')
      .addStringOption(o => o.setName('prompt').setDescription('Votre prompt').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('image')
      .setDescription('Générer de l\'ASCII art')
      .addStringOption(o => o.setName('prompt').setDescription('Ce que vous voulez dessiner').setRequired(true))),

  async execute(interaction, client) {
    const locale = resolveLocale(interaction.locale);
    const sub = interaction.options.getSubcommand();
    const prompt = interaction.options.getString('prompt');

    // Rate limit: 1 per 5 minutes
    const cooldownKey = `generate:${interaction.user.id}`;
    const lastUse = await client.redis.get(cooldownKey);
    if (lastUse) {
      const remaining = Math.ceil((300000 - (Date.now() - parseInt(lastUse))) / 1000);
      if (remaining > 0) {
        return interaction.reply({ content: t(locale, 'bot.generate.cooldown', { remaining }), ephemeral: true });
      }
    }

    await interaction.deferReply();
    await client.redis.set(cooldownKey, Date.now().toString(), 'EX', 300);

    try {
      const guild = await prisma.guild.findUnique({
        where: { discordId: interaction.guild.id },
        include: { aiConfig: true },
      });
      const aiConfig = guild?.aiConfig || {};

      if (sub === 'text') {
        const text = (await aiChat(aiConfig, [{
          role: 'system',
          content: t(locale, 'bot.generate.textSystemPrompt'),
        }, {
          role: 'user',
          content: prompt,
        }], { temperature: 0.9, maxTokens: 1000 })) || t(locale, 'bot.generate.cantGenerateText');

        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.generate.title'))
          .setDescription(text.slice(0, 4000))
          .setColor(0xe67e22)
          .setFooter({ text: t(locale, 'bot.generate.footer', { user: interaction.user.username }) });

        await interaction.editReply({ embeds: [embed] });
      } else {
        // ASCII art generation
        const sdUrl = process.env.SD_API_URL;

        if (sdUrl) {
          // Use Stable Diffusion if available
          try {
            const res = await fetch(`${sdUrl}/sdapi/v1/txt2img`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt,
                steps: 20,
                width: 512,
                height: 512,
                cfg_scale: 7,
              }),
            });
            const data = await res.json();
            if (data.images && data.images[0]) {
              const buffer = Buffer.from(data.images[0], 'base64');
              await interaction.editReply({
                content: `🎨 **${prompt}**`,
                files: [{ attachment: buffer, name: 'generated.png' }],
              });
              return;
            }
          } catch {}
        }

        // Fallback: ASCII art via AI
        const art = (await aiChat(aiConfig, [{
          role: 'system',
          content: t(locale, 'bot.generate.imageSystemPrompt'),
        }, {
          role: 'user',
          content: prompt,
        }], { temperature: 0.8, maxTokens: 500 })) || t(locale, 'bot.generate.cantGenerate');

        await interaction.editReply(`🎨 **${prompt}**\n\`\`\`\n${art.slice(0, 1900)}\n\`\`\``);
      }
    } catch {
      await interaction.editReply(t(locale, 'bot.generate.error'));
    }
  },
};
