const path = require('path');
const express = require('express');
const { createHub } = require('./hub');
const { acceptUpgrade } = require('./websocket');

let hubInstance = null;

function getHub() {
  if (!hubInstance) {
    hubInstance = createHub();
  }
  return hubInstance;
}

function registerSanalOfisRoutes(app) {
  const sanalOfisPublic = path.join(__dirname, '..', 'public', 'sanalofis');

  // Statik dosyaları sun (css, js, img vb.)
  app.use('/sanalofis', express.static(sanalOfisPublic, {
    dotfiles: 'ignore',
    setHeaders: (res, p) => {
      if (p.endsWith('.html') || p.endsWith('.js') || p.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // Hem /sanalofis hem de /sanalofis/ çağrılarında doğrudan index.html sun
  app.get(['/sanalofis', '/sanalofis/'], (req, res) => {
    res.sendFile(path.join(sanalOfisPublic, 'index.html'));
  });

  console.log('[SanalOfis] Web rotaları başarıyla bağlandı: /sanalofis');
}

function attachSanalOfisWebSocket(server) {
  const hub = getHub();

  if (server) {
    server.on('upgrade', (req, socket, head) => {
      try {
        const pathname = new URL(req.url, 'http://x').pathname;
        if (pathname === '/ws' || pathname === '/sanalofis/ws') {
          acceptUpgrade(req, socket, conn => hub.connect(conn));
        }
      } catch (err) {
        console.error('[SanalOfis WS Upgrade Hatası]:', err.message);
      }
    });
  }

  console.log('[SanalOfis] WebSocket dinleyicisi bağlandı: /ws ve /sanalofis/ws');
  return hub;
}

module.exports = {
  registerSanalOfisRoutes,
  attachSanalOfisWebSocket,
  getHub
};
