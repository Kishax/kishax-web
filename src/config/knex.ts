const environment: string = 'development';

import knexConfig from  '../knexfile';
import knex, { Knex } from 'knex';

const config: Knex.Config = knexConfig[environment];
const db = knex(config);

export default db;
