import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import flash from 'connect-flash';
import favicon from 'serve-favicon';
import { indexRouter } from './routes/index';
import session from './middlewares/session';
import passport from './middlewares/passport';
import basepath from './utils/basepath';
import localvals from './middlewares/localvals';
import preErrorHandler from './middlewares/pre-error-handler';
import csrfProtection from './middlewares/csurf';
import mycors from './middlewares/cors';
import errorHandler from './middlewares/error-handler';
import counter from './middlewares/counter';
import header from './middlewares/header';

const app = express();

console.log(`> current mode is ${process.env.NODE_ENV}`);
console.log('> current Base URL is ' + basepath.rooturl);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(header);

app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(session);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use(csrfProtection);

app.use(localvals);

app.use(counter);

app.use(preErrorHandler);

app.use('/', indexRouter);

app.use(mycors);

app.use((_: Request, __: Response, next: NextFunction) => next(createError(404)));

app.use(errorHandler);

export default app;
