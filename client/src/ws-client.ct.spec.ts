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

test('connectionStatus becomes connected once the socket opens', async ({ mount }) => {
  const component = await mount(WsClientHarness, { props: { url: `ws://localhost:${port}` } });

  await expect(component.getByTestId('connection-status')).toHaveText('connected');
});

test('connectionStatus becomes disconnected when the server closes the connection', async ({ mount }) => {
  const component = await mount(WsClientHarness, { props: { url: `ws://localhost:${port}` } });
  await expect(component.getByTestId('connection-status')).toHaveText('connected');

  for (const client of wss.clients) client.terminate();

  await expect(component.getByTestId('connection-status')).toHaveText('disconnected', { timeout: 10_000 });
});

test('connectionStatus becomes disconnected when the socket never connects at all (server down)', async ({ mount }) => {
  // A closed port on localhost — nothing listening, matching the original
  // feedback's "server is down" scenario.
  const deadPort = port + 1;
  const component = await mount(WsClientHarness, { props: { url: `ws://localhost:${deadPort}` } });

  await expect(component.getByTestId('connection-status')).toHaveText('disconnected', { timeout: 10_000 });
});

test('reconnects and recovers to connected after the server comes back, without a new createWsClient() call', async ({ mount }) => {
  const component = await mount(WsClientHarness, {
    props: { url: `ws://localhost:${port}`, reconnectDelayMs: 50 },
  });
  await expect(component.getByTestId('connection-status')).toHaveText('connected');

  for (const client of wss.clients) client.terminate();
  await expect(component.getByTestId('connection-status')).toHaveText('disconnected');

  // The harness's WsClientHarness never re-mounts and never calls
  // createWsClient again — recovery must come from ws-client's own retry.
  await expect(component.getByTestId('connection-status')).toHaveText('connected', { timeout: 10_000 });
});

test('resends session-join to reattach after a reconnect, but not on the first connection', async ({ mount }) => {
  const receivedTypes: string[] = [];
  wss.on('connection', (socket) => {
    socket.on('message', (data) => receivedTypes.push(JSON.parse(data.toString()).type));
    socket.send(
      JSON.stringify({
        type: 'session-state',
        session: {
          code: 'WXYZ',
          selectedSong: null,
          availableParts: [],
          participants: [{ id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 }],
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

  const component = await mount(WsClientHarness, { props: { url: `ws://localhost:${port}`, reconnectDelayMs: 50 } });
  await expect(component.getByTestId('session-code')).toHaveText('WXYZ');
  expect(receivedTypes).not.toContain('session-join');

  for (const client of wss.clients) client.terminate();
  await expect(component.getByTestId('connection-status')).toHaveText('connected', { timeout: 10_000 });

  await expect.poll(() => receivedTypes).toContain('session-join');
});

test('a stale-session join failure (error while session is still null) clears the stored session, closes the socket, and stops reconnecting (T001)', async ({ mount, page }) => {
  // Track every connection the server accepts and every client-initiated
  // close it sees — a stale-session error must terminate the socket once and
  // never reconnect (no 2s rejoin storm against a dead session, feedback F002).
  let connectionCount = 0;
  const closes: number[] = [];
  wss.on('connection', (socket) => {
    connectionCount++;
    socket.on('close', () => closes.push(Date.now()));
    // The bootstrap handshake fails: a stored session that no longer exists on
    // the server. The server replies with an error and — crucially — leaves the
    // socket open, so any reconnect must come from the client's own decision.
    socket.send(JSON.stringify({ type: 'error', message: 'Session WXYZ not found' }));
  });

  // Seed a stale persisted session before mount; the fix must clear it.
  await page.evaluate(
    (key) => localStorage.setItem(key, JSON.stringify({ code: 'WXYZ', displayName: 'Ada', participantId: 'p1' })),
    'sync-tab-scroll:session',
  );

  await mount(WsClientHarness, { props: { url: `ws://localhost:${port}`, reconnectDelayMs: 50 } });

  // (a) the persisted session identity is cleared from localStorage.
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), 'sync-tab-scroll:session'), { timeout: 5_000 })
    .toBeNull();

  // (c) the client closes its socket (the server sees the close).
  await expect.poll(() => closes.length, { timeout: 5_000 }).toBeGreaterThanOrEqual(1);

  // (b) no new socket is opened after reconnectDelayMs elapses — reconnect is
  // suppressed, so the server never accepts a second connection.
  await page.waitForTimeout(300); // comfortably past reconnectDelayMs (50ms)
  expect(connectionCount).toBe(1);
});

test('retries repeatedly against a server that is down at load time, connecting once it starts listening', async ({ mount }) => {
  const deadPort = port + 1;
  const component = await mount(WsClientHarness, {
    props: { url: `ws://localhost:${deadPort}`, reconnectDelayMs: 50 },
  });
  await expect(component.getByTestId('connection-status')).toHaveText('disconnected', { timeout: 10_000 });

  // Bring a server up on the previously-dead port and confirm the retry
  // loop (already running) picks it up without any new client action.
  const secondWss = new WebSocketServer({ port: deadPort });
  try {
    await new Promise<void>((resolve) => secondWss.once('listening', resolve));
    await expect(component.getByTestId('connection-status')).toHaveText('connected', { timeout: 10_000 });
  } finally {
    for (const client of secondWss.clients) client.terminate();
    await new Promise<void>((resolve) => secondWss.close(() => resolve()));
  }
});
