import express, { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import config from '../config';
import knex from '../config/knex';
import authenticateJWT, { generateUserToken, getToken } from '../middlewares/jwt';
import { sendVertificationEmail, sendVertificationEmailForResetPassword } from '../controllers/emailController';
import { requireNonLogin } from '../middlewares/checker';
import { loginRedirect, setupAuthRoutes } from '../controllers/authController';
import { defineRedirectDest } from '../controllers/redirectController';

const router: express.Router = express.Router();

setupAuthRoutes(router, ['google', 'x', 'discord']);

const emailSchema = z.string().email();

router.get('/reset-password', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.render('auth/verify-form', {
      title: 'password setting',
      auth_path: '/reset-password',
      label: 'メールアドレス',
      input_name: 'email',
      errorMessage: req.flash('errorMessage'),
    });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    email.parse(email);

    const check = await knex('users').select('id').where('email', email);

    if (!!check) {
      const payload: Jsonwebtoken.EmailJwtPayload = { email };
      jwt.sign(payload, config.server.modules.jwt.secret, { expiresIn: '1h' });
      const redirectUrl: string = '${basepath.rooturl}auth/set-password?token=${oldtoken}';
      await sendVertificationEmailForResetPassword(email, redirectUrl);
    }
  } catch (e) {
    req.flash('errorMessage', ['Invalid email pattern!']);
    res.redirect(`${config.server.root}/auth/reset-password`);
  }
});

router.get('/set-email', requireNonLogin, authenticateJWT, async (req: Request, res: Response) => {
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

        const data = { 'successMessage': ['Email setting done successfully'] };
        defineRedirectDest(req, data);

        loginRedirect(req, res, user, data);
      } catch (err) {
        res.status(500).send('Error updating email.');
      }
    } else {
      throw new Error('Invalid Access.');
    }
    return;
  }

  const { token } = req.query;
  if (!token) {
    res.status(400).send('Invalid Access');
    return;
  }

  res.render('auth/verify-form', {
    token,
    title: 'email setting',
    form_action_path: '/set-email',
    label: 'メールアドレス',
    input_name: 'email',
    errorMessage: req.flash('errorMessage'),
  });
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
      req.flash('errorMessage', ['Invalid email pattern!']);
      res.redirect(`${config.server.root}/auth/set-email?token=${token}`);
      return;
    } else {
      res.status(400).send('Invalid Access');
      throw new Error('Invalid Access');
    }
  }

  const oldtoken: string = await getToken(req.payload);

  const newPayload: JwtPayload = { id: req.payload.id, name: req.payload.name, email };
  const newtoken = await generateUserToken(req.payload, false, newPayload);

  const redirectUrl: string = `${config.server.root}auth/set-email?token=${oldtoken}&token2=${newtoken}`;

  const send = await sendVertificationEmail(email, redirectUrl);
  if (send) {
    req.flash('successMessage', ['Sent email successfully!']);
  } else {
    req.flash('errorMessage', ['Failed to send email.']);
  }

  res.redirect(`${config.server.root}/`);
});

router.get('/verify-otp', requireNonLogin, authenticateJWT, async (req: Request, res: Response) => {
  if (!req.payload) {
    res.status(400).send('Invalid Access');
    return;
  }

  const { token } = req.query;

  res.render('auth/verify-form', {
    token,
    title: 'otp confirm',
    form_action_path: '/verify-otp',
    label: 'ワンタイムパスワード',
    input_name: 'otp',
    errorMessage: req.flash('errorMessage'),
  });
});

router.post('/verify-otp', requireNonLogin, authenticateJWT, async (req: Request, res: Response) => {
  if (!req.payload) {
    res.status(400).send('Invalid Access');
    return;
  }

  const { otp, token } = req.body;

  if (!otp || !token) {
    req.flash('errorMessage', ['最初からやり直してください。']);
    return res.redirect(`${config.server.root}/signin`);
  }

  try {
    const isValid = await knex('users').where({ id: req.payload.id, name: req.payload.name, otp }).first();
    if (!isValid) {
      req.flash('errorMessage', ['ワンタイムパスワードが異なります。']);
      return res.redirect(`${config.server.root}/auth/verify-otp?token=${token}`);
    }

    await knex('users').where({ id: req.payload.id, name: req.payload.name, otp }).update({ otp: null });

    const user = await knex('users').where({ id: req.payload.id, name: req.payload.name }).first();

    const data = { 'successMessage': ['OTP setting done successfully'] };
    defineRedirectDest(req, data);

    loginRedirect(req, res, user, data);
  } catch (error) {
    res.status(500).send('Invalid Access');
    return;
  }
});

export default router;
