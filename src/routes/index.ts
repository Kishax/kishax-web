import express, { Request, Response, NextFunction } from 'express';
import knex from '../config/knex';

const router: express.Router = express.Router();

router.get('/', async (req: Request, res: Response, _: NextFunction) => {
    if (req.isAuthenticated()) {
        const user = req.user as any;
        const userId: number = user.id;
        const newUser = await knex('users').where({ id: userId }).first();

        res.render('index', {
            isAuth: true,
        });
    } else {
        res.render('index', {
            isAuth: false,
        });
    }
});

export default router;

