# Notes

My notes on testing using schemathesis.

## Builder

1. Ran `npm install`.
1. Created and activated a python virtual environment using `virtualenv`.
1. Determined that the run command was `node server.js` using scripts in `package.json`.
1. Determined the host and port by reading the source code, which makes the [default port `3000` and the default IP `0.0.0.0` in `server.js`](./index.js). This is also printed to the console when the app starts.
1. Found no OpenAPI spec. Determined the routes by following an `app.use` statement importing a router. `./app/router/index.js`. From here, each route has its own particularities. For example, `/facts` is backed by `./app/router/fact.routes.js`.
1. I used Stoplight Studio to document three methods of the API. This took about 10 minutes, and is probably faster once you get the hang of it. I was able to make the spec by mixing the documentation, which showed the return values, and the source, which showed the query parameters and endpoints.
1. When trying to start the server, got a `throw new Error('\'clientAccessToken\' cannot be empty.');` error. Tracing back from the error, I found that `keys.js` needed `APIAI_ACCESS_TOKEN` defined in the environment. Other things I needed to define were `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `BASE_URL`. After this, the server starts.
1. In a few seconds, the server crashes because it cannot access mongodb. Tried `docker run -d -p 27017:27017 --name mongo1 mongo` but it didn't work because the url was hardcoded as `mongodb://${this.username}:${this.password}@ds157298.mlab.com:57298/${this.name}` in `keys.js`. Changed it to `mongodb://localhost:27017/cat-facts`. Still didn't work. Googling around, I found [this](https://stackoverflow.com/questions/58160691/server-selection-timed-out-after-10000-ms-cannot-connect-compass-to-mongodb-on), which suggested using `127.0.0.1` instead. Still didn't work. Continuing to Google around, I found the suggestion to [set `useUnifiedToplogoy` to false](https://github.com/Automattic/mongoose/issues/8381). Still didn't work. After digging through the codebase, I realized that the url to `mongoose` is supplied _twice_ in `server.js`, once to `MongoStore` and once to `mongoose.connect`. The version supplied to `mongoose.connect` was a hardcoded URL. The author must have copied and pasted it from keys.js. After I changed the hardcoded version to use url defined in `keys.js`, it worked!

In the future, it would be interesting to mock more endpoints to see if a bug could be provoked.

## Runner

The first run revealed that there was an error in my schema: `facts` returns `{all: []}`. Changed the schema, and after this it ran schemathesis.

```bash
schemathesis 
 run --base-url http://localhost:3000 .\index.yaml
=================== Schemathesis test session starts ===================
platform Windows -- Python 3.7.3, schemathesis-1.1.0, hypothesis-5.8.0, 
hypothesis_jsonschema-0.12.0, jsonschema-3.2.0
rootdir: C:\Users\MikeSolomon\devel\test-apis\cat-facts
hypothesis profile 'default' -> database=DirectoryBasedExampleDatabase('C:\\Users\\MikeSolomon\\devel\\test-apis\\cat-facts\\.hypothesis\\examples')
Schema location: file:///C:/Users/MikeSolomon/devel/test-apis/cat-facts/index.yaml
Base URL: http://localhost:3000
Specification version: Open API 3.0.0
Workers: 1
collected endpoints: 3

GET /facts E                                                     [ 33%] 
POST /facts .                                                    [ 66%] 
GET /facts/random .                                              [100%]

========================== HYPOTHESIS OUTPUT ===========================
Unreliable test timings! On an initial run, this test took 2140.00ms, which exceeded the deadline of 500.00ms, but on a subsequent run it took 16.00 ms, which did not. If you expect this sort of variability in your test timings, consider turning deadlines off for this test by setting deadline=None.
================================ ERRORS ================================
_____________________________ GET: /facts ______________________________
hypothesis.errors.Flaky: Tests on this endpoint produce unreliable results:
Falsified on the first call but did not on a subsequent one


Run this Python code to reproduce this failure: 

    requests.get('http://localhost:3000/facts', params={})

Or add this option to your command line parameters: --hypothesis-seed=77(.venv) PS C:\Users\MikeSolomon\devel\test-apis\cat-facts> schemathesis 
 run --base-url http://localhost:3000 .\index.yaml
=================== Schemathesis test session starts ===================
platform Windows -- Python 3.7.3, schemathesis-1.1.0, hypothesis-5.8.0, 
hypothesis_jsonschema-0.12.0, jsonschema-3.2.0
rootdir: C:\Users\MikeSolomon\devel\test-apis\cat-facts
hypothesis profile 'default' -> database=DirectoryBasedExampleDatabase('C:\\Users\\MikeSolomon\\devel\\test-apis\\cat-facts\\.hypothesis\\examples')
Schema location: file:///C:/Users/MikeSolomon/devel/test-apis/cat-facts/index.yaml
Base URL: http://localhost:3000
Specification version: Open API 3.0.0
Workers: 1
collected endpoints: 3

GET /facts E                                                     [ 33%]
POST /facts .                                                    [ 66%]
GET /facts/random .                                              [100%]

========================== HYPOTHESIS OUTPUT ===========================
Unreliable test timings! On an initial run, this test took 2031.00ms, which exceeded the deadline of 500.00ms, but on a subsequent run it took 31.00 ms, which did not. If you expect this sort of variability in your test timings, consider turning deadlines off for this test by setting deadline=None.
================================ ERRORS ================================
_____________________________ GET: /facts ______________________________
hypothesis.errors.Flaky: Tests on this endpoint produce unreliable results:
Falsified on the first call but did not on a subsequent one

Query           : {'animal_type': ''}

Run this Python code to reproduce this failure: 

    requests.get('http://localhost:3000/facts', params={'animal_type': ''})

Or add this option to your command line parameters: --hypothesis-seed=331870224732571072836336476566942693799
Add this option to your command line parameters to see full tracebacks: 
--show-errors-tracebacks
=============================== SUMMARY ================================

not_a_server_error            203 / 203 passed          PASSED

==================== 2 passed, 1 errored in 10.69s =====================
```

The issue is that the "bug" it claims it found is not a bug: at least when running it manually, I was not able to provoke the bug.

Then, I spotted a bug by reading the source code. In `fact.routes.js`, the line:

```js
return res.status(err).json(err);
```

will cause a bug. So human intelligence caught a bug :-)

Then, for fun, I cut out the mongodb connection after a successful start. This made the server hang and schemathesis hang completely, so it was no longer runnable.

## Mocker

All mocking happened during the build phase (mongodb, google, apiai).