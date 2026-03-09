const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const { prisma, aiChat } = require('shared');
const { playTTSResponse, listenAndTranscribe } = require('../modules/voiceAi');
const { t, resolveLocale } = require('i18n');

// Track active voice AI connections
const voiceAiConnections = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voiceai')
    .setDescription('IA vocale (expérimental)')
    .addSubcommand(sub => sub
      .setName('join')
      .setDescription('Rejoindre le salon vocal'))
    .addSubcommand(sub => sub
      .setName('leave')
      .setDescription('Quitter le salon vocal'))
    .addSubcommand(sub => sub
      .setName('ask')
      .setDescription('Poser une question (réponse audio)')
      .addStringOption(o => o.setName('question').setDescription('Votre question').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('listen')
      .setDescription('Écouter et transcrire votre voix (STT + réponse audio)')),

  async execute(interaction, client) {
    const locale = resolveLocale(interaction.locale);
    const sub = interaction.options.getSubcommand();

    const guild = await prisma.guild.findUnique({
      where: { discordId: interaction.guild.id },
      include: { aiConfig: true },
    });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    if (!guild.aiConfig?.voiceAiEnabled) {
      return interaction.reply({ content: t(locale, 'bot.voiceai.notEnabled'), ephemeral: true });
    }

    const lang = guild.aiConfig.ttsLanguage || 'fr';

    switch (sub) {
      case 'join': {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.reply({ content: t(locale, 'bot.voiceai.joinVoice'), ephemeral: true });

        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
          selfDeaf: false, // Need to hear for STT
        });

        voiceAiConnections.set(interaction.guild.id, connection);

        connection.on(VoiceConnectionStatus.Disconnected, () => {
          voiceAiConnections.delete(interaction.guild.id);
        });

        const sttAvailable = guild.aiConfig.sttEnabled && (process.env.WHISPER_API_URL || process.env.WHISPER_MODEL);
        const connectedMsg = t(locale, 'bot.voiceai.connected');
        const descLines = t(locale, 'bot.voiceai.connectedDesc').split('\n');
        const features = [descLines[0]];
        if (sttAvailable && descLines[1]) features.push(descLines[1]);

        await interaction.reply(`${connectedMsg}\n${features.join('\n')}`);
        break;
      }

      case 'leave': {
        const connection = voiceAiConnections.get(interaction.guild.id);
        if (!connection) return interaction.reply({ content: t(locale, 'bot.voiceai.notConnected'), ephemeral: true });

        connection.destroy();
        voiceAiConnections.delete(interaction.guild.id);
        await interaction.reply(t(locale, 'bot.voiceai.disconnected'));
        break;
      }

      case 'ask': {
        const connection = voiceAiConnections.get(interaction.guild.id);
        if (!connection) {
          return interaction.reply({ content: t(locale, 'bot.voiceai.notConnectedError'), ephemeral: true });
        }

        const question = interaction.options.getString('question');
        await interaction.deferReply();

        try {
          const reply = await getAIResponse(guild, question, locale);
          await playTTSResponse(connection, reply, lang);

          const embed = new EmbedBuilder()
            .setTitle(t(locale, 'bot.voiceai.title'))
            .setDescription(t(locale, 'bot.voiceai.response', { question, reply }))
            .setColor(0x9b59b6)
            .setFooter({ text: t(locale, 'bot.voiceai.audioPlayed') });

          await interaction.editReply({ embeds: [embed] });
        } catch (err) {
          console.error('VoiceAI error:', err.message);
          await interaction.editReply(t(locale, 'bot.voiceai.responseError'));
        }
        break;
      }

      case 'listen': {
        if (!guild.aiConfig.sttEnabled) {
          return interaction.reply({ content: t(locale, 'bot.voiceai.sttNotEnabled'), ephemeral: true });
        }

        const connection = voiceAiConnections.get(interaction.guild.id);
        if (!connection) {
          return interaction.reply({ content: t(locale, 'bot.voiceai.notConnectedError'), ephemeral: true });
        }

        await interaction.reply(t(locale, 'bot.voiceai.listening'));

        try {
          const transcription = await listenAndTranscribe(connection, interaction.user.id, 8000);

          if (!transcription || transcription.trim().length === 0) {
            return interaction.followUp({ content: t(locale, 'bot.voiceai.noSpeech'), ephemeral: true });
          }

          await interaction.followUp(t(locale, 'bot.voiceai.processing', { transcription }));

          const reply = await getAIResponse(guild, transcription, locale);
          await playTTSResponse(connection, reply, lang);

          const embed = new EmbedBuilder()
            .setTitle(t(locale, 'bot.voiceai.conversationTitle'))
            .setDescription(t(locale, 'bot.voiceai.conversationBody', { transcription, reply }))
            .setColor(0x9b59b6)
            .setFooter({ text: t(locale, 'bot.voiceai.conversationFooter') });

          await interaction.followUp({ embeds: [embed] });
        } catch (err) {
          console.error('VoiceAI STT error:', err.message);
          await interaction.followUp({ content: t(locale, 'bot.voiceai.transcriptionError'), ephemeral: true });
        }
        break;
      }
    }
  },
};

async function getAIResponse(guild, question, locale) {
  const reply = await aiChat(guild.aiConfig, [{
    role: 'system',
    content: 'Tu es un assistant vocal. Réponds de manière concise et naturelle, comme dans une conversation orale. Maximum 2-3 phrases.',
  }, {
    role: 'user',
    content: question,
  }], { temperature: 0.7, maxTokens: 200 });

  return reply || t(locale, 'bot.voiceai.noReply');
}
