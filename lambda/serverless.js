import './shims.js';
import { Server } from '../index.js';
import { manifest } from '../manifest.js';

export async function handler(event) {
  const server = new Server(manifest);
  const { path, headers, body, httpMethod, multiValueQueryStringParameters, requestContext, isBase64Encoded } = event;
  const encoding = isBase64Encoded ? 'base64' : (headers && headers['content-encoding']) || 'utf-8';
  const rawBody = typeof body === 'string' ? Buffer.from(body, encoding) : body;
  const rawURL = `https://${requestContext.domainName}${path}${parseQuery(multiValueQueryStringParameters)}`;

  const rendered = await server.respond(
    new Request(
      rawURL,
      {
        method: httpMethod,
        headers: new Headers(headers || {}),
        body: rawBody,
      },
      {
        getClientAddress() {
          return headers.get('x-forwarded-for');
        },
      }
    )
  );

  if (rendered) {
    const resp = {
      headers: {
        'cache-control': 'no-cache',
      },
      multiValueHeaders: {},
      body: await rendered.text(),
      statusCode: rendered.status,
    };

    for (let k of rendered.headers.keys()) {
      const v = rendered.headers.get(k);
      if (v instanceof Array) {
        resp.multiValueHeaders[k] = v;
      } else {
        resp.headers[k] = v;
      }
    }
    return resp;
  }

  return {
    statusCode: 404,
    body: 'Not found.',
  };
}
function parseQuery(queryParams) {
  if (!queryParams) return '';
  let queryString = '?';

  for (let queryParamKey in queryParams) {
    for (let queryParamValue of queryParams[queryParamKey]) {
      if (queryString != '?') {
        queryString += '&';
      }
      queryString += `${queryParamKey}=${queryParamValue}`;
    }
  }
  return queryString;
}
