import session from 'express-session';
import { FMCWebType } from '../fmc';

declare module 'express-session' {
    interface SessionData {
        views: number;
        n: number;
        type: FMCWebType;
    }
}
