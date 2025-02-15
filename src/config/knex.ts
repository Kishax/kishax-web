import { getDbConfig } from '../knexfile';
import knex, { Knex } from 'knex';

const webConfig: Knex.Config = getDbConfig('web');
const wknex = knex(webConfig);

const mcConfig: Knex.Config = getDbConfig('mc');
export const mknex = knex(mcConfig);

export default wknex;
