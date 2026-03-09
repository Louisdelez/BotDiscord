const { prisma } = require('shared');
const { t } = require('i18n');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

async function checkCryptoAlerts(client) {
  const alerts = await prisma.cryptoAlert.findMany({
    where: { triggered: false },
  });

  if (alerts.length === 0) return;

  // Group alerts by symbol to batch API calls
  const symbolGroups = {};
  for (const alert of alerts) {
    if (!symbolGroups[alert.symbol]) symbolGroups[alert.symbol] = [];
    symbolGroups[alert.symbol].push(alert);
  }

  const symbols = Object.keys(symbolGroups).join(',');

  try {
    const res = await fetch(`${COINGECKO_API}/simple/price?ids=${symbols}&vs_currencies=usd`);
    const data = await res.json();

    for (const [symbol, groupAlerts] of Object.entries(symbolGroups)) {
      const price = data[symbol]?.usd;
      if (!price) continue;

      for (const alert of groupAlerts) {
        const triggered =
          (alert.direction === 'above' && price >= alert.targetPrice) ||
          (alert.direction === 'below' && price <= alert.targetPrice);

        if (triggered) {
          await prisma.cryptoAlert.update({
            where: { id: alert.id },
            data: { triggered: true },
          });

          // Notify user via DM
          try {
            const user = await client.users.fetch(alert.userId);
            const dir = alert.direction === 'above' ? t('fr', 'bot.crypto.aboveLabel') : t('fr', 'bot.crypto.belowLabel');
            await user.send(
              t('fr', 'bot.crypto.alertTriggered', { symbol: symbol.toUpperCase(), direction: dir, targetPrice: alert.targetPrice, price: price.toLocaleString() })
            );
          } catch {
            // DMs closed, try channel
            try {
              const channel = await client.channels.fetch(alert.channelId);
              const dir = alert.direction === 'above' ? t('fr', 'bot.crypto.aboveLabel') : t('fr', 'bot.crypto.belowLabel');
              await channel.send(
                `<@${alert.userId}> ${t('fr', 'bot.crypto.alertTriggered', { symbol: symbol.toUpperCase(), direction: dir, targetPrice: alert.targetPrice, price: price.toLocaleString() })}`
              );
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.error('Crypto alerts check error:', err.message);
  }
}

module.exports = { checkCryptoAlerts };
