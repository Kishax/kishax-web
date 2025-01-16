import knex from '../db/knex';

const TABLE_NAME: string = "users";

async function findById(userId: number) {
    const user = await where({ id: userId });
    if (user == null) {
        throw new Error('User not found');
    }
    return { ...user };
}

async function where(condition: Record<string, any>) {
    return await knex(TABLE_NAME)
        .where(condition)
        //.debug(true) // for debug option
        .then((results) => {
            if (results.length == 0) {
                return null;
            }
            return results[0];
        });
}

export default {
    findById,
};
