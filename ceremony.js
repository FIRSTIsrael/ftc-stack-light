import WebSocket, { WebSocketServer } from 'ws';
import config from './config.js';

for (const eventCode of Object.keys(config.events)) {
  const wsPort = config.events[eventCode];
  const wss = new WebSocketServer({ port: wsPort });
  const wssBroadcast = data => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  const red = (state, seconds) => wssBroadcast(['red', -1, state, seconds]);
  const blue = (state, seconds) => wssBroadcast(['blue', -1, state, seconds]);
  const amber = (state, seconds) => wssBroadcast(['amber', -1, state, seconds]);
  const green = (state, seconds) => wssBroadcast(['green', -1, state, seconds]);

  setInterval(() => {
    blue('on', 1);
    setTimeout(() => red('on', 1), 1000);
    setTimeout(() => amber('on', 1), 2000);
    setTimeout(() => green('on', 1), 3000);
  }, 4000);
}
