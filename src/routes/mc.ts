import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { WebType } from '../types';
import config from '../config';
import knex, { mknex } from '../config/knex';
import { getMessage } from '../utils/flash';
import { sendSocketMessage } from '../services/socket-client';

const authSchema = z.object({
  token: z.string(),
  mcid: z.string(),
  uuid: z.string(),
  pass: z.string(),
});

const router: express.Router = express.Router();

router.get('/auth', async (req: Request, res: Response) => {
  if (req.query.n) {
    const n: number = Number(req.query.n);
    if (!isNaN(n)) {
      req.session.n = n;
    }
  }

  req.session.type = WebType.MC_AUTH;

  if (!req.isAuthenticated()) {
    res.render('mc/auth', {
      infoMessage: ['WEB認証にはログインが必要です。'],
    });

    return;
  }

  const user = req.user as any;
  const userId: number = user.id;
  const User = await knex('users').where({ id: userId }).first();

  if (!req.session.n) {
    res.render('mc/auth', {
      infoMessage: getMessage(req, 'infoMessage') || ['サーバーに参加しよう！'],
      mcAuth: false,
    });

    return;
  }

  const mcuser = await mknex('members').where({ id: req.session.n }).first();

  if (!mcuser) {
    res.status(400).send('Invalid Access');
    return;
  }

  if (mcuser.confirm) {
    res.render('mc/auth', {
      infoMessage: getMessage(req, 'infoMessage') || ['認証済みユーザーです。'],
      username: User.name,
      mcAuth: false,
      successMessage: req.flash('successMessage'),
    });

    return;
  }

  if (!mcuser.secret2) {
    res.render('mc/auth', {
      errorMessage: getMessage(req, 'errorMessage') || [
        'ワンタイムパスワードが設定されていません。',
        'サーバーで/retryコマンドよりワンタイムパスワードを生成してください。',
        '生成後、ページのリロードが必要です。',
      ],
      username: User.name,
      mcAuth: false,
    });

    return;
  }

  const onlist = await mknex('status').where({ name: 'proxy' }).first();
  if (!onlist) {
    res.status(400).send('Database Error');
    return;
  }

  const playerlist = onlist.player_list;
  if (!playerlist) {
    res.render('mc/auth', {
      errorMessage: ['プレイヤーがオンラインでないため、WEB認証ができません。'],
      username: User.name,
      mcAuth: false,
    });

    return;
  }

  const onlinePlayers: [string] = playerlist.split(",");

  if (!onlinePlayers.includes(mcuser.name)) {
    res.render('mc/auth', {
      errorMessage: ['プレイヤーがオンラインでないため、WEB認証ができません。'],
      username: User.name,
      mcAuth: false,
    });

    return;
  }

  const payload: Jsonwebtoken.McAuthJwtPayload = { username: User.name, mcid: mcuser.name, uuid: mcuser.uuid };
  try {
    const token: string = jwt.sign(payload, config.server.modules.jwt.secret, { expiresIn: '1h' });

    res.render('mc/auth', {
      successMessage: getMessage(req, 'successMessage') || ['プレイヤー情報が自動入力されました。'],
      username: User.name,
      mcid: mcuser.name,
      uuid: mcuser.uuid,
      mcAuth: true,
      token,
    });
  } catch (error) {
    res.status(400).send('Can\'t generate token');
    return;
  }
});

router.post('/auth', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    req.flash('errorMessage', ['ログインが必要です。']);
    return res.redirect(`${config.server.root}/mc/auth`);
  }

  const user = req.user as any;

  const result = authSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).send('Invalid Access: result not success');
    return;
  }

  const queryData = result.data;

  try {
    const payload = jwt.verify(queryData.token, config.server.modules.jwt.secret) as Jsonwebtoken.McAuthJwtPayload;

    if (queryData.mcid !== payload.mcid || queryData.uuid !== payload.uuid) {
      res.status(400).send('Invalid Access');
      return;
    }

    const dbInfo = await mknex('members').where({ name: payload.mcid, uuid: payload.uuid }).first();

    if (!dbInfo) {
      res.status(400).send('Invalid Access');
      return;
    }

    if (dbInfo.confirm) {
      req.flash('infoMessage', ['認証済みユーザーです。']);
      return res.redirect(`${config.server.root}/mc/auth`);
    }

    if (dbInfo.secret2 != queryData.pass) {
      mknex('members')
        .update({ secret2: null })
        .where({ name: payload.mcid, uuid: payload.uuid })
        .then((result) => {
          if (result) {
            req.flash('errorMessage', [
              'ワンタイムパスワードが異なるため、リセットしました。',
              'マイクラサーバーで/retryコマンドよりワンタイムパスワードを再生成してください。',
              '生成後、ページのリロードが必要です。',
            ]);

            res.redirect(`${config.server.root}/mc/auth`);
          }
        })
        .catch((err) => {
          res.status(400).send('Database error');
          throw new Error(err);
        });

      return;
    }

    mknex('members')
      .update({ confirm: true, secret2: null, member_id: user.id })
      .where({ name: payload.mcid, uuid: payload.uuid })
      .then((result) => {
        if (result) {
          req.flash('successMessage', ['WEB認証に成功しました。']);
          res.redirect(`${config.server.root}/mc/auth`);

          const message = {
            web: {
              confirm: {
                who: {
                  name: payload.mcid,
                  uuid: payload.uuid,
                }
              }
            }
          }

          const jsonMessage = JSON.stringify(message);
          sendSocketMessage(jsonMessage + '\r\n');
        }
      })
      .catch((err) => {
        res.status(400).send('Database error');
        throw new Error(err);
      });
  } catch (error) {
    console.log(error);
    res.status(400).send('Invalid Access');
    return;
  }
});

export default router;
