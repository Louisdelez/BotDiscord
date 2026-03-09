const Redis = require('ioredis');
const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { prisma } = require('shared');
const { t } = require('i18n');

let redisSub;
let redisPub;

const PERMISSION_MAP = {
  Administrator: PermissionFlagsBits.Administrator,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  KickMembers: PermissionFlagsBits.KickMembers,
  BanMembers: PermissionFlagsBits.BanMembers,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  ViewAuditLog: PermissionFlagsBits.ViewAuditLog,
};

const CHANNEL_TYPE_MAP = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  announcement: ChannelType.GuildAnnouncement,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function publishProgress(guildId, requestId, data) {
  redisPub.publish('bot-events', JSON.stringify({
    type: 'setup:progress',
    guildId,
    requestId,
    ...data,
  }));
}

async function applySetup(client, cmd) {
  const { guildId, requestId, roles = [], categories = [], communityTemplateId } = cmd;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    publishProgress(guildId, requestId, { status: 'error', message: t('fr', 'bot.setupBridge.serverNotFound') });
    return;
  }

  const totalSteps = roles.length + categories.reduce((sum, c) => sum + 1 + c.channels.length, 0);
  let done = 0;
  const createdRoles = {};
  const configUpdates = {};

  publishProgress(guildId, requestId, { status: 'started', done: 0, total: totalSteps, message: t('fr', 'bot.setupBridge.starting') });

  try {
    // 1. Create roles
    for (const role of roles) {
      const permBits = (role.permissions || []).reduce((bits, p) => {
        if (PERMISSION_MAP[p]) bits |= PERMISSION_MAP[p];
        return bits;
      }, 0n);

      const created = await guild.roles.create({
        name: role.name,
        color: role.color || undefined,
        hoist: role.hoist || false,
        mentionable: role.mentionable || false,
        permissions: permBits,
        reason: t('fr', 'bot.setupBridge.reason'),
      });

      createdRoles[role.key || role.name] = created;
      done++;
      publishProgress(guildId, requestId, {
        status: 'progress',
        done,
        total: totalSteps,
        message: t('fr', 'bot.setupBridge.roleCreated', { name: role.name }),
      });

      await sleep(300);
    }

    // 2. Create categories + channels
    for (const category of categories) {
      const categoryChannel = await guild.channels.create({
        name: category.name,
        type: ChannelType.GuildCategory,
        reason: t('fr', 'bot.setupBridge.reason'),
      });
      done++;
      publishProgress(guildId, requestId, {
        status: 'progress',
        done,
        total: totalSteps,
        message: t('fr', 'bot.setupBridge.categoryCreated', { name: category.name }),
      });

      await sleep(250);

      for (const ch of category.channels) {
        const overwrites = [];

        // Read-only channels: deny SendMessages for @everyone
        if (ch.readOnly) {
          overwrites.push({
            id: guild.id, // @everyone role
            deny: [PermissionFlagsBits.SendMessages],
          });
        }

        // Private channels: deny ViewChannel for @everyone, allow for staff roles
        if (ch.private) {
          overwrites.push({
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          });
          // Allow admin & moderator roles to view
          for (const [key, role] of Object.entries(createdRoles)) {
            if (['admin', 'moderator', 'ceo', 'manager', 'professor'].includes(key)) {
              overwrites.push({
                id: role.id,
                allow: [PermissionFlagsBits.ViewChannel],
              });
            }
          }
        }

        // Restricted channels: deny ViewChannel for @everyone, allow for specific roles
        if (ch.restrictedTo) {
          overwrites.push({
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          });
          for (const roleKey of ch.restrictedTo) {
            if (createdRoles[roleKey]) {
              overwrites.push({
                id: createdRoles[roleKey].id,
                allow: [PermissionFlagsBits.ViewChannel],
              });
            }
          }
          // Always let admin/ceo/manager roles see restricted channels
          for (const [key, role] of Object.entries(createdRoles)) {
            if (['admin', 'ceo', 'manager'].includes(key) && !ch.restrictedTo.includes(key)) {
              overwrites.push({
                id: role.id,
                allow: [PermissionFlagsBits.ViewChannel],
              });
            }
          }
        }

        // Fallback announcement to text if guild doesn't have COMMUNITY feature
        let channelType = CHANNEL_TYPE_MAP[ch.type] || ChannelType.GuildText;
        if (channelType === ChannelType.GuildAnnouncement && !guild.features.includes('COMMUNITY')) {
          channelType = ChannelType.GuildText;
        }

        const created = await guild.channels.create({
          name: ch.name,
          type: channelType,
          parent: categoryChannel.id,
          topic: ch.topic || undefined,
          permissionOverwrites: overwrites.length > 0 ? overwrites : undefined,
          reason: t('fr', 'bot.setupBridge.reason'),
        });

        // Track configKeys
        if (ch.configKey) {
          configUpdates[ch.configKey] = created.id;
        }

        done++;
        publishProgress(guildId, requestId, {
          status: 'progress',
          done,
          total: totalSteps,
          message: t('fr', 'bot.setupBridge.channelCreated', { name: ch.name }),
        });

        await sleep(250);
      }
    }

    // 3. Update GuildConfig with discovered configKeys
    if (Object.keys(configUpdates).length > 0) {
      const dbGuild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (dbGuild) {
        await prisma.guildConfig.upsert({
          where: { guildId: dbGuild.id },
          update: configUpdates,
          create: { guildId: dbGuild.id, ...configUpdates },
        });
      }
    }

    // 4. Increment uses on community template if applicable
    if (communityTemplateId) {
      await prisma.setupTemplate.update({
        where: { id: communityTemplateId },
        data: { uses: { increment: 1 } },
      }).catch(() => {});
    }

    publishProgress(guildId, requestId, {
      status: 'completed',
      done: totalSteps,
      total: totalSteps,
      message: t('fr', 'bot.setupBridge.completed', { roles: roles.length, channels: totalSteps - roles.length }),
    });
  } catch (err) {
    console.error('Setup error:', err.message);
    publishProgress(guildId, requestId, {
      status: 'error',
      done,
      total: totalSteps,
      message: t('fr', 'bot.setupBridge.error', { message: err.message }),
    });
  }
}

function initSetupBridge(client) {
  redisSub = new Redis(process.env.REDIS_URL);
  redisPub = client.redis;

  redisSub.subscribe('api-commands');
  redisSub.on('message', async (channel, message) => {
    if (channel !== 'api-commands') return;
    try {
      const cmd = JSON.parse(message);
      if (cmd.type === 'setup:apply') {
        await applySetup(client, cmd);
      }
    } catch (err) {
      console.error('SetupBridge error:', err.message);
    }
  });

  console.log('Setup bridge initialized');
}

module.exports = { initSetupBridge };
