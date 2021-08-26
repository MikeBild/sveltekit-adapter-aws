import { URLSearchParams } from 'url';
import { init, render } from '../output/server/app.js';

init();

export async function handler(event) {
  const { path, httpMethod, headers, body, multiValueQueryStringParameters, isBase64Encoded } = event;

  const query = new URLSearchParams();
  if (multiValueQueryStringParameters) {
    Object.keys(multiValueQueryStringParameters).forEach((k) => {
      const vs = multiValueQueryStringParameters[k];
      vs.forEach((v) => {
        query.append(k, v);
      });
    });
  }

  const encoding = isBase64Encoded ? 'base64' : headers['content-encoding'] || 'utf-8';
  const rawBody = typeof body === 'string' ? Buffer.from(body, encoding) : body;

  const rendered = await render({
    method: httpMethod,
    headers,
    path,
    query,
    rawBody,
  });

  if (rendered) {
    const resp = {
      headers: {},
      multiValueHeaders: {},
      isBase64Encoded: false,
      statusCode: rendered.status,
      body: rendered.body,
    };
    Object.keys(rendered.headers).forEach((k) => {
      const v = rendered.headers[k];
      if (v instanceof Array) {
        resp.multiValueHeaders[k] = v;
      } else {
        resp.headers[k] = v;
      }
    });
    return resp;
  }

  return {
    statusCode: 404,
    body: 'Not found.',
  };
}
