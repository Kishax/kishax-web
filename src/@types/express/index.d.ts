import { JwtPayload } from 'jsonwebtoken';
import { IncomingMessage } from 'http';

declare global {
    namespace Jsonwebtoken {
        interface UserAuthJwtPayload extends JwtPayload {
            id: string;
            name: string;
            email: string;
        }

        interface WebSocketJwtPayload extends JwtPayload {
            csrfToken: string;
        }

		interface EmailJwtPayload extends JwtPayload {
			email: string;
		}
    }

    namespace http {
        interface IncomingMessageWithPayload extends IncomingMessage {
            payload?: Jsonwebtoken.WebSocketJwtPayload;
        }
    }

    namespace Express {
        interface Request {
            payload?: Jsonwebtoken.UserAuthJwtPayload;
            payload2?: Jsonwebtoken.UserAuthJwtPayload;
        }
    }
}
