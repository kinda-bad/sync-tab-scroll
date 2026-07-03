import { test, expect } from '@playwright/experimental-ct-svelte';
import { WebSocketServer } from 'ws';
import type { AddressInfo } from 'node:net';
import WsClientHarness from './test-harness/WsClientHarness.svelte';

let wss: WebSocketServer;
let port: number;

test.beforeEach(async () => {
  wss = new WebSocketServer({ port: 0 });
  await new Promise<void>((resolve) => wss.once('listening', resolve));
  port = (wss.address() as AddressInfo).port;
});

test.afterEach(async () => {
  // ws's WebSocketServer.close() only stops accepting new connections and
  // fires its callback once every currently-connected client has also
  // disconnected — the browser-side WsClientHarness never closes its own
  // socket, so terminate every open client first or this hangs forever.
  for (const client of wss.clients) client.terminate();
  await new Promise<void>((resolve) => wss.close(() => resolve()));
});

test('send transmits the expected JSON-encoded message', async ({ mount, page }) => {
  const received: unknown[] = [];
  wss.on('connection', (socket) => {
    socket.on('message', (data) => received.push(JSON.parse(data.toString())));
  });

  await mount(WsClientHarness, { props: { url: `ws://localhost:${port}` } });
  await page.waitForFunction(() => Boolean((window as unknown as { __wsClient?: unknown }).__wsClient));

  await page.evaluate(() => {
    (window as unknown as { __wsClient: { send: (m: unknown) => void } }).__wsClient.send({ type: 'part-select', part: 2 });
  });

  await expect.poll(() => received.length).toBe(1);
  expect(received[0]).toEqual({ type: 'part-select', part: 2 });
});

test('an incoming session-state message updates the client store', async ({ mount }) => {
  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({
        type: 'session-state',
        session: {
          code: 'WXYZ',
          selectedSong: null,
          availableParts: [],
          participants: [],
          hostId: 'p1',
          playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
          countInEnabled: false,
          metronomeEnabled: false,
          lobbyCursorTick: null,
          spotlightMode: false,
        },
        selfParticipantId: 'p1',
      }),
    );
  });

  const component = await mount(WsClientHarness, { props: { url: `ws://localhost:${port}` } });

  await expect(component.getByTestId('session-code')).toHaveText('WXYZ');
});

test('an incoming error message pushes a toast', async ({ mount }) => {
  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'error', message: 'boom' }));
  });

  const component = await mount(WsClientHarness, { props: { url: `ws://localhost:${port}` } });

  await expect(component.getByTestId('toasts')).toContainText('boom');
});
