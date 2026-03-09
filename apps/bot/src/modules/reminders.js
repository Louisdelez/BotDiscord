const { prisma } = require('shared');
const { EmbedBuilder } = require('discord.js');
const { t } = require('i18n');

async function checkReminders(client) {
  try {
    const now = new Date();
    const reminders = await prisma.reminder.findMany({
      where: { remindAt: { lte: now }, completed: false },
      include: { user: true },
    });

    for (const reminder of reminders) {
      try {
        const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
        if (!channel) continue;

        const embed = new EmbedBuilder()
          .setTitle(t('fr', 'bot.reminders.title'))
          .setDescription(reminder.message)
          .setColor(0xf39c12)
          .setTimestamp();

        await channel.send({
          content: `<@${reminder.user.discordId}>`,
          embeds: [embed],
        });

        if (reminder.recurring) {
          // Schedule next occurrence
          const nextDate = new Date(reminder.remindAt);
          if (reminder.recurring === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          else if (reminder.recurring === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (reminder.recurring === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { remindAt: nextDate },
          });
        } else {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { completed: true },
          });
        }
      } catch (err) {
        console.error('Reminder error:', err.message);
      }
    }
  } catch (err) {
    console.error('Check reminders error:', err.message);
  }
}

module.exports = { checkReminders };
