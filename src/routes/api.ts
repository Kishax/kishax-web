import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import config from '../config';
import { getLastEntriesEachDay } from '../middlewares/counter';
import { categorizeData } from '../middlewares/categorize';
import { calculateAuthToken } from '../utils/skyway';
import { isUrl } from '../utils/urls';

const router: express.Router = express.Router();

const avatarsDir: string = path.join(__dirname, '..', config.client.icon.path);

router.get('/config', (_: Request, res: Response) => {
  res.json({
    websocketUrl: config.server.modules.express.websocket.url,
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

  if (sessionToken != (config.server.modules.skyway.session.token || 'defaulttoken')) {
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

router.get('/avatar', async (req: Request, res: Response): Promise<void> => {
  if (req.isAuthenticated()) {
    const user = req.user as any;
    if (user.custom_avatar) {
      res.redirect(user.custom_avatar);
      return;
    } else if (user.avatar) {
      if (isUrl(user.avatar)) {
        res.redirect(user.avatar);
        return;
      } else if (user.discordId) {
        const discordAvatarUrl = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}`;
        res.redirect(discordAvatarUrl);
        return;
      }
    }
  }

  try {
    const files = await fs.readdir(avatarsDir);
    if (files.length === 0) {
      res.status(404).send('No avatar files found');
      return;
    }

    const randomIndex = Math.floor(Math.random() * files.length);
    const randomFileName = files[randomIndex];
    const imagePath = path.join(avatarsDir, randomFileName);

    const imageBuffer = await fs.readFile(imagePath);
    const mimeType = getMimeType(randomFileName);

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000'
    });
    res.end(imageBuffer);
    return;

  } catch (error) {
    console.error('Error serving avatar:', error);
    res.status(500).send('Error serving avatar');
    return;
  }
});

const getMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
};

export default router;
