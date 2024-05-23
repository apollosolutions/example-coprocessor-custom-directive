# Coprocessor with custom auth directive

This repository demonstrates how to setup a JS coprocessor that applies some custom auth checks.

## Disclaimer
**The code in this repository is experimental and has been provided for reference purposes only. Community feedback is welcome but this project may not be supported in the same way that repositories in the official [Apollo GraphQL GitHub organization](https://github.com/apollographql) are. If you need help you can file an issue on this repository, [contact Apollo](https://www.apollographql.com/contact-sales) to talk to an expert, or create a ticket directly in Apollo Studio.**

## Architecture and recomendations
This is an example of how you can use custom directives to do very unique and complicated logic with a coprocessor. It is **not** required or reccommend for custom auth solutions. Apollo Router supports custom auth providers still using the [`@requiresScopes` and `@policy` directives](https://www.apollographql.com/docs/router/configuration/authorization/#authorization-directives), and we reccomend you use those.

This example uses `@composeDirective` to add our custom directives to the supergraph. The entire SDL is then sent to a coprocessor where it is parsed, mocked, and cached with graphql-js as a full GraphQL schema. On every request we then "execute" the operation against our mock schema that has the custom directive implementation code and runs our auth logic and we return an auth error or continue based on the response.

## Running the Example

> Note: To run this example, you will need a GraphOS Enterprise plan and must create `/router/.env` based on `/router/.env.example` which exports `APOLLO_KEY` and `APOLLO_GRAPH_REF`.

1. Run the subgraph from the `/subgraph` directory with `npm run dev`
1. Run the coprocessor based on your language of choice by following the README from the appropriate `/*-coprocessor` directory ([javascript](./js-coprocessor/README.md), [Java](./java-coprocessor/README.md), [golang](./golang-coprocessor/README.md)).
1. In the `/router` directory, download the router by running `./download_router.sh`
1. In the `/router` directory, compose the schema by running `./create_local_schema.sh`
1. In the `/router` directory, run the router by running `./start_router.sh`

Now if you run this code in the browser (http://127.0.0.1:4000/), you will be able to query the router and you will see the `payload` logged in the terminal by the coprocessor.

## Code Highlights

### Coprocessor Configuration

In `router/router-config.yaml`, the coprocessor is configured with the Router to be called on the `SupergraphRequest` stage so that Router handles basic GraphQL validation.

### Coprocessor

Implemented with JS to parse the schema and operations on every request and execute it against a mock schema.

The `auth.js` file implements the authNZ directive logic as if it was on a real GraphQL server. See comments for more details.

Send requests with the `x-user-role: ADMIN` header to test operations that require auth.
