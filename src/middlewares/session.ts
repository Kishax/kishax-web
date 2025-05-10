import session from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize';
import { Sequelize } from 'sequelize';
import config from '../config';

const isProduction: boolean = process.env.NODE_ENV === 'production';

const sessionSecret = config.server.modules.express_session.secret;
const SequelizeStore = connectSessionSequelize(session.Store);

const sequelize = new Sequelize(config.server.modules.mysql.database, config.server.modules.mysql.user, config.server.modules.mysql.password, {
  host: config.server.modules.mysql.host,
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
