import express, { Request, Response } from 'express';
import indexRouter from '../routes/index';
import signupRouter from '../routes/signup';
import signinRouter from '../routes/signin';
import logoutRouter from '../routes/logout';
import authRouter from '../routes/auth';
import apiRouter from '../routes/api';
import appRouter from '../routes/app';
import mcRouter from '../routes/mc';

export function setSimpleRouters(router: express.Router, routerNames: string[]) {
  routerNames.forEach((routerName: string) => {
    router.get(`/${routerName}`, async (_: Request, res: Response) => {
      res.render(routerName);
    });
  });
}

const router: express.Router = express.Router();

router.use('/', indexRouter);
router.use('/signup', signupRouter);
router.use('/signin', signinRouter);
router.use('/logout', logoutRouter);
router.use('/auth', authRouter);
router.use('/api', apiRouter);
router.use('/app', appRouter);
router.use('/mc', mcRouter);

export default router;

