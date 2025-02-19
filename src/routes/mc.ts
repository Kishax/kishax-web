import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import '../config';
import { FMCWebType } from '../@types/fmc';
import knex, { mknex } from '../config/knex';

const JWT_SECRET = process.env.JWT_SECRET || 'jwtsecret';

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

    req.session.type = FMCWebType.MC_AUTH;

    if (!req.isAuthenticated()) {
        res.render('mc/auth', {
            infoMessage: [ 'WEB認証にはログインが必要です。' ],
        });

        return;
    }

    const user = req.user as any;
    const userId: number = user.id;
    const User = await knex('users').where({ id: userId }).first();

    if (!req.session.n) {
        res.render('mc/auth', {
            infoMessage: [ 'サーバーに参加しよう！' ],
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
            errorMessage: [ '認証ユーザーです。' ],
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
            errorMessage: [ 'プレイヤーがオンラインでないため、WEB認証ができません。' ],
            username: User.name,
            mcAuth: false,
        });

        return;
    }

    const onlinePlayers: [ string ] = playerlist.split(",");

    if (!onlinePlayers.includes(mcuser.name)) {
        res.render('mc/auth', {
            errorMessage: [ 'プレイヤーがオンラインでないため、WEB認証ができません。' ],
            username: User.name,
            mcAuth: false,
        });

        return;
    }

    const payload: Jsonwebtoken.McAuthJwtPayload = { username: User.name, mcid: mcuser.name, uuid: mcuser.uuid };
    try {
        const token: string = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.render('mc/auth', {
            successMessage: req.flash('successMessage') || [ 'プレイヤー情報が自動入力されました。' ],
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
        req.flash('errorMessage', [ 'ログインが必要です。' ]);
        return res.redirect('/mc/auth');
    }

    const result = authSchema.safeParse(req.body);

    if (!result.success) {
        res.status(400).send('Invalid Access: result not success');
        return;
    }

    const queryData = result.data;

    try {
        const payload = jwt.verify(queryData.token, JWT_SECRET) as Jsonwebtoken.McAuthJwtPayload;

        if (queryData.mcid !== payload.mcid || queryData.uuid !== payload.uuid) {
            res.status(400).send('Invalid Access: not correspond with payload and queryData');
            return;
        }

        const dbInfo = await mknex('members').where({ name: payload.mcid, uuid: payload.uuid }).first();
        if (dbInfo && typeof dbInfo.secret2 !== 'number') {
            req.flash('errorMessage', [ 'マイクラサーバーで/retryコマンドよりワンタイムパスワードを更新してください。' ]);
            return res.redirect('/mc/auth');
        }

    } catch (error) {
        console.log('/mc/auth POST error:', error);
        res.status(400).send('Invalid Access');
        return;
    }
});

export default router;
