import express, { Request, Response, NextFunction } from 'express';
import '../config';
import { getLastEntriesEachDay } from '../middlewares/counter';
import { categorizeData } from '../middlewares/categorize';
import { calculateAuthToken } from '../utils/skyway';
import basepath from '../utils/basepath';

const router: express.Router = express.Router();

router.get('/config', (_: Request, res: Response) => {
  res.json({
    websocketUrl: basepath.wsurl,
  });
});

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
    return;
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = Math.floor(Date.now() / 1000) + 36000;

  const credential = {
    roomName, memberName, iat, exp,
    authToken: calculateAuthToken(roomName, memberName, iat, exp)
  };

  res.send(credential);
});

router.get('/counter', async (req: Request, res: Response) => {
  try {
    const rows = await getLastEntriesEachDay();
    const { type } = req.query as { type: string };

    if (!type || !['year', 'month', 'last7days'].includes(type)) {
      res.status(400).json({ data: null, error: 'Invalid type parameter' });
      return;
    }

    const categorizedData = categorizeData(rows, type);
    res.json({ data: categorizedData, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: 'Internal Server Error' });
  }
});

export default router;
