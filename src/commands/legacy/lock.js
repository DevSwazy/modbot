const util = require('../../util.js');
const Discord = require('discord.js');
const ChannelConfig = require('../../ChannelConfig');
const GuildConfig = require('../../GuildConfig');

const command = {};

command.description = 'Disallow users to send messages to one or multiple channels';

command.usage = '<global|#channel…|id…> message';

command.names = ['lock'];

command.execute = async (message, args, database, bot) => {
  /** @type {GuildConfig} */
  const guildconfig = await GuildConfig.get(message.guild.id);
  //Permission check
  if (!guildconfig.isMod(message.member) && !message.member.hasPermission('MANAGE_CHANNELS')) {
    await message.react(util.icons.error);
    return;
  }

  let channels = await util.channelMentions(message.guild,args);
  let embed = new Discord.MessageEmbed().setTitle('This channel is locked.').setDescription(args.join(' ')).setColor(util.color.red).setFooter('You are not muted, this channel is locked for everyone. Don\'t send direct messages to team members or moderators.');
  let everyone = message.guild.roles.everyone.id;

  if (channels.length) {
    let updates = [];
    for(let channel of channels) {
      channel = message.guild.channels.resolve(channel);

      if (await lock(channel, everyone, embed))
        updates.push(`<#${channel.id}>`);
    }
    if (updates.length) {
      await message.channel.send(`Locked ${updates.join(', ')}!`);
    }
    else {
      await message.channel.send(`No channels to lock!`);
    }
  }
  else if (args.length && ['all','global'].includes(args[0].toLowerCase())){
    args = args.slice(1);
    embed = embed.setDescription(args.join(' '));
    channels = bot.guilds.cache.get(message.guild.id).channels.cache;
    let updates = [];
    for(let [, channel] of channels) {
      if (!(channel instanceof Discord.TextChannel)) {
        continue;
      }

      if (await lock(/** @type {module:"discord.js".TextChannel} */ channel, everyone, embed))
        updates.push(`<#${channel.id}>`);
    }
    if (updates.length) {
      await message.channel.send(`Locked ${updates.join(', ')}!`);
    }
    else {
      await message.channel.send(`No channels to lock!`);
    }
  }
  else {
    await message.channel.send(await util.usage(message, command.names[0]));
  }
};

/**
 * lock - locks a channel
 *
 * @param  {module:"discord.js".TextChannel}          channel  the channel to lock
 * @param  {Snowflake}                                everyone the id of the @everyone role
 * @param  {module:"discord.js".MessageEmbed|String}  message  the message to send to the channel
 * @return {Boolean}                      did the channel have to be locked?
 */
async function lock(channel, everyone, message) {
  let config = await ChannelConfig.get(/** @type {module:"discord.js".Snowflake} */ channel.id);
  let permissions = channel.permissionsFor(/** @type {RoleResolvable} */ everyone);

  if (!permissions.has('VIEW_CHANNEL')) {
    return false;
  }

  let con = true;
  for(const /** @type {PermissionResolvable} */ perm of ['SEND_MESSAGES', 'ADD_REACTIONS']) {
    if (permissions.has(perm)) {
      if (channel.permissionOverwrites.get(everyone)) {
        config.lock[perm] = channel.permissionOverwrites.get(everyone).allow.has(perm) ? true : null;
      }
      else {
        config.lock[perm] = null;
      }
      let options = {};
      options[perm] = false;
      await util.retry(channel.updateOverwrite, channel, [everyone, options], 3, (/** @type module:"discord.js".GuildChannel*/ result) => {
        return !result.permissionsFor(everyone).has(perm);
      });
      con = false;
    }
  }

  if (con) {
    return false;
  }

  await channel.send(message);
  await config.save();

  return true;
}

module.exports = command;
