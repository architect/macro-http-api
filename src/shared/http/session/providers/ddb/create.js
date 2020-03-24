let uid = require('uid-safe')
let week = require('./_week-from-now')
let dynamo = require('../../../../tables/dynamo').session
let crsf = require('csrf')
let parallel = require('run-parallel')

module.exports = function _create(name, payload, callback) {
  parallel([
    function _key(callback) {
      uid(18, function _uid(err, val) {
        if (err) callback(err)
        else callback(null, {_idx: val})
      })
    },
    function _secret(callback) {
      (new crsf).secret(function _uid(err, val) {
        if (err) callback(err)
        else callback(null, {_secret: val})
      })
    }
  ],
  function _put(err, results) {
    if (err) throw err
    results.push({_ttl: week()})
    let keys = results.reduce((a, b)=> Object.assign(a, b))
    let session = Object.assign(payload, keys)
    dynamo(function _gotDB(err, db) {
      if (err) callback(err)
      else {
        db.put({
          TableName: name,
          Item: session
        },
        function _create(err) {
          if (err) callback(err)
          else callback(null, session)
        })
      }
    })
  })
}
