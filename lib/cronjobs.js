var Cron = require('cron').CronJob;
var discordBot = require('./init_client');
var db = require('./sql_db');

var gamecron = new Cron('* 0,10,20,30,40,50 * * * *', function () {
    db.models.Game.find({order: 'RAND()'}).then(function (game) {
        discordBot.setPlayingGame(game.name);
    });
}, null, true, null, null, true);

var twitchcron = new Cron('* 5,15,25,35,45,55 * * * *', function () {
    models.TwitchChannel.findAll().then(function (channels) {
        channels.forEach(function (channel) {
            request.get(channel.api_url, function (err, resp, body) {
                if (!err && [200, 304].indexOf(resp.statusCode) !== -1) {
                    body = JSON.parse(body);
                    if (channel.status && body.stream === null) {
                        models.TwitchChannel.update({status: false}, {where: {id: channel.id}});
                    } else if (!channel.status && body.stream !== null) {
                        if (body.stream._id !== undefined) {
                            channel.getTwitchWatchers().then(function (watchers) {
                                watchers.forEach(function (watcher) {
                                    utils.sendChatMsg('twitchWatcher.wentonline', discordBot.channels.get('id', watcher.server_channel), {
                                        ch_name: body.stream.channel.display_name,
                                        str_title: body.stream.channel.status,
                                        str_game: body.stream.game,
                                        ch_link: body.stream.channel.url
                                    }, function (err) {
                                        if (!err) discordBot.sendFile(watcher.server_channel, body.preview.medium)
                                    });
                                });
                            });
                            models.TwitchChannel.update({status: true}, {where: {id: channel.id}});
                        }
                    }
                }
            });
        });
    });
}, null, true, null, null, true);

module.exports = {game: gamecron, twitch: twitchcron};