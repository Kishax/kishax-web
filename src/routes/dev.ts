import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    res.render('counter');
});

export default router;
