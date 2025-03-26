import express, { Request, Response } from 'express';
import passport from 'passport';
import '../config';
import { requireNonLogin } from '../middlewares/checker';
import { defineRedirectDest } from './redirectController';
import basepath from '../utils/basepath';

export function setupAuthRoutes(router: express.Router, authtypes: string[]) {
  authtypes.forEach(authtype => {
    router.get(`/${authtype}`, requireNonLogin, passport.authenticate(authtype));
    router.get(`/${authtype}/callback`, requireNonLogin, commonAuth(authtype));
  });
}

export const commonAuth = (authtype: string) => (req: Request, res: Response) => {
  passport.authenticate(authtype, async (err, user, info) => {
    if (err) {
      console.error('An error occurred in commonAuth:', err);
      return res.status(400).send('Invalid Access');
    }

    const authlocal: boolean = authtype === 'local';

    if (!user) {
      const { errorMessage, successMessage } = info;

      if (errorMessage) {
        req.flash('errorMessage', errorMessage);
      }

      if (successMessage) {
        req.flash('successMessage', successMessage);
      }

      if (authlocal && info && info.redirectUrl) {
        return res.redirect(info.redirectUrl);
      }

      return res.redirect(`${basepath.rootpath}/signin`);
    }

    const data = { successMessage: [(!authlocal ? authtype : 'default') + ' login successfully!'] };
    defineRedirectDest(req, data);

    loginRedirect(req, res, user, data);
  })(req, res);
}

export function loginRedirect(req: Request, res: Response, user: any, data: any, timeout: number = 3000) {
  if (!data.redirect_url || typeof data.redirect_url != 'string') {
    throw new Error("Must be included redirect_url: string in data");
  }

  data['timeout'] = timeout;

  const sessionWithType = req.session && ('type' in req.session || 'n' in req.session)
    ? { ...req.session }
    : null;

  req.login(user, (err) => {
    if (err) {
      console.error('An error occurred while user login', err);
      return res.status(400).send('Invalid Access');
    }

    if (sessionWithType) {
      Object.assign(req.session, sessionWithType);
    }

    res.render('redirect', data);
  });
}
