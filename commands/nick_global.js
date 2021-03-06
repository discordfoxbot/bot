let eris = require('../lib/client');
let lang = require('../lib/lang');
let fcache = require('../lib/cache');
let pubsub = require('../lib/db');

module.exports = {
    label: 'global',
    enabled: true,
    isSubcommand: true,
    generator: (msg, args)=> {
        if (fcache.getGlobalUserPerm(msg.author.id) > 6) {
            let nick = (args.join(' ').trim() !== 'reset' ? args.join(' ').trim() : eris.user.username);
            eris.guilds.map((g)=> {
                return g
            }).forEach((g, index)=> {
                setTimeout(()=> {
                    eris.editNickname(g.id, nick)
                }, index * 10000);
            });
            msg.channel.createMessage(lang.computeResponse(msg, 'nick.global'));
            pubsub.sendEvent('nicknameChange', nick);
        } else msg.channel.createMessage(lang.computeResponse(msg, 'no_permission', {
            required: 7,
            have: fcache.getGlobalUserPerm(msg.author.id) || 0
        }));
        return false;
    },
    options: {
        caseInsensitive: true,
        deleteCommand: true
    }
};