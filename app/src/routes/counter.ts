import express, { Request, Response, NextFunction } from 'express';
import { getLastEntriesEachDay } from '../middlewares/counter';

const router: express.Router = express.Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    getLastEntriesEachDay().then(rows => {
        console.log(rows);
    }).catch(err => next(err));
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
});

export default router;
