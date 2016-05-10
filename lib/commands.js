var db = require('./sql_db');
var utils = require('./utils');
var redis = require('./redis_db');
var config = require('../config');
var discordBot = require('./init_client');

var os = require('os');
var moment = require('moment');
var request = require('request');
var pxlxml = require('pixl-xml');
var _ = require('underscore');

var commands = {};

commands.ping = {
    _id: 1,
    min_perm: 5,
    main_cmd: 'ping',
    alias: [],
    handlers: {
        default: function (msg) {
            utils.messages.sendReply(msg, 'ping');
            msg.delete();
        }
    }
};

commands.info = {
    _id: 2,
    min_perm: 0,
    main_cmd: 'info',
    alias: [],
    handlers: {
        default: function (msg) {
            utils.messages.sendReply(msg, 'info');
            msg.delete();
        }
    }
};

commands.joinserver = commands['join-server'] = commands.invite = {
    _id: 3,
    min_perm: 0,
    main_cmd: 'invite',
    alias: ['joinserver', 'join-server'],
    handlers: {
        default: function (msg) {
            utils.messages.sendReply(msg, 'invite.default');
            msg.delete();
        }
    }
};

commands.prefix = {
    _id: 4,
    min_perm: 3,
    main_cmd: 'prefix',
    alias: [],
    handlers: {
        server: function (msg) {
            if (msg.server.getPermissionLevel(msg.author.id) > 2) {

            } else utils.messages.sendReply(msg, 'not_allowed', function (err, msg) {
                if (!err) setTimeout(function () {
                    msg.delete();
                }, 20 * 1000);
            });
            msg.delete();
        },
        dm: function (msg) {
            utils.messages.sendReply(msg, 'dm_not_possible');
        }
    }
};

commands.lang = commands.language = {
    _id: 5,
    min_perm: 4,
    main_cmd: 'language',
    alias: ['lang'],
    handlers: {
        server: function (msg) {
            var split = msg.cleanContent.split(' ');
            if (split.length === 1) {
                utils.messages.sendReply(msg, {
                    key: 'language.current',
                    replacer: {lang: msg.server.getLanguage()}
                });
            } else if (split.length === 2) {
                if (config.languages.all.indexOf(split[1] !== -1)) {
                    msg.server.setLanguage(split[1]);
                    utils.messages.sendReply(msg, {key: 'language.set', replacer: {lang: split[1]}});
                } else utils.messages.sendReply(msg, {
                    key: 'wrong_argument',
                    replacer: {args: config.languages.all.join(' ')}
                });
            } else utils.messages.sendReply(msg, {
                key: 'wrong_argument',
                replacer: {args: config.languages.all.join(' ')}
            });
        },
        dm: function (msg) {
            var split = msg.cleanContent.split(' ');
            if (split.length === 1) {
                redis.hget('language:users', msg.author.id).then(function (lang) {
                    utils.messages.sendReply(msg, {
                        key: 'language.current',
                        replacer: {lang: (lang === null ? config.languages.default : lang)}
                    })
                });
            } else if (split.length === 2) {

            } else utils.messages.sendReply(msg, {
                key: 'wrong_argument',
                replacer: {args: config.languages.all.join(' ')}
            });
        }
    }
};

commands.whoami = {
    _id: 5,
    main_cmd: 'whoami',
    alias: [],
    min_perm: 0,
    handlers: {
        server: function (msg) {
            utils.messages.sendMessage(msg.channel, {
                key: 'whoami', replacer: {
                    username: msg.author.username,
                    uid: msg.author.id,
                    status: msg.author.status,
                    avatar: msg.author.avatarURL
                }
            });
            msg.delete();
        }
    }
};

commands.whois = {
    _id: 6,
    main_cmd: 'whois',
    alias: [],
    min_perm: 0,
    handlers: {
        server: function (msg) {
            if (msg.mentions.length === 1) {
                msg.mentions.forEach(function (user) {
                    utils.messages.sendMessage(msg.channel, {
                        key: 'whois', replacer: {
                            username: user.username,
                            uid: user.id,
                            status: user.status,
                            avatar: user.avatarURL
                        }
                    });
                });
            } else utils.sendReply('wrong_argument', msg, {args: '@username'});
            msg.delete();
        }
    }
};

