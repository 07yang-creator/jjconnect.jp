/**
 * Auth0 Next.js SDK — official client (Regular Web App, server-side session).
 * Configure via env: APP_BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET.
 * @see https://auth0.com/docs/quickstart/webapp/nextjs
 */
import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client();
