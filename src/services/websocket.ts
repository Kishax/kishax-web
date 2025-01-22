import { WebSocket, WebSocketServer } from 'ws';
import '../config';
import basepath from '../utils/basepath';

const websocket = () => {
    const wss = new WebSocketServer({ noServer: true });
    const clients = new Set<WebSocket>();

    console.log(`> webSocket server is running on ${basepath.wspath}`);

    wss.on('connection', (ws: WebSocket) => {
        console.log('client has connected');
        clients.add(ws);

        ws.on('message', (msg: string) => {
            console.log(`received message: ${msg}`);

            clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(`\nclient said: ${msg}`);
                }
            });
        });

        ws.on('close', () => {
            console.log('client has disconnected');
            clients.delete(ws);
        });
    });

    return wss;
};

export default websocket;
