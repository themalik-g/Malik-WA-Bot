const antibadwordCommand = require('./antibadword');
const { handleBadwordDetection } = require('../lib/antibadword');

module.exports = {
    antibadwordCommand,
    handleBadwordDetection
};
