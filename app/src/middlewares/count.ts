import express ,{ Request, Response, NextFunction } from 'express';
import path from 'path';
import dns from 'dns';
import knex from '../db/knex';

function disnum(num: number): number[] {
    const b: number[] = [];

    while (num > 0) {
        const digit = num % 10;
        b.unshift(digit);
        num = Math.floor(num / 10);
    }

    return b;
}

const counter = async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
        next();
        return;
    }

    try {
        const ip: string = String(req.headers['x-forwarded-for']);

        dns.reverse(ip, (err, hostnames: string[]) => {
            if (err) {
                console.error("DNS reverse lookup error: ", err);
            } else {
                console.log("hostnames: ", hostnames);
            }
        });

        if (typeof req.ip !== "string") {
            throw new Error("Invalid type of IP");
        }
        const iphost: string = req.ip;

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

        let first = false;
        if (ips.length === 0) {
            first = true;

            const [{ count }] = await knex('counter3').count<{ count: number }[]>('* as count');

            const d: number[] = disnum(count + 1);

            res.locals.count_array = d;

            if (excephostcheck) {
                if (excephost.includes(iphost)) {
                    await knex('counter3').insert({
                        loadcount: 0,
                        ipcount: 0,
                        adloadcount: 1,
                        adipcount: 1,
                        url: req.path,
                        ip: iphost,
                    });
                } else {
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
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server failed to calc your access count');
    }
};

export default counter;
