let Promise = require('bluebird');

let eris = require('../lib/client');
let db = require('../lib/db');
let lang = require('../lib/lang');
let Chatfilter = require('./Chatfilter');

class Guild {
    constructor(gid, cb) {
        this.erisGuild = eris.guilds.find((g) => {
            return g.id === gid
        });
        let that = this;
        that.id = gid;
        that.avability = !this.erisGuild.unavailable;
        db.models.Guild.find({where: {gid: gid}}).then((guild) => {
            if (guild !== null && guild !== undefined) {
                that.name = guild.name;
                that.prefixes = [];
                that.language = guild.language;
                that.automod = guild.automod;
                that.mod_log = guild.mod_log;
                that.mute_role = guild.mute_role;
                that.initialized = guild.initialized;
                that.roles = {};
                that.settings = {
                    automod: guild.automod,
                    modlog: guild.modlog,
                    mute_role: guild.mute_role,
                    logging: guild.logging
                };
                that.customCommands = {
                    enabled: guild.customtext_enabled,
                    prefix: guild.customtext_prefix
                };
                that.chatfilter = null;
                Promise.join(that.calculatePrefixes(Promise.resolve(guild)).then((pr) => {
                        eris.registerGuildPrefix(that.id, pr);
                        return Promise.resolve()
                    }), guild.getGuildRoles().then((roles) => {
                        return Promise.all(roles.map((role) => {
                            return role.getUser();
                        })).then((users) => {
                            users.forEach((user, index) => {
                                that.roles[user.uid] = roles[index].level;
                            });
                            return guild.getOwner();
                        }).then((owner) => {
                            that.roles[owner.uid] = 6;
                            return db.models.User.findAll({where: {custom_role: {$gt: 0}}});
                        }).then(users => {
                            users.forEach((user) => {
                                if (that.roles[user.uid] < user.custom_role || that.roles[user.uid] === undefined) that.roles[user.uid] = user.custom_role;
                            });
                            return Promise.resolve();
                        });
                    }),
                    guild.getChatfilter().then(filters => {
                        this.chatfilter = new Chatfilter(filters, this);
                    })).then(() => {
                    cb(null)
                });
            } else cb(new Error('guild not found'));
        });
    }

    getLangString(key) {
        return lang.resolve(this.language, key);
    }

    getLanguage() {
        return this.language;
    }

    setLanguage(lang) {
        this.language = lang;
        return this.updateDbInstance({language: lang});
    }

    addPrefix(prefix) {
        let that = this;
        return db.models.Prefix.findOrCreate({where: {prefix: prefix}, defaults: {prefix: prefix}}).spread((prefix) => {
            return prefix.addGuild(that.id).then(() => {
                that.updateFromDb();
                return Promise.resolve();
            });
        });
    }

    removePrefix(prefix) {
        let that = this;
        return db.models.Prefix.find({where: {prefix: prefix}}).then((prefix) => {
            if (prefix.allowDisable) return prefix.removeGuild(that.id).then(() => {
                that.updateFromDb();
                return Promise.resolve(true);
            });
            else return Promise.resolve(false);
        });
    }

    getRole(uid) {
        return this.roles[uid] || 0;
    }

    getDbInstance() {
        return db.models.Guild.find({where: {gid: this.id}});
    }

    getChatfilter() {
        if (this.chatfilter !== null)return this.chatfilter;
        else return [{check: () => Promise.resolve()}];
    }

    getSetting(setting) {
        return this.settings[setting];
    }

    updateDbInstance(updates) {
        return this.getDbInstance().then((guild) => {
            return guild.update(updates);
        })
    }

    updateValues(updates) {
        if (updates !== undefined) {
            for (let i in updates) {
                if (updates.hasOwnProperty(i)) {
                    if (typeof updates[i] !== 'object' || Array.isArray(updates[i])) {
                        this[i] = updates[i];
                    } else {
                        for (let o in updates[i]) {
                            if (updates[i].hasOwnProperty(o)) this[i][o] = updates[i][o];
                        }
                    }
                }
            }
            this.writeToDb();
        } else this.updateFromDb();
    }

    calculatePrefixes(guild, register) {
        let that = this;
        guild = guild || this.getDbInstance();
        return guild.then((guild) => {
            return guild.getPrefixes();
        }).then((prefixes) => {
            that.prefixes = prefixes.map((prefix) => {
                return prefix.prefix
            });
            if (register) eris.registerGuildPrefix(that.id, that.prefixes);
            return Promise.resolve(that.prefixes);
        })
    }

    writeToDb() {
        return this.updateDbInstance({name: this.name, avability: this.avability, region: this.region});
    }

    updateFromDb() {
        let that = this;
        return db.models.Guild.find({where: {gid: that.id}}).then((guild) => {
            if (guild !== null && guild !== undefined) {
                that.name = guild.name;
                that.language = guild.language;
                that.automod = guild.automod;
                that.mod_log = guild.mod_log;
                that.mute_role = guild.mute_role;
                that.roles = {};
                that.customCommands = {
                    enabled: guild.customtext_enabled,
                    prefix: guild.customtext_prefix
                };
                Promise.all([that.calculatePrefixes(Promise.resolve(guild)).then((pr) => {
                    eris.registerGuildPrefix(that.id, pr);
                    return Promise.resolve()
                }), guild.getGuildRoles().then((roles) => {
                    return Promise.all(roles.map((role) => {
                        return role.getUser();
                    })).then((users) => {
                        users.forEach((user, index) => {
                            that.roles[user.uid] = roles[index].level;
                        });
                        return guild.getOwner();
                    }).then((owner) => {
                        that.roles[owner.uid] = 6;
                        return db.models.User.findAll({where: {custom_role: {$gt: 0}}});
                    }).then(users => {
                        users.forEach((user) => {
                            if (that.roles[user.uid] < user.custom_role || that.roles[user.uid] === undefined) that.roles[user.uid] = user.custom_role;
                        });
                        return Promise.resolve();
                    });
                })]);
            } else return Promise.reject('not found');
        });
    }

    updateFromPubSub(data) {
        this.updateValues(data.updates);
    }

}

module.exports = Guild;