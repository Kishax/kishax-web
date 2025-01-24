import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import '../config';
import knex from '../config/knex';

const JWT_SECRET = process.env.JWT_SECRET || 'jwtsecret';

export async function generateUserToken(user, save: boolean = false, ...payloads: JwtPayload[]): Promise<string> {
    var payload: JwtPayload;
    switch (payloads.length) {
        case 0:
            payload = { id: user.id, name: user.name, email: user.email }
            break;
        case 1:
            payload = payloads[0];
            break;
        default:
            throw new Error("You should specify only one payload in 2nd arg");
    }

    const token: string = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    if (save) {
        await knex('users').where({ id: user.id, name: user.name }).update({ token });
    }

    return token;
}

export async function getToken(payload: JwtPayload): Promise<string> {
    const user = await knex('users').where({ id: payload.id, name: payload.name })
        .select('*')
        .first();

    if (!user) {
        throw new Error("Invalid access in getToken function.");
    }

    return user.token;
}

const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1] ||
                  req.query.token as string ||
                  req.body.token as string;

    const token2 = req.headers.authorization?.split(' ')[1] ||
                   req.query.token2 as string ||
                   req.body.token2 as string;

    if (!token && !token2) {
        res.status(401).json({ message: 'Token not provided' });
        return;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as Jsonwebtoken.UserAuthJwtPayload;
        req.payload = payload;
        if (token && token2) {
            const payload2 = jwt.verify(token2, JWT_SECRET) as Jsonwebtoken.UserAuthJwtPayload;
            req.payload2 = payload2;
        }
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid or expired token' });
        return;
    }
};

export default authenticateJWT;
