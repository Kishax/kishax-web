import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: any, _: Request, res: Response, next: NextFunction) => {
  if (err) {
    if (err.code === 'EBADCSRFTOKEN') {
      res.status(403).send('CSRF token validation failed');
    } else {
      next(err);
    }
  }
};

export default errorHandler;
