var story = require('storyboard').mainStory;
var moment = require('moment');

var db = require('../db/sql_db');

module.exports = {
    event: 'messageCreate',
    enabled: true,
    handler: (msg)=> {
        story.info('msg', '[' + (msg.channel.guild === undefined ? 'Private Message' : msg.channel.guild.name) + '|' + msg.channel.name + '|' + msg.author.username + '#' + msg.author.discriminator + ']: ' + msg.cleanContent);
        db.models.Message.create({
            mid: msg.id,
            content: msg.content,
            uid: msg.author.id,
            cid: msg.channel.id,
            gid: (msg.channel.guild !== undefined ? msg.channel.guild.id : undefined),
            timestamp: moment().unix()
        });
    }
};