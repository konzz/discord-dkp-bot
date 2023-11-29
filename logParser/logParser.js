module.exports = class LogParser {
    parse(log) {
        const date = new Date(log.substring(1, log.indexOf(']'))).getTime();
        const pattern = /] (\w+)/g;
        const characters = log.match(pattern).map(e => e.substring(2)).filter(c => c !== 'Players' && c !== 'There');

        return {characters, date};
    }
}