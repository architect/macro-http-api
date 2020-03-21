let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function http(arc, cfn, stage) {

  if (arc.http) {

    // copy old in case we need it
    let appname = toLogicalID(arc.app[0]) 
    
    // delete all traces of the rest api
    delete cfn.Resources[appname] 
    delete cfn.Resources.InvokeProxyPermission
    delete cfn.Outputs.API 
    delete cfn.Outputs.restApiId

    // add the http api
    /*cfn.Resources.HTTP  = {
      Type: 'AWS::Serverless::HttpApi',
      Properties: {
        DefinitionBody: {
          openapi: '3.0.1',
          info: {
            version: '1.0',
            title: { Ref: 'AWS::StackName' }
          },
          paths: {
            "$default": {
              'x-amazon-apigateway-any-method': { isDefaultRoute: true }
            }
          }
        }
      }
    }*/

    // fix lambda event bindings 
    for (let resource of Object.keys(cfn.Resources)) {
      if (cfn.Resources[resource].Type === 'AWS::Serverless::Function') {
        let eventname = `${ resource }Event`
        cfn.Resources[resource].Properties.Events[eventname].Type = 'HttpApi'
        delete cfn.Resources[resource].Properties.Events[eventname].Properties.RestApiId
        cfn.Resources[resource].Properties.Events[eventname].Properties.PayloadFormatVersion = '1.0'
        // add mapping
       // cfn.Resources[resource].Properties.Events[eventname].Properties.ApiId = { Ref: 'HTTP' }
        if (resource.toLowerCase() === 'getindex')
          cfn.Resources[resource].Properties.Events.ImplicitApi = { Type: 'HttpApi' }
      }
    }
  }

  return cfn
}
