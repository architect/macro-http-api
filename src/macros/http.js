let { join } = require('path')
let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function http(arc, cfn, stage) {

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

  // add the _static lambda
  let copy = JSON.stringify(cfn.Resources.GetIndex) // yes this is neccessary: welcome to javascript
  cfn.Resources.GetStaticProxy = JSON.parse(copy)
  // point to dist
  cfn.Resources.GetStaticProxy.Properties.CodeUri = join(process.cwd(), 'node_modules', '@architect', 'http-proxy', 'dist')
  // ensure normal proxy behavior
  cfn.Resources.GetStaticProxy.Properties.Environment.Variables.ARC_STATIC_SPA = 'false'
  // remove copied event 
  delete cfn.Resources.GetStaticProxy.Properties.Events
  // add approp proxy event
  cfn.Resources.GetStaticProxy.Properties.Events = {
    GetStaticProxyEvent: {
      Type: 'HttpApi',
      Properties: {
        Path: '/_static/{proxy+}',
        Method: 'GET'
      }
    }
  }

  // add output var
  cfn.Outputs.HTTP = {
    Description: 'API Gateway',
    Value: {
      'Fn::Sub': [
        'https://${idx}.execute-api.${AWS::Region}.amazonaws.com',
        {
          idx: {
            Ref: 'ServerlessHttpApi'// magic ✨
          }
        }
      ]
    } 
  }

  return cfn
}
