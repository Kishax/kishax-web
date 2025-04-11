import session from 'express-session';
import { WebType } from '../web';

declare module 'express-session' {
  interface SessionData {
    views: number;
    n: number;
    type: WebType;
  }
}
