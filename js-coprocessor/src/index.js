import express from 'express';
import { buildSchema, graphql } from 'graphql';
import * as crypto from "node:crypto";
import { authDirectiveTransformer } from "./auth.js";
import { addMocksToSchema } from "@graphql-tools/mock";

const app = express();
let cachedSchema = undefined;
let cachedSchemaHash = undefined;

const processSupergraphRequestStage = async (payload) => {
  // This is the object sent by the Router that you can act upon to update headers, context, auth claims, etc
  // If you update the "control" property from "Continue" to something like { "break": 400 }, it will terminate the request and return the specified HTTP error
  // See: https://www.apollographql.com/docs/router/customizations/coprocessor/
  //console.log(payload);
  const schema = getSchemaObject(payload.sdl);

  // Execute the operation with context that has the headers
  // The headers are required by auth.js and that is looking for the x-user-id header
  const result = await graphql({
    schema,
    source: payload.body.query,
    contextValue: { headers: payload.headers }
  });
  // You can do more specific checks here if you want to only look for certain errors
  if (result.errors?.length > 0) {
    console.log("Coprocessor found an error!")
    // Return the errors back to Router and force an HTTP 401
    // Mutate in place to keep the same id, stage, etc
    payload.control = {
      break: 401
    };
    payload.body = {
      errors: result.errors,
      extensions: result.extensions
    }
  }

  return payload;
};

// Parse the schema and hash it, so we don't reparse if it hasn't changed
const getSchemaObject = (sdl) => {
  const sdlHash = crypto.createHash('sha256').update(sdl).digest('hex');
  //console.log("Schema hash:", sdlHash);

  if (sdlHash === cachedSchemaHash) {
    return cachedSchema;
  }

  //console.log(`New schema, storing in memory...`)
  cachedSchemaHash = sdlHash;
  const newSchema = buildSchema(sdl);
  const mockedSchema = addMocksToSchema({schema: newSchema});
  cachedSchema = authDirectiveTransformer(mockedSchema);

  return cachedSchema;
};

app.post("/", express.json(), async (req, res) => {
  const payload = req.body;

  let response = payload;
  switch (payload.stage) {
    case "SupergraphRequest":
      response = await processSupergraphRequestStage(payload);
      break;
  }

  res.send(response);
});

app.listen(3007, () => {
  console.log("🚀 Coprocessor running at http://localhost:3007");
});
