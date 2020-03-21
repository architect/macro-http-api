@app
test-http

@static
folder public

@http
get /
get /cats
post /cats
patch /cats/:catID
put /cats/:catID
delete /cats/:catID

@macros
http
