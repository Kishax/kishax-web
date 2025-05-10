import { Request, Response, NextFunction } from 'express';
import config from '../config';

const localvals = async (req: Request, res: Response, next: NextFunction) => {
  res.locals.config = config

  res.locals.isAuth = req.isAuthenticated();
  res.locals.refurl = req.headers.referer || req.get('referer');
  res.locals.current_path = req.path;
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';

  next();
};

export default localvals;
