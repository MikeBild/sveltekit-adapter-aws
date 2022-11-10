import './shims.js';
import { Server } from '../index.js';
import { manifest } from '../manifest.js';

const server = new Server(manifest);

export async function handler(event) {
  const { path, method } = getVersionRoute[event.version ?? '1.0']?.(event);
  const { headers, body, multiValueQueryStringParameters, isBase64Encoded } = event;
  const encoding = isBase64Encoded ? 'base64' : (headers && headers['content-encoding']) || 'utf-8';
  const rawBody = typeof body === 'string' ? Buffer.from(body, encoding) : body;
  headers.origin = process.env.ORIGIN ?? headers.origin ?? `https://${event.requestContext.domainName}`;
  const rawURL = `${headers.origin}${path}${parseQuery(multiValueQueryStringParameters)}`;

  await server.init({ env: process.env });

  const rendered = await server.respond(
    new Request(
      rawURL,
      {
        method,
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

const getVersionRoute = {
  '1.0': (event) => ({
    method: event.httpMethod,
    path: event.path,
  }),
  '2.0': (event) => ({
    method: event.requestContext.http.method,
    path: event.requestContext.http.path,
  }),
};

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
