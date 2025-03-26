import { Knex } from 'knex';
import './config';

export function getDbConfig(env: string): Knex.Config {
  const database = process.env[`MYSQL_DATABASE_${env.toUpperCase()}`];
  const user = process.env[`MYSQL_USER_${env.toUpperCase()}`];
  const password = process.env[`MYSQL_PASSWORD_${env.toUpperCase()}`];

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
