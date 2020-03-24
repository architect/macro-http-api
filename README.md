# arc-macro-http

Forward compat path to migrate Architect to API Gateway to HTTP APIs from REST APIs.

## Omg Why?!

Faster
Cheaper
New request payload
New response schema

Mostly I just want to rip the bandaide off as soon as possible. AWS is moving in this direction so the community should too. This should make it mostly trivial.

## Ok..How?!

This repo is both the macro code and an example of using it.

`npm i arc-macro-http`

And add to your arcfile:

```arc
@app
myapp

@macros
arc-macro-http

@http
get /
```

That's it!
