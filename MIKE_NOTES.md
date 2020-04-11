# Notes

My notes on testing using schemathesis.

## Builder

1. Ran `npm install`.
1. Created and activated a python virtual environment using `virtualenv`.
1. Determined that the run command was `node server.js` using scripts in `package.json`.
1. Determined the host and port by reading the source code, which makes the [default port `3000` and the default IP `0.0.0.0` in `server.js`](./index.js). This is also printed to the console when the app starts.
1. Found no OpenAPI spec. Determined the routes by following an `app.use` statement importing a router. `./app/router/index.js`. From here, each route has its own particularities. For example, `/facts` is backed by `./app/router/fact.routes.js`.
1. Started to try to use Stoplight studio to document the API. This wound up being really slow - I couldn't even input an endpoint in 6m with the flipping back and forth between the code and the editor, and it wasn't clear to me I was picking up on all the pertinent parameters. Furthermore, the mongo schemas are difficult to grok from reading the code alone. For example, the schema for `fact` model has a `delete` field that is added by the `mongo-delete` package, but a static code analyzer of just the repo would never pick up on that.

## Runner

Did not run yet as it would require building an OpenAPI schema from the source code. This seems doable, but would take time, and I'm not sure yet that it's a route we want to go down. It would make our product more attractive and harder to copy, but I'm not sure how many APIs fall into this category.

## Mocker

Did not go down this route either, but it is clear that there are several dependencies. The one that would make the app crash first is the MongoDB dependency. Also, the need for an auth header would make a lot of the endpoints inaccessible out of the box.