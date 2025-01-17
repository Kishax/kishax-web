import { Request, Response, NextFunction } from 'express';
import dns from 'dns';
import Knex from 'knex';
import knex from '../db/knex';

export async function getLastEntriesEachDay() {
    const subquery: Knex.QueryBuilder = knex('counter3')
        .select(knex.raw('DATE(dtime) as date'), knex.raw('MAX(dtime) as max_dtime'))
        .groupBy('date')
        .as('sub');

    const rows = await knex('counter3')
        .join(subquery as ('sub'), function() {
            this.on('counter3.dtime', '=', 'sub.max_dtime');
        })
        .select('counter3.*');

    return rows;
}

function disnum(num: number): number[] {
    const b: number[] = [];

    while (num > 0) {
        const digit = num % 10;
        b.unshift(digit);
        num = Math.floor(num / 10);
    }

    return b;
}

function getHost(ip: string): string {
    dns.reverse(ip, (err, hostnames: string[]) => {
        if (err) {
            throw err;
        } else {
            console.log("hostnames: ", hostnames);
            return hostnames[0];
        }
    });

    return ip;
}

const counter = async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
        next();
        return;
    }

    // グラフの計算をここでやっといて、その日の新規が来たとき、
    // 計算結果に足せばいい
    // ここは別に/counterにアクセスがあったときに計算してもいいかも
    //const rows = await knex('counter3').select('*');

    try {
        const [{ count }] = await knex('counter3').count<{ count: number }[]>('* as count');
        var todaycount: number = count;

        const ip: string = String(req.headers['x-forwarded-for']);

        if (typeof req.headers['x-forwarded-for'] !== "string") {
            throw new Error("Invalid type of IP");
        }

        var iphost: string = getHost(ip);

        const excephost = [
            "aterm.me",
        ];

        const excephostkeyRows = await knex('hostnotcount').select('host');
        const excephostkeys = excephostkeyRows.map(row => row.host);

        let excephostcheck = true;
        for (const host of excephostkeys) {
            if (new RegExp(host).test(iphost)) {
                excephostcheck = false;
                break;
            }
        }

        if (/^(([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/.test(iphost)) {
            excephostcheck = false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const rows = await knex('counter3')
            .where('dtime', '>=', today.toISOString()).whereNot('ip', '').select();
        const ips = rows.map(row => row.ip);

        const isAdminHost: boolean = excephost.includes(iphost);

        if (ips.length === 0) {
            if (excephostcheck) {
                if (isAdminHost) {
                    await knex('counter3').insert({
                        loadcount: 0,
                        ipcount: 0,
                        adloadcount: 1,
                        adipcount: 1,
                        url: req.path,
                        ip: iphost,
                    });
                } else {
                    todaycount = count + 1;
                    await knex('counter3').insert({
                        loadcount: 1,
                        ipcount: 1,
                        adloadcount: 0,
                        adipcount: 0,
                        url: req.path,
                        ip: iphost,
                    });
                }
            }
        } else {
            if (isAdminHost) {
                await knex('counter3').insert({
                    loadcount: 0,
                    ipcount: 0,
                    adloadcount: 1,
                    adipcount: 0,
                    url: req.path,
                    ip: iphost,
                });
            } else {
                await knex('counter3').insert({
                    loadcount: 1,
                    ipcount: 0,
                    adloadcount: 0,
                    adipcount: 0,
                    url: req.path,
                    ip: iphost,
                });
            }
        }

        const todaycountArray: number[] = disnum(todaycount);
        res.locals.count_array = todaycountArray;
    } catch (error) {
        console.error(error);
        res.status(500).send('Server failed to calc your access count');
    }
};

export default counter;
