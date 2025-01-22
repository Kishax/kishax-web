import { WebSocket, WebSocketServer } from 'ws';
import '../config';

const websocket = () => {
    const port: number = process.env.NODE_ENV === "development" ? 8050 : Number(process.env.WEBSOCKET_PORT);
    const wss = new WebSocketServer({ port });
    const clients = new Set<WebSocket>();

    console.log(`WebSocket Server is running on port ${port}`);

    wss.on('connection', (ws: WebSocket) => {
        console.log('client has connected');
        clients.add(ws);

        ws.on('message', (msg: string) => {
            console.log(`Received message: ${msg}`);

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
};

export default websocket;
