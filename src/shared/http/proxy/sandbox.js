let binaryTypes = require('../helpers/binary-types')
let {httpError} = require('../errors')
let templatizeResponse = require('./templatize')
let normalizeResponse = require('./response')
let mime = require('mime-types')
let path = require('path')
let fs = require('fs')
let util = require('util')
let readFile = util.promisify(fs.readFile)
let transform = require('./transform')

module.exports = async function sandbox({Key, isProxy, config, assets}) {
  // additive change... after 6.x we can rely on this env var in sandbox
  let basePath = process.env.ARC_SANDBOX_PATH_TO_STATIC || path.join(process.cwd(), '..', '..', '..', 'public')

  // Double check for assets in case we're running as proxy at root in sandbox
  let staticManifest = path.join(basePath, 'static.json')
  if (!assets && fs.existsSync(staticManifest)) {
    let file = fs.readFileSync(staticManifest).toString()
    assets = JSON.parse(file)
  }

  // Look up the blob
  // assuming we're running from a lambda in src/**/* OR from vendored node_modules/@architect/sandbox
  let filePath = path.join(basePath, Key)
  let staticFolder = process.env.ARC_STATIC_FOLDER
  if (filePath.includes(staticFolder)) filePath = filePath.replace(`${staticFolder}${path.sep}`, '')

  try {
    if (!fs.existsSync(filePath))
      throw ReferenceError(`NoSuchKey: ${filePath} not found`)

    let body = await readFile(filePath)
    let type = mime.contentType(path.extname(Key))
    let isBinary = binaryTypes.some(t => type.includes(t))

    let response = transform({
      Key,
      config,
      isBinary,
      defaults: {
        headers: {'content-type': type},
        body
      }
    })

    // Handle templating
    response = templatizeResponse({
      isBinary,
      assets,
      response,
      isSandbox: true
    })

    // Normalize response
    response = normalizeResponse({
      response,
      Key,
      isProxy,
      config
    })

    return response
  }
  catch(e) {
    // look for public/404.html
    let headers = {
      'Content-Type': 'text/html; charset=utf8;',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
    }
    let http404 = path.join(basePath, '404.html')
    let exists = fs.existsSync(http404)
    if (exists) {
      let body = await readFile(http404, {encoding: 'utf8'})
      return {headers, statusCode:404, body}
    }
    let notFound = e.message.startsWith('NoSuchKey')
    let statusCode = notFound ? 404 : 500
    let title = notFound ? 'Not found' : e.name
    let message = `
      ${e.message}<br>
      <pre>${e.stack}</pre>
    `
    let body = httpError({statusCode, title, message}).body
    return {headers, statusCode, body}
  }
}
