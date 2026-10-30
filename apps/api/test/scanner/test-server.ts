import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export type Handler = (req: IncomingMessage, res: ServerResponse) => void;

/** Tiny local HTTP server for scanner tests. Routes are matched on path (no query). */
export async function startTestServer(
  routes: Record<string, Handler>,
): Promise<{ server: Server; port: number; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0]!;
    const handler = routes[path];
    if (handler) return handler(req, res);
    res.writeHead(404, { 'content-type': 'text/html' }).end('<h1>Not found</h1>');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  return {
    server,
    port,
    close: () =>
      new Promise((r) => {
        server.closeAllConnections();
        server.close(() => r());
      }),
  };
}

export const html =
  (body: string, headers: Record<string, string> = {}, status = 200): Handler =>
  (_req, res) =>
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers }).end(body);

export const redirect =
  (location: string, status = 302): Handler =>
  (_req, res) =>
    res.writeHead(status, { location }).end();
