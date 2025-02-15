import knex from '../config/knex';

const TABLE_NAME: string = "users";

export async function findById(userId: number) {
    const user = await where({ id: userId });
    if (user == null) {
        throw new Error('This user is maybe deleted');
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
