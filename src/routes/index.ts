import express, { Request, Response, NextFunction } from 'express';
import knex from '../db/knex';
import basepath from '../utils/basepath';
import signupRouter from './signup';
import signinRouter from './signin';
import logoutRouter from './logout';
import authRouter from './auth';
import devRouter from './dev';
import apiRouter from './api';
import counterRouter from './counter';

const router: express.Router = express.Router();

router.get('/', async (req: Request, res: Response, _: NextFunction) => {
    if (req.session.views) {
        req.session.views++;
        console.log("someone views count: ", req.session.views);
    } else {
        req.session.views = 1;
        console.log("New user visited!");
    }

    if (req.isAuthenticated()) {
        const user = req.user as any;
        const userId: number = user.id;
        knex('tasks')
            .select("*")
            .where({ user_id: userId })
            .then((results) => {
                res.render('index', {
                    todos: results,
                    isAuth: true,
                });
            })
            .catch((err) => {
                console.error(err);
                res.render('index', {
                    isAuth: true,
                    errorMessage: [err.sqlMessage],
                });
            });
    } else {
        res.render('index', {
            isAuth: false,
        });
    }
});

router.post('/', async (req: Request, res: Response, _: NextFunction) => {
    if (req.isAuthenticated()) {
        //const userId: number = (req as Express.AuthenticatedRequest).user.id;
        const userId: number = (req.user as any).id;
        const todo: string = req.body.add;

        knex("tasks")
            .insert({ user_id: userId, content: todo })
            .then(() => {
                res.redirect(`${basepath.rootpath}/`);
            })
            .catch((err) => {
                console.error(err);
                res.render('index', {
                    isAuth: true,
                    errorMessage: [err.sqlMessage],
                });
            })
    }
});

router.use('/signup', signupRouter);
router.use('/signin', signinRouter);
router.use('/logout', logoutRouter);
router.use('/auth', authRouter);
router.use('/dev', devRouter);
router.use('/api', apiRouter);
router.use('/counter', counterRouter);

export { router as indexRouter };
