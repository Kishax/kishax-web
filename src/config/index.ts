import path from 'path';
import { Config } from '../types';
import baseConfig from './baseConfig';
import targetConfig from '../../data/config.json';
import { processEnvSpecificConfig } from './helper';
import { extractHostWithPort } from '../utils/urls';
import { extractWebSocketHostWithPort } from '../utils/urls';

const prodEnv = process.env.NODE_ENV === 'production'

const nodeEnv = prodEnv ? 'prod' : 'dev';

const config: Config = { ...baseConfig };

processEnvSpecificConfig(targetConfig, nodeEnv, config);

if (config.server.root === '/') {
  config.server.root = '';
}
if (config.server.modules.express.websocket.root === '/') {
  config.server.modules.express.websocket.root = '';
}

const host = prodEnv ? extractHostWithPort(config.url) : `localhost:${config.server.port}`;
if (!host) {
  console.log("The process config:\n" + JSON.stringify(config, null, 2));
  throw new Error("`config.url` is invalid.")
}

const websocketHost = prodEnv ? extractWebSocketHostWithPort(config.server.modules.express.websocket.url) : `localhost:${config.server.port}`;
if (!websocketHost) {
  console.log("The process config:\n" + JSON.stringify(config, null, 2));
  throw new Error("`config.server.modules.express.websocket.url` is invalid.")
}

config.server.host = host;
config.server.modules.express.websocket.host = websocketHost;

config.server.url = prodEnv ? config.url : `http://${config.server.host}`;
config.server.modules.express.websocket.url =
  `${config.server.modules.express.websocket.protocol}://` +
  path.join(config.server.host, config.server.modules.express.websocket.root);

if (!prodEnv && config.server.host !== config.server.modules.express.websocket.host) {
  console.log("The process config:\n" + JSON.stringify(config, null, 2));
  throw new Error("Not correspond between `config.server.host` and `config.server.modules.express.websocket.host`")
}

export default config;
