import { Request, Response, NextFunction } from 'express';

export const requireNonLogin = ((req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        res.render('signup', { errorMessage: [ 'Please log out first.' ] });
        return;
    }
    next();
});
