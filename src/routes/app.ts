import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import '../config';
import { setSimpleRouters } from '../controllers/routeController';

const JWT_SECRET = process.env.JWT_SECRET || 'jwtsecret';

const router: express.Router = express.Router();

setSimpleRouters(router, [ 'chart', 'skyway' ]);

router.get('/chat', (req: Request, res: Response) => {
    const csrfToken = req.csrfToken ? req.csrfToken() : undefined;
    if (!csrfToken) {
        res.status(400).send('Invalid Access');
        return;
    }

    const payload: Jsonwebtoken.WebSocketJwtPayload = { csrfToken };

    const token: string = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    const encodedToken = encodeURIComponent(token);
    res.render(`chat`, { token: encodedToken });
});

export default router;
