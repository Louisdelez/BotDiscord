const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('shared');
const { t, resolveLocale } = require('i18n');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crypto')
    .setDescription('Suivre les cryptomonnaies')
    .addSubcommand(sub => sub
      .setName('price')
      .setDescription('Voir le prix d\'une crypto')
      .addStringOption(o => o.setName('symbol').setDescription('Symbole (ex: bitcoin, ethereum)').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('watch')
      .setDescription('Voir les stats 24h d\'une crypto')
      .addStringOption(o => o.setName('symbol').setDescription('Symbole').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('alert')
      .setDescription('Créer une alerte de prix')
      .addStringOption(o => o.setName('symbol').setDescription('Symbole').setRequired(true))
      .addNumberOption(o => o.setName('price').setDescription('Prix cible').setRequired(true))
      .addStringOption(o => o.setName('direction').setDescription('Direction').setRequired(true)
        .addChoices({ name: 'Au-dessus', value: 'above' }, { name: 'En-dessous', value: 'below' })))
    .addSubcommand(sub => sub
      .setName('alerts')
      .setDescription('Lister vos alertes'))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Supprimer une alerte')
      .addStringOption(o => o.setName('id').setDescription('ID de l\'alerte').setRequired(true))),

  async execute(interaction) {
    const locale = resolveLocale(interaction.locale);
    const sub = interaction.options.getSubcommand();

    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return interaction.reply({ content: t(locale, 'common.serverNotConfigured'), ephemeral: true });

    switch (sub) {
      case 'price': {
        const symbol = interaction.options.getString('symbol').toLowerCase();
        await interaction.deferReply();

        try {
          const res = await fetch(`${COINGECKO_API}/simple/price?ids=${symbol}&vs_currencies=usd,eur&include_24hr_change=true`);
          const data = await res.json();

          if (!data[symbol]) return interaction.editReply(t(locale, 'bot.crypto.notFound'));

          const price = data[symbol];
          const embed = new EmbedBuilder()
            .setTitle(`💰 ${symbol.charAt(0).toUpperCase() + symbol.slice(1)}`)
            .setColor(price.usd_24h_change >= 0 ? 0x2ecc71 : 0xe74c3c)
            .addFields(
              { name: 'USD', value: `$${price.usd.toLocaleString()}`, inline: true },
              { name: 'EUR', value: `€${price.eur.toLocaleString()}`, inline: true },
              { name: '24h', value: `${price.usd_24h_change?.toFixed(2) || '?'}%`, inline: true },
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } catch {
          await interaction.editReply(t(locale, 'bot.crypto.priceError'));
        }
        break;
      }

      case 'watch': {
        const symbol = interaction.options.getString('symbol').toLowerCase();
        await interaction.deferReply();

        try {
          const res = await fetch(`${COINGECKO_API}/coins/${symbol}?localization=false&tickers=false&community_data=false&developer_data=false`);
          const data = await res.json();

          if (data.error) return interaction.editReply(t(locale, 'bot.crypto.notFound'));

          const market = data.market_data;
          const embed = new EmbedBuilder()
            .setTitle(`📊 ${data.name} (${data.symbol.toUpperCase()})`)
            .setThumbnail(data.image?.small)
            .setColor(0x3498db)
            .addFields(
              { name: t(locale, 'bot.crypto.fieldCurrentPrice'), value: `$${market.current_price?.usd?.toLocaleString() || '?'}`, inline: true },
              { name: t(locale, 'bot.crypto.fieldMarketCap'), value: `$${(market.market_cap?.usd / 1e9)?.toFixed(2) || '?'}B`, inline: true },
              { name: t(locale, 'bot.crypto.fieldVolume24h'), value: `$${(market.total_volume?.usd / 1e6)?.toFixed(0) || '?'}M`, inline: true },
              { name: t(locale, 'bot.crypto.fieldChange24h'), value: `${market.price_change_percentage_24h?.toFixed(2) || '?'}%`, inline: true },
              { name: t(locale, 'bot.crypto.fieldAth'), value: `$${market.ath?.usd?.toLocaleString() || '?'}`, inline: true },
              { name: t(locale, 'bot.crypto.fieldRank'), value: `#${data.market_cap_rank || '?'}`, inline: true },
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } catch {
          await interaction.editReply(t(locale, 'bot.crypto.statsError'));
        }
        break;
      }

      case 'alert': {
        const symbol = interaction.options.getString('symbol').toLowerCase();
        const targetPrice = interaction.options.getNumber('price');
        const direction = interaction.options.getString('direction');

        await prisma.cryptoAlert.create({
          data: {
            guildId: guild.id,
            userId: interaction.user.id,
            channelId: interaction.channel.id,
            symbol,
            targetPrice,
            direction,
          },
        });

        const dirLabel = direction === 'above' ? t(locale, 'bot.crypto.aboveLabel') : t(locale, 'bot.crypto.belowLabel');
        await interaction.reply(t(locale, 'bot.crypto.alertCreated', { symbol, direction: dirLabel, targetPrice }));
        break;
      }

      case 'alerts': {
        const alerts = await prisma.cryptoAlert.findMany({
          where: { guildId: guild.id, userId: interaction.user.id, triggered: false },
          orderBy: { createdAt: 'desc' },
        });

        if (alerts.length === 0) return interaction.reply({ content: t(locale, 'bot.crypto.noAlerts'), ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'bot.crypto.alertsTitle'))
          .setColor(0xf39c12)
          .setDescription(alerts.map(a => {
            const dir = a.direction === 'above' ? '📈' : '📉';
            return `${dir} **${a.symbol}** ${a.direction === 'above' ? '>' : '<'} $${a.targetPrice} — ID: \`${a.id}\``;
          }).join('\n'));

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'remove': {
        const id = interaction.options.getString('id');
        try {
          const alert = await prisma.cryptoAlert.findFirst({
            where: { id, userId: interaction.user.id },
          });
          if (!alert) return interaction.reply({ content: t(locale, 'bot.crypto.alertNotFound'), ephemeral: true });
          await prisma.cryptoAlert.delete({ where: { id } });
          await interaction.reply({ content: t(locale, 'bot.crypto.alertDeleted'), ephemeral: true });
        } catch {
          await interaction.reply({ content: t(locale, 'bot.crypto.alertNotFound'), ephemeral: true });
        }
        break;
      }
    }
  },
};
