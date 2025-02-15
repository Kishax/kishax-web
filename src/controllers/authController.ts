import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import '../config';
import { FMCWebType } from '../@types/fmc';
import basepath from '../utils/basepath';
import { requireNonLogin } from '../middlewares/checker';
import { defineFlashMessages, saveSession } from '../controllers/flashController';
import { defineRedirectDest } from './redirectController';

export function setupAuthRoutes(router: express.Router, authtypes: string[]) {
    authtypes.forEach(authtype => {
        router.get(`/${authtype}`, requireNonLogin, passport.authenticate(authtype));
        router.get(`/${authtype}/callback`, requireNonLogin, commonAuth(authtype));
    });
}

export const commonAuth = (authtype: string) => (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(authtype, async (err, user, info) => {
        if (err) {
            return next(err);
        }

        const authlocal: boolean = authtype === 'local';

        if (!user) {
            defineFlashMessages(req, res, {
                errorMessage: info.errorMessage || undefined,
                successMessage: info.successMessage || undefined,
            });

            await saveSession(req);

            if (authlocal && info && info.redirectUrl) {
                return res.redirect(info.redirectUrl);
            }

            return res.render('signin');
        }

        const data = { successMessage: [ (!authlocal ? authtype : 'default') + ' login successfully!' ] };
        defineRedirectDest(req, data);

        loginRedirect(req, res, next, user, data);
    })(req, res, next);
}

export function loginRedirect(req: Request, res: Response, next: NextFunction, user: any, data: any, timeout: number = 3000) {
    if (!data.redirect_url || typeof data.redirect_url != 'string') {
        throw new Error("Must be included redirect_url: string in data");
    }

    data['timeout'] = timeout;

    req.login(user, (err) => {
        if (err) {
            return next(err);
        }

        return res.render('redirect', data);
    });
}
