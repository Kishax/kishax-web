import express, { Request, Response, NextFunction } from 'express';
import { requireNonLogin } from '../middlewares/checker';
import { commonAuth } from '../controllers/authController';

const router: express.Router = express.Router();

router.get('/', (req: Request, res: Response, _: NextFunction) => {
    if (req.query.n) {
        const n: number = Number(req.query.n);
        if (!isNaN(n)) {
            req.session.n = n;
        }
    }
    res.render('signin', { title: 'Sign in' });
});

router.post('/', requireNonLogin, commonAuth('local'));

export default router;