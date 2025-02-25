import net from 'net';

export function sendSocketMessage(message: string) {
    const client = net.createConnection({ host: 'localhost', port: 8766 }, () => {
        console.log('Connected to socket server!');
        client.write(message + '\r\n');
        client.end();
    });

    client.on('data', (data) => {
        console.log('Received:', data.toString());
        client.end();
    });

    client.on('end', () => {
        console.log('Disconnected from socket server');
    });

    client.on('error', (err) => {
        console.error('Error:', err);
    });
}

