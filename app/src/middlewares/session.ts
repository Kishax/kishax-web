import session from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize';
import { Sequelize } from 'sequelize';
import '../config';

const sessionSecret = process.env.COOKIE_SECRET || 'defaultSecret';
const SequelizeStore = connectSessionSequelize(session.Store);

const sequelize = new Sequelize(process.env.MYSQL_DATABASE || '', process.env.MYSQL_USER || '', process.env.MYSQL_PASSWORD || undefined, {
    host: process.env.MYSQL_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
});

export default session({
    secret: sessionSecret,
    store: new SequelizeStore({
        db: sequelize,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        //secure: process.env.NODE_ENV === 'production',
    },
});
