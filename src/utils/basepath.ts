import '../config';
import { isUrl } from './is';

export function getHPURL(slash: boolean = true): string {
  var url: string = '';
  if (process.env.NODE_ENV === 'production') {
    if (process.env.IS_HTTPS === 'true') {
      url += 'https://';
    }
    url += process.env.PRODUCTION_HOST || 'localhost';
  } else {
    url += 'http://localhost';
  }

  if (process.env.PORT) {
    url += ":" + process.env.PORT;
  }

  if (slash) {
    url += '/'
  }

  return url;
}

function getRootURL(): string {
  var url: string = '';
  if (process.env.NODE_ENV === 'production') {
    if (process.env.IS_HTTPS === 'true') {
      url += 'https://';
    }
    url += process.env.PRODUCTION_HOST || 'localhost';
  } else {
    url += 'http://localhost';
  }

  if (process.env.PORT) {
    url += ":" + process.env.PORT;
  }
  url += getRootPath() + '/'

  return url;
}

function getRootPath(): string {
  return process.env.NODE_ENV === 'production'
    ? (process.env.PROXY_REVERSE_PATH || '/dev')
    : '';
}

const rooturl: string = getRootURL();
const rootpath: string = getRootPath();
const hpurl: string = getHPURL();

const wsrootpath: string = process.env.WEBSOCKET_PATH || '/ws';

function getWsUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.PROD_WEBSOCKET_URL) {
      return process.env.PROD_WEBSOCKET_URL || '';
    }
  } else {
    return 'ws://localhost:' + (process.env.PORT || '3000') + wsrootpath;
  }

  throw new Error('cannot create ws url for production because of missing .env[PROD_WEBSOCKET_URL]');
}

const wsurl = getWsUrl();

export default {
  rooturl,
  rootpath,
  hpurl,
  wsrootpath,
  wsurl,
};
