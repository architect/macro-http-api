# arc-macro-http

Forward compat path to migrate Architect to API Gateway to HTTP APIs from REST APIs.

## Omg Why?!

- HTTP APIs are faster
- HTTP APIs are cheaper
- New request payload is better for parsing multivalue headers and cookies
- New response schema cleans up barfy boilerplate

Before:

```javascript
exports.handler = async function http(req) {
  // req.headers.cookie (big string u need to parse)
  // req.multiValueHeaders.cookie (array of strings)
  return {
	  isBase64Encoded: false,
	  statusCode: 200,
	  headers: { 
      'Content-Type': 'application/json' 
    },
	  body: JSON.stringify({
  		name: 'John Doe',
	  	message: 'hello',
	  })
  }
}
```

After:

```javascript
exports.handler = async function http(req) {
  // req.cookies 👍🏽
  return {
	  name: "John Doe",
  	message: "hello"
  }
}
```

> Way more chill 🧊

## Ok..How?!

Install:

`npm i @architect/macro-http-api`

And add to your arcfile:

```arc
@app
myapp

@macros
architect/macro-http-api

@http
get /
```

That's it!
