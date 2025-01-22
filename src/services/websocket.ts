import { WebSocket, WebSocketServer } from 'ws';
import '../config';
import basepath from '../utils/basepath';

const websocket = () => {
    const wss = new WebSocketServer({ noServer: true });
    const clients = new Set<WebSocket>();

    console.log(`> webSocket server is running on ${basepath.wsrootpath}`);

    wss.on('connection', (ws: WebSocket) => {
        console.log('client has connected');
        clients.add(ws);

        ws.on('message', (msg: string) => {
            const json = JSON.parse(msg);

            clients.forEach(client => {
                if (client === ws && !client['name']) {
                    client['name'] = json.user;
                }
            });

            if (json.method != null) {
                json.clients = Array.from(clients).map(client => client["name"]);
            }

            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(json));
                }
            });
        });

        ws.on('close', () => {
            const name = ws['name'];

            clients.delete(ws);

            const clientNames = Array.from(clients).map(client => client['name']);

            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        user: name,
                        method: 'close',
                        clients: clientNames
                    }));
                }
            });

            console.log('client has disconnected');
        });
    });

    return wss;
};

export default websocket;
