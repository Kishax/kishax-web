import { JwtPayload as OriginalJwtPayload } from 'jsonwebtoken';
import 'express';

declare global {
    namespace Jsonwebtoken {
        interface JwtPayload extends OriginalJwtPayload {
            id: string;
            name: string;
            email: string;
            iat: number;
            exp: number;
        }
    }

    namespace Express {
        interface Request {
            payload?: Jsonwebtoken.JwtPayload;
            payload2?: Jsonwebtoken.JwtPayload;
        }
    }
}