commands.serverstats = {
    _id: 7,
    main_cmd: 'serverstarts',
    alias: [],
    min_perm: 0,
    handlers: {
        server: function (msg) {
            redis.keys('stats:messages:time:servers:' + msg.channel.server.id + ':*').then(function (keys) {
                utils.messages.sendReply(msg, {
                    key: 'serverstats.user', replacer: {
                        users: msg.channel.server.members.getAll('status', 'idle').length + msg.channel.server.members.getAll('status', 'online').length + '/' + msg.channel.server.members.length,
                        channels: msg.channel.server.channels.length + ' [ ' + msg.channel.server.channels.getAll('type', 'text').length + ' | ' + msg.channel.server.channels.getAll('type', 'voice').length + ' ]',
                        mpm: keys.length
                    }
                }, function (err, msg) {
                    if (!err) discordBot.deleteMessage(msg, {wait: 120 * 1000});
                });
                discordBot.deleteMessage(msg);
            });
        }
    }
};

commands.stats = {
    _id: 8,
    main_cmd: 'stats',
    alias: [],
    min_perm: 0,
    handlers: {
        server: function (msg) {
            redis.keys('stats:messages:time:all:*').then(function (keys) {
                if (msg.server.getPermissionLevel(msg.author.id) < 6) {
                    utils.messages.sendReply(msg, {
                        key: 'stats.user', replacer: {
                            servers: discordBot.servers.length,
                            users: discordBot.users.getAll('status', 'online').length + discordBot.users.getAll('status', 'idle').length,
                            mpm: keys.length
                        }
                    });
                } else {
                    utils.messages.sendMessage(msg.channel, {
                        key: 'stats.staff', replacer: {
                            servers: discordBot.servers.length,
                            users: discordBot.users.getAll('status', 'online').length + discordBot.users.getAll('status', 'idle').length + '/' + discordBot.users.length,
                            mpm: keys.length,
                            mem: Math.round((os.totalmem() - os.freemem()) / 1000000) + '/' + Math.round(os.totalmem() / 1000000),
                            sysload: os.loadavg().join(' '),
                            uptime: moment().subtract(discordBot.uptime, 'milliseconds').fromNow()
                        }
                    }, function (err, msg) {
                        if (!err) discordBot.deleteMessage(msg, {wait: 60 * 1000});
                    });
                }
                msg.delete();
            });
        }
    }
};

commands.cat = commands.kitten = commands.kitty = {
    _id: 9,
    main_cmd: 'cat',
    alias: ['kitten', 'kitty'],
    min_perm: 0,
    handlers: {
        default: function (msg) {
            request.get('http://thecatapi.com/api/images/get?format=xml&results_per_page=15&api_key=NzY0NDY', function (err, resp, body) {
                if (!err && [200, 304].indexOf(resp.statusCode) !== -1) {
                    var xml = pxlxml.parse(body);
                    discordBot.sendFile(msg, xml.data.images.image[_.random(0, 14)].url);
                } else utils.messages.sendReply(msg, 'unknown_arror');
                msg.delete();
            });
        }
    }
};

commands.smile = {
    _id: 10,
    main_cmd: 'smile',
    alias: [],
    min_perm: 0,
    handlers: {
        default: function (msg) {
            request.get('http://gifbase.com/tag/smile?format=json', function (err, resp, body) {
                if (!err && [200, 304].indexOf(resp.statusCode) !== -1) {
                    body = JSON.parse(body);
                    discordBot.sendFile(msg, body.gifs[_.random(0, body.gifs.length - 1)].url, function (err, msg) {
                        if (!err) discordBot.deleteMessage(msg, {wait: 180 * 1000});
                    });
                } else utils.sendReply(msg, 'unknown_arror');
                msg.delete();
            });
        }
    }
};

commands.wtf = {
    _id: 11,
    main_cmd: 'smile',
    alias: [],
    min_perm: 0,
    handlers: {
        default: function (msg) {
            request.get('http://gifbase.com/tag/wtf?format=json', function (err, resp, body) {
                if (!err && [200, 304].indexOf(resp.statusCode) !== -1) {
                    body = JSON.parse(body);
                    discordBot.sendFile(msg, body.gifs[_.random(0, body.gifs.length - 1)].url, function (err, msg) {
                        if (!err) discordBot.deleteMessage(msg, {wait: 180 * 1000});
                    });
                } else utils.sendReply(msg, 'unknown_arror');
                discordBot.deleteMessage(msg);
            });
        }
    }
};

commands.game = {
    _id: 12,
    main_cmd: 'game',
    alias: [],
    min_perm: 6,
    handlers: {
        default: function (msg) {
            //todo
        }
    }
};

module.exports = commands;