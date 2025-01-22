import express, { Request, Response, NextFunction } from 'express';
import '../config';
import { getLastEntriesEachDay } from '../middlewares/counter';
import { categorizeData } from '../middlewares/categorize';
import { calculateAuthToken } from '../utils/skyway';

const router: express.Router = express.Router();

router.post('/auth/skyway', (req: Request, res: Response) => {
    const roomName = req.body.roomName;
    const memberName = req.body.memberName;
    const sessionToken = req.body.sessionToken;

    if (roomName === undefined || memberName === undefined || sessionToken === undefined) {
        res.status(400).send('Bad Request');
        return;
    }

    if (sessionToken != (process.env.SKYWAY_SESSION_TOKEN || 'defaulttoken')) {
        res.status(401).send('Authentication Failed');
    }

    const iat = Math.floor(Date.now() / 1000);
    const exp = Math.floor(Date.now() / 1000) + 36000;

    const credential = { roomName, memberName, iat, exp,
        authToken: calculateAuthToken(roomName, memberName, iat, exp) };

    res.send(credential);
});

router.get('/counter', async (req: Request, res: Response, next: NextFunction) => {
    await getLastEntriesEachDay().then(rows => {
        const type: string = req.query.type as string;
        const categorizedData = categorizeData(rows, type);
        res.json(categorizedData);
    }).catch(err => next(err));
});

router.post('/counter', async (req: Request, res: Response, next: NextFunction) => {
    await getLastEntriesEachDay().then(rows => {
        const type: string = req.body.type as string;
        const categorizedData = categorizeData(rows, type);
        res.json(categorizedData);
    }).catch(err => next(err));
});

export default router;
