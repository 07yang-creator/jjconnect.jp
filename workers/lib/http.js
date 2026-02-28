/**
 * HTTP helpers for JJConnect Worker
 * CORS, response builders, error handling
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // 生产环境改为具体域名，例如: 'https://jjconnect.jp'
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

/**
 * Create CORS response
 */
export function corsResponse(response) {
  const newResponse = new Response(response.body, response);
  Object.keys(CORS_HEADERS).forEach((key) => {
    newResponse.headers.set(key, CORS_HEADERS[key]);
  });
  return newResponse;
}

/**
 * Handle CORS preflight request
 */
export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Create JSON response
 */
export function jsonResponse(data, status = 200) {
  return corsResponse(
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    })
  );
}

/**
 * Create HTML response
 */
export function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=60',
      ...CORS_HEADERS,
    },
  });
}

/**
 * Create error response
 */
export function errorResponse(message, status = 400) {
  return jsonResponse(
    {
      success: false,
      error: message,
    },
    status
  );
}
