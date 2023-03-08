import './shims.js';
import { Server } from '../index.js';
import { manifest } from '../manifest.js';
var setCookie = require('set-cookie-parser');

const server = new Server(manifest);
const init = server.init({ env: process.env });

export async function handler(event) {
  const { path, method } = getVersionRoute[event.version ?? '1.0']?.(event);
  const queryString = getVersionQueryString[event.version ?? '1.0']?.(event);
  const { headers, body, isBase64Encoded } = event;
  const encoding = isBase64Encoded ? 'base64' : (headers && headers['content-encoding']) || 'utf-8';
  const rawBody = typeof body === 'string' ? Buffer.from(body, encoding) : body;
  headers.origin = process.env.ORIGIN ?? headers.origin ?? `https://${event.requestContext.domainName}`;
  const rawURL = `${headers.origin}${path}${queryString}`;

  await init;

  const rendered = await server.respond(
    new Request(rawURL, {
      method,
      headers: new Headers(headers || {}),
      body: rawBody,
    }),
    {
      getClientAddress() {
        return headers.get('x-forwarded-for');
      },
    }
  );

  if (rendered) {
    const resp = {
			statusCode: rendered.status,
      body: await rendered.text(),
			...split_headers(rendered.headers)
    };
    resp.headers['Cache-Control'] = 'no-cache';
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

const getVersionQueryString = {
  '1.0': (event) => parseQuery(event.multiValueQueryStringParameters),
  '2.0': (event) => event.rawQueryString && '?' + event.rawQueryString,
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

// Copyright (c) 2020 [these people](https://github.com/sveltejs/kit/graphs/contributors) (MIT)
// From: kit/packages/adapter-netlify/src/headers.js
/**
 * Splits headers into two categories: single value and multi value
 * @param {Headers} headers
 * @returns {{
*   headers: Record<string, string>,
*   multiValueHeaders: Record<string, string[]>
* }}
*/
export function split_headers(headers) {
	/** @type {Record<string, string>} */
	const h = {};

	/** @type {Record<string, string[]>} */
	const m = {};

	headers.forEach((value, key) => {
		if (key === 'set-cookie') {
			if (!m[key]) m[key] = [];
			m[key].push(...setCookie.splitCookiesString(value));
		} else {
			h[key] = value;
		}
	});

	return {
		headers: h,
		multiValueHeaders: m
	};
}
