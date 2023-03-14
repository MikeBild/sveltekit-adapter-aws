import * as fs from 'fs';

const SRC_DIR: string = `${__dirname}/../lambda`;
const DST_DIR: string = `${__dirname}/mock/lambda`;

const mockEvent = {
  headers: {
    origin: 'mock',
  },
};

describe('Lambda Server', async () => {
  const index = await import(`${__dirname}/mock/index.js`);

  vi.mock(`${__dirname}/mock/index.js`, async (importOriginal) => {
    const mod: object = await importOriginal();
    return {
      ...mod,
      Server: vi.fn(() => {}),
    };
  });

  beforeEach(() => {
    vi.resetModules();
  });

  beforeAll(() => {
    fs.mkdirSync(DST_DIR, { recursive: true });
    fs.copyFile(`${SRC_DIR}/serverless.js`, `${DST_DIR}/serverless.js`, (err) => {
      if (err) throw err;
    });
    fs.copyFile(`${SRC_DIR}/shims.js`, `${DST_DIR}/shims.js`, (err) => {
      if (err) throw err;
    });
  });

  afterAll(() => {
    fs.unlink(`${DST_DIR}/serverless.js`, (err) => {
      if (err) console.log(err);
    });
    fs.unlink(`${DST_DIR}/shims.js`, (err) => {
      if (err) console.log(err);
    });
  });

  it('Multiple set-cookie headers', async () => {
    index.Server.mockReturnValue({
      init: vi.fn(),
      respond: vi.fn(() => {
        const myHeaders = new Headers();
        myHeaders.append('set-cookie', 'cookieone=mock');
        myHeaders.append('set-cookie', 'cookietwo=mock');
        return new Response(null, {
          headers: myHeaders,
        });
      }),
    });

    const serverless = await import(`${__dirname}/mock/lambda/serverless.js`);

    const mockRequest = new Request('http://www.example.com');
    Request = vi.fn(() => mockRequest);

    const response = await serverless.handler(mockEvent);

    expect(Object.keys(response.headers).length).toBe(1);
    expect(response.multiValueHeaders['set-cookie'].length).toBe(2);
    expect(response.multiValueHeaders['set-cookie'][0]).toMatch('cookieone=mock');
    expect(response.multiValueHeaders['set-cookie'][1]).toMatch('cookietwo=mock');
  });

  it('Single set-cookie header', async () => {
    index.Server.mockReturnValue({
      init: vi.fn(),
      respond: vi.fn(() => {
        const myHeaders = new Headers();
        myHeaders.append('set-cookie', 'cookieone=mock');
        return new Response(null, {
          headers: myHeaders,
        });
      }),
    });

    const serverless = await import(`${__dirname}/mock/lambda/serverless.js`);

    const mockRequest = new Request('http://www.example.com');
    Request = vi.fn(() => mockRequest);

    const response = await serverless.handler(mockEvent);

    expect(Object.keys(response.headers).length).toBe(1);
    expect(response.multiValueHeaders['set-cookie'].length).toBe(1);
    expect(response.multiValueHeaders['set-cookie'][0]).toMatch('cookieone=mock');
  });

  it('No set-cookie header', async () => {
    index.Server.mockReturnValue({
      init: vi.fn(),
      respond: vi.fn(() => {
        const myHeaders = new Headers();
        return new Response(null, {
          headers: myHeaders,
        });
      }),
    });

    const serverless = await import(`${__dirname}/mock/lambda/serverless.js`);

    const mockRequest = new Request('http://www.example.com');
    Request = vi.fn(() => mockRequest);

    const response = await serverless.handler(mockEvent);

    expect(Object.keys(response.headers).length).toBe(1);
    expect(response.multiValueHeaders).not.toHaveProperty('set-cookie');
  });

  it('Multiple non set-cookie headers', async () => {
    index.Server.mockReturnValue({
      init: vi.fn(),
      respond: vi.fn(() => {
        const myHeaders = new Headers();
        myHeaders.append('mock', 'mock_one');
        myHeaders.append('mock', 'mock_two');
        return new Response(null, {
          headers: myHeaders,
        });
      }),
    });

    const serverless = await import(`${__dirname}/mock/lambda/serverless.js`);

    const mockRequest = new Request('http://www.example.com');
    Request = vi.fn(() => mockRequest);

    const response = await serverless.handler(mockEvent);

    expect(Object.keys(response.headers).length).toBe(2);
    expect(response.headers).toHaveProperty('mock');
    expect(response.headers['mock']).toMatch('mock_one, mock_two');
  });
});
