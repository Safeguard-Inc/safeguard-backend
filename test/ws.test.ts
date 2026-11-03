import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { WebSocket } from 'ws';
import { ComplianceBroadcaster } from '../src/server/ws';

describe('Compliance WebSocket Broadcaster Tests', () => {
  it('connects, receives welcome handshake, and receives broadcasted compliance events', async () => {
    const server = http.createServer();
    const broadcaster = new ComplianceBroadcaster();

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = server.address() as { port: number };
    const port = addr.port;
    broadcaster.attach(server);

    let client: WebSocket | null = null;
    try {
      client = new WebSocket(`ws://127.0.0.1:${port}/ws/compliance`);
      const receivedMessages: any[] = [];

      client.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      await new Promise<void>((resolve, reject) => {
        client!.on('open', () => resolve());
        client!.on('error', reject);
      });

      // Wait briefly for handshake message
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(broadcaster.getConnectedClientCount(), 1);
      assert.ok(receivedMessages.length >= 1);
      assert.equal(receivedMessages[0].type, 'connection_established');
      assert.equal(receivedMessages[0].protocol, 'safeguard-compliance-v1');

      // Broadcast compliance event
      const sent = broadcaster.broadcast('escrow_disputed', {
        escrowId: 42,
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        amount: '500000000',
      });
      assert.equal(sent.type, 'escrow_disputed');

      await new Promise((r) => setTimeout(r, 60));
      assert.equal(receivedMessages.length, 2);
      assert.equal(receivedMessages[1].type, 'escrow_disputed');
      assert.equal(receivedMessages[1].data.escrowId, 42);

      // Verify connected client count tracking
      assert.equal(broadcaster.getConnectedClientCount(), 1);
    } finally {
      if (client) {
        try {
          client.terminate();
        } catch {}
      }
      await broadcaster.close();
      await new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      });
    }
  });
});
