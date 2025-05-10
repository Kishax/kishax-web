import { WebType } from '.';

declare module 'express-session' {
  interface SessionData {
    views: number;
    n: number;
    type: WebType;
  }
}
