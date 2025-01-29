import express, { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import '../config';
import basepath from '../utils/basepath';
import knex from '../config/knex';
import authenticateJWT, { generateUserToken, getToken } from '../middlewares/jwt';
import { sendVertificationEmail, sendVertificationEmailForResetPassword } from '../controllers/emailController';
import { requireNonLogin } from '../middlewares/checker';
import { loginRedirect, setupAuthRoutes } from '../controllers/authController';
import { defineFlashMessages, redefineFlashMessages, saveSession } from '../controllers/flashController';
import { FlashParams } from '../@types/flashType';

const JWT_SECRET = process.env.JWT_SECRET || '';

const router: express.Router = express.Router();

setupAuthRoutes(router, [ 'google', 'x', 'discord' ]);

const emailSchema = z.string().email();

router.get('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
		//
    } else {
        res.render('auth/verify-form', { title: 'password setting', auth_path: '/reset-password', label: 'メールアドレス', input_name: 'email', });
    }
});

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    try {
        email.parse(email);
        const check = await knex('users').select('id').where('email', email);
        if (!!check) {
			const payload: Jsonwebtoken.EmailJwtPayload = { email };
			const token: string = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
			const redirectUrl: string = '${basepath.rooturl}auth/set-password?token=${oldtoken}';
			await sendVertificationEmailForResetPassword(email, redirectUrl);
        }
    } catch (e) {
        redefineFlashMessages(req, {
            errorMessage: [ 'Invalid email pattern!' ],
        });

        await saveSession(req);

        res.render('auth/verify-form', { title: 'password setting', auth_path: '/reset-password', label: 'メールアドレス', input_name: 'email', });
    }
});

router.get('/set-email', requireNonLogin, authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
    if (!req.payload) {
        res.status(400).send('Invalid Access');
        return;
    }

    if (req.payload && req.payload2) {
        const check: boolean = req.payload.id === req.payload2.id && req.payload.name === req.payload2.name;
        if (check) {
            try {
                await knex('users').where({ id: req.payload.id }).update({ email: req.payload2.email });

                const user = await knex('users').where({ id: req.payload.id, name: req.payload.name }).first();

                loginRedirect(req, res, next, user, { 'successMessage': [ 'Email setting done successfully' ] });
            } catch (err) {
                res.status(500).send('Error updating email.');
            }
        } else {
            throw new Error('Invalid Access.');
        }
        return;
    }

    const token = req.query.token;
    if (!token) {
        res.status(400).send('Invalid Access');
        return;
    }

    const params: FlashParams = {
        token,
        title: 'email setting',
        form_action_path: '/set-email',
        label: 'メールアドレス',
        input_name: 'email',
    };

    defineFlashMessages(req, res, params);

    await saveSession(req);
    res.render('auth/verify-form');
});

router.post('/set-email', requireNonLogin, authenticateJWT, async (req: Request, res: Response) => {
    if (!req.payload) {
        res.status(400).send('Invalid Access');
        throw new Error('Invalid Access');
    }

    const { email, token } = req.body;
    try {
        emailSchema.parse(email);
    } catch (e) {
        if (token) {
            redefineFlashMessages(req, {
                errorMessage: [ 'Invalid email pattern!' ],
            });

            await saveSession(req);

            return res.redirect(`${req.originalUrl}?token=${token}`);
        } else {
            res.status(400).send('Invalid Access');
            throw new Error('Invalid Access');
        }
    }

    const oldtoken: string = await getToken(req.payload);

    const newPayload: JwtPayload = { id: req.payload.id, name: req.payload.name, email };
    const newtoken = await generateUserToken(req.payload, false, newPayload);

    const redirectUrl: string = `${basepath.rooturl}auth/set-email?token=${oldtoken}&token2=${newtoken}`;

    const send = await sendVertificationEmail(email, redirectUrl);
    if (send) {
        res.render('index', { successMessage: [ 'Sent email successfully!' ] });
    } else {
        res.render('index', { errorMessage: [ 'Failed to send email.' ] });
    }
});

router.get('/verify-otp', requireNonLogin, authenticateJWT, async (req: Request, res: Response) => {
    if (!req.payload) {
        res.status(400).send('Invalid Access');
        return;
    }

    const token = req.query.token;

    const params: FlashParams = {
        token,
        title: 'otp confirm',
        form_action_path: '/verify-otp',
        label: 'ワンタイムパスワード',
        input_name: 'otp',
    };

    defineFlashMessages(req, res, params);

    await saveSession(req);

    res.render('auth/verify-form');
});

router.post('/verify-otp', requireNonLogin, authenticateJWT, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.payload) {
        res.status(400).send('Invalid Access');
        return;
    }

    const { otp } = req.body;

    try {
        const isValid = await knex('users').where({ id: req.payload.id, name: req.payload.name, otp }).first();
        if (!isValid) {
            res.status(400).send('Invalid Access');
            return;
        }

        await knex('users').where({ id: req.payload.id, name: req.payload.name, otp }).update({ otp: null });

        const user = await knex('users').where({ id: req.payload.id, name: req.payload.name }).first();

        loginRedirect(req, res, next, user, { 'successMessage': [ 'OTP setting done successfully' ] });
    } catch (error) {
        res.status(500).send('Invalid Access');
    }
});

export default router;
