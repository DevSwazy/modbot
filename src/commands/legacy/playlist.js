const util = require('../../util.js');
const tutorial = require('./tutorial.js');
const {google} = require('googleapis');
const config = require('../../../config.json');
const GuildConfig = require('../../GuildConfig');

const command = {};

command.description = 'Specify a tutorial playlist';

command.usage = 'link|playlistId|disabled';

command.names = ['playlist'];

command.execute = async (message, args, database, bot) => {
  //Permission check
  if (!message.member.hasPermission('MANAGE_GUILD')) {
    await message.react(util.icons.error);
    await message.channel.send('You need the "Manage Server" permission to use this command.');
    return;
  }

  let match = String(args[0]).match(/youtube\.com\/.*[&?]list=(.+?)(?:&.*)?$/);
  let playlist = match ? match[1] : args[0];

  if (!playlist  || !playlist.length) {
    await message.react(util.icons.error);
    await message.channel.send("Please provide a youtube playlist link or id");
    return;
  }

  let guildConfig = await GuildConfig.get(message.guild.id);
  if (["off","disabled","none"].includes(playlist)) {
    delete guildConfig.playlist;
  }
  else {
    // noinspection JSValidateTypes
    let service = google.youtube('v3');
    let response = await service.playlists.list(/** @type {Params$Resource$Playlists$List} */{
      auth: config.googleapikey,
      part: 'id',
      id: playlist
    });

    if (response.data.items.length === 0) {
      await message.react(util.icons.error);
      await message.channel.send("Invalid playlist!");
      return;
    }
    guildConfig.playlist = playlist;
  }

  await guildConfig.save();

  tutorial.clearCache(message.guild);

  if (!["off","disabled","none"].includes(playlist)) {
    await message.channel.send(`Set playlist to https://www.youtube.com/playlist?list=${playlist}`);
  }
  else {
    await message.channel.send(`Disabled playlist`);
  }
};

module.exports = command;
