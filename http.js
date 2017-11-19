import nodeFetch from "node-fetch";

export default {
    fetch: nodeFetch,
    Headers: nodeFetch.Headers,
    Request: nodeFetch.Request,
    Response: nodeFetch.Response
};