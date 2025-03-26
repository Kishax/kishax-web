import createError from 'http-errors';
import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: createError.HttpError, req: Request, res: Response, _: NextFunction) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('./include/error');
};

export default errorHandler;
