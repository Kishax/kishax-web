import WebSocket from 'ws';
import readline from 'readline';

const url = 'ws://localhost:8050';
const ws = new WebSocket(url);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

ws.onopen = () => {
    console.log('Connected to the server');
    promptInput();
};

function promptInput() {
    rl.question('Enter message to send: ', (msg) => {
        if (msg === 'exit') {
            rl.close();
            ws.close();
        } else {
            ws.send(msg);
        }
    });
}

ws.onmessage = (e) => {
    console.log(`Received: ${e.data}`);
    promptInput();
};

ws.onerror = (error) => {
    console.error(`WebSocket Error: ${error}`);
};

ws.onclose = () => {
    console.log('Disconnected from the server');
    rl.close();
};
