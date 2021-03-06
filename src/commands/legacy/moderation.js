const util = require('../../util.js');
const Discord = require('discord.js');
const moderations = require('./moderations');
const GuildConfig = require('../../GuildConfig');

const command = {};

command.description = 'Show information about a single moderation';

command.usage = '<#moderationId>';

command.names = ['moderation','mod','modinfo'];

command.execute = async (message, args, database, bot) => {
    const guildConfig = await GuildConfig.get(message.guild.id);
    if(!guildConfig.isMod(message.member) && !message.member.hasPermission('VIEW_AUDIT_LOG')) {
        await message.react(util.icons.error);
        return;
    }

    const regex = args.length ? args[0].match(/#?(\d+)/) : null;
    if (regex === null) {
        await message.channel.send(await util.usage(message, command.names[0]));
        return;
    }
    const id = parseInt(regex[1]);

    /** @type {ModerationData|null} */
    const moderation = await database.query("SELECT id, action, created, value, expireTime - created AS duration, reason, moderator FROM moderations WHERE id = ? AND guildid = ?",[id, message.guild.id]);

    if (moderation === null) {
        await message.channel.send('Moderation not found!');
        return;
    }

    await message.channel.send(new Discord.MessageEmbed({
        title: `Moderation #${moderation.id}`,
        description: moderations.moderationText(moderation)
    }));
};

module.exports = command;
