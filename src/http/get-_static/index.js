let proxy = require('@architect/shared/http/proxy/public')

exports.handler = proxy({spa: false})
