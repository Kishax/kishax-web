import { Knex } from 'knex';
import config from './config';

export function getConfig(database: string = config.server.modules.mysql.database): Knex.Config {
  const user = config.server.modules.mysql.user;
  const password = config.server.modules.mysql.password;

  if (!database || !user || !password) {
    throw new Error(`Missing database configuration.`);
  }

  return {
    client: "mysql",
    connection: {
      database,
      user,
      password,
    },
    pool: { min: 2, max: 10 },
  };
}
