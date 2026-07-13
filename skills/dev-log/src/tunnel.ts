/**
 * Optional HTTPS tunnel via localtunnel. Started on demand by `dev-log tunnel`
 * — never automatically — so local debugging stays dependency-light.
 */
import localtunnel from 'localtunnel';
import { PORT } from './store.js';

export async function startTunnel(): Promise<string> {
  const tunnel = await localtunnel({ port: PORT });
  return tunnel.url;
}
