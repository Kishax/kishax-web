import express, { Request, Response } from 'express';
import { FMCWebType } from '../@types/fmc';
import knex, { mknex } from '../config/knex';

const router: express.Router = express.Router();

router.get('/auth', async (req: Request, res: Response) => {
    if (req.query.n) {
        const n: number = Number(req.query.n);
        if (!isNaN(n)) {
            req.session.n = n;
        }
    }

    console.log('/mc/auth//session n:', req.session.n);
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
        throw new Error('Invalid Access');
    }

    if (mcuser.confirm) {
        res.status(400).send('Invalid Access');
        throw new Error('Invalid Access');
    }

    const onlist = await mknex('status').where({ name: 'velocity'}).first();
    if (!onlist) {
        res.status(400).send('Database Error');
        throw new Error('Not found where name is velocity in status table');
    }

    const playerlist = onlist.player_list;
    if (!playerlist) {
        res.render('mc/auth', {
            errorMessage: [ 'プレイヤーがオンラインでないため、WEB認証ができません。' ],
            username: User.name,
            mcAuth: false,
        });
    }

    const onlinePlayers: [ string ] = playerlist.split(",");

    if (!onlinePlayers.includes(mcuser.name)) {
        res.render('mc/auth', {
            errorMessage: [ 'プレイヤーがオンラインでないため、WEB認証ができません。' ],
            username: User.name,
            mcAuth: false,
        });
    }

    res.render('mc/auth', {
        successMessage: [ 'プレイヤー情報が自動入力されました。' ],
        username: User.name,
        mcid: mcuser.name,
        uuid: mcuser.uuid,
        mcAuth: true,
    });
});

router.post('/auth', async (req: Request, res: Response) => {

});

export default router;
