import http from 'k6/http';
import { sleep, check } from 'k6';
export const options = {
    scenarios: {
        loadtest: {
            executor: 'constant-arrival-rate',
            rate: 500,
            timeUnit: '1s',
            duration: '30s',
            preAllocatedVUs: 150,
        }
    }
};

const GRAPHQL_QUERIES = [
    {
        "operation": "query NoAuth { hello }",
        "operationName": "NoAuth"
    },
    {
        "operation": "query AuthN { helloAuthN }",
        "operationName": "AuthN"
    },
    {
        "operation": "query AuthZ { helloAuthZ }",
        "operationName": "AuthZ"
    },
]

export default function () {
    let seed = Math.floor(Math.random() * GRAPHQL_QUERIES.length)
    let op = GRAPHQL_QUERIES[seed]
    const payload = JSON.stringify({
        query: op.operation,
        variables: op.variables,
        operationName: op.operationName
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'apollographql-client-name': 'k6',
            'apollographql-client-version': 'loadtest',
            'x-user-role': 'ADMIN'
        },
    };
    let resp = http.post('http://host.docker.internal:4000/', payload, params);
    check(resp, {
        "response code was 200": (res) => res.status === 200,
        "did not contain any errors": (res) => {
            return !res.json().errors
        }
    })
    sleep(1);
}
