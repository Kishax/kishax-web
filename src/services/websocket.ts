import { WebSocket, WebSocketServer } from 'ws';
import '../config';
import basepath from '../utils/basepath';

const isAuthenticated = (json, payload: Jsonwebtoken.WebSocketJwtPayload): boolean => {
    const jsonCsrfToken = json.csrfToken;
    const payloadCsrfToken = payload.csrfToken;
    return jsonCsrfToken && payloadCsrfToken && jsonCsrfToken === payloadCsrfToken;
};

const websocket = () => {
    const wss = new WebSocketServer({ noServer: true });
    const clients = new Set<WebSocket>();

    wss.on('connection', (ws: WebSocket, request: http.IncomingMessageWithPayload) => {
        console.log('client has connected');

        const { payload } = request;

        if (!payload) {
            ws.close();
            throw new Error('Invalid Access')
        }

        clients.add(ws);

        ws.on('message', (msg: string) => {
            const json = JSON.parse(msg);

            if (!isAuthenticated(json, payload)) {
                ws.close();
                throw new Error("Invalid Access");
            }

            const { user, method } = json;

            if (!user && !method) {
                ws.close();
                throw new Error("Invalid Access");
            }

            clients.forEach(client => {
                if (client === ws && !client['name']) {
                    client['name'] = user;
                }
            });

            if (method != null) {
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

    console.log(`> webSocket server is running on ${basepath.wsrootpath}`);
    return wss;
};

export default websocket;
