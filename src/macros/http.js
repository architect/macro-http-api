let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function http(arc, cfn, stage) {

  if (arc.http) {

    // delete all traces of the rest api
    let appname = toLogicalID(arc.app[0]) 
    delete cfn.Resources[appname] 
    delete cfn.Resources.InvokeProxyPermission
    delete cfn.Outputs.API 
    delete cfn.Outputs.restApiId

    // add the http api
    /*
    cfn.Resources.HTTP  = {
      Type: 'AWS::Serverless::HttpApi',
      Properties: {
        DefinitionBody: {
          openapi: '3.0.1',
          info: {
            version: '1.0',
            title: { Ref: 'AWS::StackName' }
          },
          paths: getPaths(arc)
        }
      }
    }//*/

    // fix lambda event bindings 
    for (let resource of Object.keys(cfn.Resources)) {
      if (cfn.Resources[resource].Type === 'AWS::Serverless::Function') {
        let eventname = `${ resource }Event`
        cfn.Resources[resource].Properties.Events[eventname].Type = 'HttpApi'
        delete cfn.Resources[resource].Properties.Events[eventname].Properties.RestApiId
        //cfn.Resources[resource].Properties.Events[eventname].Properties.PayloadFormatVersion = '1.0'
        //cfn.Resources[resource].Properties.Events[eventname].Properties.ApiId = { Ref: 'HTTP' }
      }
    }
  }

  return cfn
}

function getPaths(arc) {
  let paths = {
    '$default': {
      'x-amazon-apigateway-any-method': { 
        isDefaultRoute: true,
        'x-amazon-apigateway-integration': {
          type: 'AWS_PROXY',
          httpMethod: 'POST',
          payloadFormatVersion: '1.0',
          uri: {
            'Fn::GetAtt': ['GetIndex', 'Arn']
          } 
        }
      }
    },
    '/_static/{proxy+}': {
      get: {
        'x-amazon-apigateway-integration': {
          type: 'HTTP_PROXY',
          httpMethod: 'ANY',
         // passthroughBehavior: "when_no_match",
          payloadFormatVersion: '1.0',
          uri: {
            "Fn::Sub": [
              "http://${bukkit}.s3-website-${AWS::Region}.amazonaws.com",
              {
                bukkit: { Ref: 'StaticBucket' }
              }
            ]
          }
        }
      }
    }
  }
  for (let [verb, path] of arc.http) {
    let route = unexpress(path)
    if (!paths[route])
      paths[route] = {}
    paths[route][verb] = {
      'x-amazon-apigateway-integration': {
        type: 'AWS_PROXY',
        httpMethod: 'POST',
        payloadFormatVersion: '1.0',
        uri: {
          'Fn::GetAtt': [getLogicalName({ verb, path }), 'Arn']
        } 
      }
    }
  }
  return paths
}

/** should expose these helpers from architect/package ? */

function getLogicalName({ verb, path }) {
  let method = verb.toLowerCase() // get, post, put, delete, patch
  let route = getLambdaName(path).replace(/000/g, '')
  return toLogicalID(`${method}${route}`) // GetIndex
}

function getLambdaName(fn) {
  return fn === '/'
    ? '-index'
    : fn.replace(/-/g,  '_')
        .replace(/\./g, '_')
        .replace(/_/g,  '_')
        .replace(/\//g, '-')
        .replace(/:/g,  '000')
}

function unexpress(completeRoute) {
  var parts = completeRoute.split('/')
  var better = parts.map(function unexpressPart(part) {
    var isParam = part[0] === ':'
    if (isParam) {
      return `{${part.replace(':', '')}}`
    }
    else {
      return part
    }
  })
  return `${better.join('/')}`
}
