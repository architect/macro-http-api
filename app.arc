@app
test-http

@static
folder public

@http
get /cats
post /cats
patch /cats/:catID
put /cats/:catID
delete /cats/:catID

@macros
http # this is local ref, use architect/macro-http-api if you consume this macro as a module
