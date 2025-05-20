import { getConfig } from '../knexfile';
import knex from 'knex';

const wknex = knex(getConfig());

export const mknex = knex(getConfig('mc'));

export default wknex;
