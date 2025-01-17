import express, { Request, Response, NextFunction } from 'express';
import { getLastEntriesEachDay } from '../middlewares/counter';
import { categorizeData } from '../middlewares/categorize';

const router: express.Router = express.Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    await getLastEntriesEachDay().then(rows => {
        const type: string = req.query.type as string;
        const categorizedData = categorizeData(rows, type);
        res.json(categorizedData);
    }).catch(err => console.error(err));
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    await getLastEntriesEachDay().then(rows => {
        const type: string = req.body.type as string;
        const categorizedData = categorizeData(rows, type);
        res.json(categorizedData);
    }).catch(err => next(err));
});

export default router;
