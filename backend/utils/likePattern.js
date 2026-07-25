const escapeLikePattern = (str) => str.replace(/[%_\\]/g, '\\$&')

module.exports = { escapeLikePattern }
