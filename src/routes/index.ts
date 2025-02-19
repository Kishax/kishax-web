import express, { Request, Response, NextFunction } from 'express';
import knex from '../config/knex';

const router: express.Router = express.Router();

router.get('/', async (req: Request, res: Response, _: NextFunction) => {
    res.render('index', {
        isAuth: req.isAuthenticated(),
        successMessage: req.flash('successMessage'),
        errorMessage: req.flash('errorMessage'),
    });
});

export default router;

