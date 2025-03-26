#!/usr/bin/env node

import app from '../app';
import * as http from 'http';
import * as debugModule from 'debug';
import jwt from 'jsonwebtoken';
import '../config';
import websocket from '../services/websocket';
import basepath, { getHPURL } from '../utils/basepath';

const JWT_SECRET = process.env.JWT_SECRET || 'jwtsecret';

var debug = debugModule.debug('quick-start-express-typescript:server');

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

var server = http.createServer(app);
const wss = websocket();

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
server.on('upgrade', (request, socket, head) => {
  if (!request.url) {
    throw new Error("Invalid Access");
  }

  const reqUrl = getHPURL(false) + request.url;
  try {
    const parsedUrl = new URL(reqUrl);

    if (parsedUrl.pathname === basepath.wsrootpath) {
      const query = parsedUrl.searchParams;
      const token = query.get('token');
      if (!token) {
        throw new Error("Invalid Access");
      }

      const decodeToken = decodeURIComponent(token);
      const payload = jwt.verify(decodeToken, JWT_SECRET) as Jsonwebtoken.WebSocketJwtPayload;

      (request as any).payload = payload;
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (error) {
    console.error('socket error:', error);
    socket.destroy();
  }
});

function normalizePort(val: string): number | string | boolean {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

function onError(error: any): void {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
    default:
      throw error;
  }
}

function onListening(): void {
  function bind(): string {
    var addr = server.address();
    if (addr === null) {
      return '';
    }

    if (typeof addr === 'string') {
      return 'pipe ' + addr;
    }

    if ('port' in addr) {
      return 'port ' + addr.port;
    }

    return '';
  }

  debug('Listening on ' + bind());
}
