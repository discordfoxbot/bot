let Promise = require('bluebird');
let URL = require('url');

let fcache = require('../../lib/cache');
let Filter = require('./index');

let regex = /(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?/g;

class Links_Whitelist extends Filter {
    constructor(whitelist, guild) {
        super(whitelist, guild);
        this.id = 'Links_Whitelist';
        this.enabled = false;
        this.whitelist = whitelist;
    }

    check(msg) {
        let that = this;
        return new Promise((resolve, reject) => {
            let matches = msg.content.match(regex);
            if (matches.length === 0) resolve();
            else {
                for (let element in matches) {
                    let url = URL.parse(matches[element]);
                    if (!that.whitelist.includes(url.host)) {
                        reject({name: that.id});
                        return;
                    }
                }
                resolve();
            }
        });
    }
}

module.exports = Links_Whitelist;