import session from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize';
import { Sequelize } from 'sequelize';
import '../config';

const isProduction: boolean = process.env.NODE_ENV === 'production';

const sessionSecret = process.env.COOKIE_SECRET || 'defaultSecret';
const SequelizeStore = connectSessionSequelize(session.Store);

const sequelize = new Sequelize(process.env.MYSQL_DATABASE_WEB || '', process.env.MYSQL_USER_WEB || '', process.env.MYSQL_PASSWORD_WEB || undefined, {
    host: process.env.MYSQL_HOST_WEB || 'localhost',
    dialect: 'mysql',
    logging: false,
});

export default session({
    secret: sessionSecret,
    store: new SequelizeStore({
        db: sequelize,
    }),
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
		sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
		httpOnly: true,
    },
});
