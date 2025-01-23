import { htmlspecialchars } from './utils/escape';

window.addEventListener('DOMContentLoaded', () => {
    const name = prompt('名前を入れてください。');
    if (!name) {
        console.error('Invalid Access');
        return;
    }
    document.getElementById('name').value = name;

    fetch('/api/config')
        .then(response => response.json())
        .then(config => {
            const ws = new WebSocket(config.websocketUrl);

            ws.addEventListener('open', () => {
                ws.send(JSON.stringify({ user: htmlspecialchars(name), method: 'connect' }));
            });

            const input = document.getElementById('input');

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });

            document.getElementById('send').addEventListener('click', () => {
                sendMessage();
            });

            function sendMessage() {
                const text = input.value;
                if (text.length > 0) {
                    const json = { user: htmlspecialchars(name), message: htmlspecialchars(text) };
                    ws.send(JSON.stringify(json));
                    input.value = '';
                }
            }

            const output = document.getElementById('output');

            ws.addEventListener('message', message => {
                const json = JSON.parse(message.data);
                const line = document.createElement('div');

                if (json.clients != null) {
                    document.getElementById('n-client').innerHTML = `只今、${json.clients.length}人が接続しています。`;
                    if (json.method === 'connect') {
                        line.innerHTML = htmlspecialchars(json.user) + 'が接続しました。';
                    } else if (json.method === 'close') {
                        line.innerHTML = htmlspecialchars(json.user) + 'が切断しました。';
                    } else {
                        alert('不正なメソッド: ', json.method);
                    }
                    output.appendChild(line);
                } else if (json.message != null) {
                    line.innerHTML = htmlspecialchars(json.user) + ' > ' + htmlspecialchars(json.message);
                    output.appendChild(line);
                } else {
                    alert('不正なデータ形式です。');
                }

                output.scrollTop = output.scrollHeight;
            });
        });
});