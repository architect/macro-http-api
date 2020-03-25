let { join } = require('path')
let { existsSync } = require('fs')
let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function http(arc, cfn) {

  // delete all traces of the rest api
  let appname = toLogicalID(arc.app[0])
  delete cfn.Resources[appname]
  delete cfn.Resources.InvokeProxyPermission
  delete cfn.Outputs.API
  delete cfn.Outputs.restApiId

  // fix lambda event bindings
  for (let resource of Object.keys(cfn.Resources)) {
    if (cfn.Resources[resource].Type === 'AWS::Serverless::Function') {

      // change type to HttpApi
      let eventname = `${ resource }Event`
      cfn.Resources[resource].Properties.Events[eventname].Type = 'HttpApi'

      // generate routes implicitly
      delete cfn.Resources[resource].Properties.Events[eventname].Properties.RestApiId

      // uncomment if you want the orig payload behavior:
      // cfn.Resources[resource].Properties.Events[eventname].Properties.PayloadFormatVersion = '1.0'
      if (resource.toLowerCase() === 'getindex') {
        // enable 'default route'
        cfn.Resources[resource].Properties.Events.ImplicitApi = { Type: 'HttpApi' }
      }
    }
  }

  // create _static route if it does not exist
  if (!cfn.Resources.GetStatic) {

    // add the _static lambda
    let copy = JSON.stringify(cfn.Resources.GetIndex) // yes this is neccessary: welcome to javascript
    cfn.Resources.GetStatic = JSON.parse(copy)

    // point to dist
    let local = join(__dirname, '..', '..', 'node_modules', '@architect', 'http-proxy', 'dist')
    let global = join(process.cwd(), 'node_modules', '@architect', 'http-proxy', 'dist')
    let code = existsSync(local)? local : existsSync(global)? global : false
    if (!code) throw ReferenceError('cannot find architect/http proxy')
    cfn.Resources.GetStatic.Properties.CodeUri = code

    // ensure normal proxy behavior (do not force index.html for spa behavior)
    cfn.Resources.GetStatic.Properties.Environment.Variables.ARC_STATIC_SPA = 'false'

    // remove copied event
    delete cfn.Resources.GetStatic.Properties.Events

    // add approp proxy event
    cfn.Resources.GetStatic.Properties.Events = {
      GetStaticEvent: {
        Type: 'HttpApi',
        Properties: {
          Path: '/_static/{proxy+}',
          Method: 'GET'
        }
      }
    }
  }
  else {
    // allow the _static greedy proxy to be overridden (and make it greedy if it is)
    let proxy = cfn.Resources.GetStatic && cfn.Resources.GetStatic.Properties.Events.GetStaticEvent.Properties.Path === '/_static'
    if (proxy) {
      cfn.Resources.GetStatic.Properties.Events.GetStaticEvent.Properties.Path = '/_static/{proxy+}'
    }
  }

  // add output var for printing to the console
  cfn.Outputs.HTTP = {
    Description: 'API Gateway',
    Value: {
      'Fn::Sub': [
        'https://${idx}.execute-api.${AWS::Region}.amazonaws.com',
        {
          idx: {
            Ref: 'ServerlessHttpApi'// magic, I like that ✨
          }
        }
      ]
    }
  }

  return cfn
}
