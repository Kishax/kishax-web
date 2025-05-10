import { Knex } from 'knex';
import config from './config';

export function getDbConfig(env: string): Knex.Config {
  const database = config.server.modules.mysql.database;
  const user = config.server.modules.mysql.user;
  const password = config.server.modules.mysql.password;

  if (!database || !user || !password) {
    throw new Error(`Missing database configuration for ${env}`);
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
