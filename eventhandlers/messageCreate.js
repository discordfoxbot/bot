var story = require('storyboard').mainStory;
var moment = require('moment');

var db = require('../lib/db');
var fcache = require('../lib/cache');

module.exports = {
    event: 'messageCreate',
    enabled: true,
    handler: (msg)=> {
        console.log(process.env.bot_ready);
        if(process.env.bot_ready){
            if (msg.channel.guild ? fcache.getGuild(msg.channel.guild.id).getSetting('logging') : true) {
                story.info('msg', '[' + (msg.channel.guild === undefined ? 0 : msg.channel.guild.shard.id) + '][' + (msg.channel.guild === undefined ? 'Private Message' : msg.channel.guild.name) + '|' + msg.channel.name + '|' + msg.author.username + '#' + msg.author.discriminator + ']: ' + msg.cleanContent);
                db.models.Message.create({
                    mid: msg.id,
                    content: msg.content,
                    uid: msg.author.id,
                    cid: msg.channel.id,
                    gid: (msg.channel.guild !== undefined ? msg.channel.guild.id : undefined),
                    timestamp: moment().unix()
                });
            }
        }
    }
};