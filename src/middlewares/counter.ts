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

async function getHost(ip: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("DNS lookup timed out"));
        }, 5000);

        dns.reverse(ip, (err, hostnames: string[]) => {
            clearTimeout(timeout);
            if (err) {
                reject(err);
            } else {
                console.log("throughs hostnames: ", hostnames);
                resolve(hostnames[0]);
            }
        });
    });
}

const counter = async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
        next();
        return;
    }

    try {
        const [{ count }] = await knex('counter3').count<{ count: number }[]>('* as count');
        var todaycount: number = count;

        var ip: string;

        if (process.env.NODE_ENV === "development") {
            if (!req.ip) {
                throw new Error("Invalid type of req.ip");
            }
            ip = req.ip ?? '0.0.0.0';
        } else {
            if (typeof req.headers['x-forwarded-for'] !== "string") {
                throw new Error("Invalid type of IP");
            }
            ip = req.headers['x-forwarded-for'] as string;
        }

        let iphost: string;
        try {
            iphost = await getHost(ip);
        } catch (error) {
            console.error('Failed to resolve hostname:', error);
            iphost = ip;
        }

        const excephost = [ "aterm.me", "ip6-loopback" ];

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

        const rows: any = await knex('counter3')
            .where('dtime', '>=', today)
            .whereNot('ip', '')
            .select('*');

        const ips = rows.map(row => row.ip);


        const last = await knex('counter3').orderBy('id', 'desc').first();

        const isAdminHost: boolean = excephost.includes(iphost);
        const formattedDate = `${today.getFullYear() % 100}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

        const isTodayFirst = (timestamp) => {
            const date = new Date(timestamp);

            return date.getFullYear() !== today.getFullYear() ||
                date.getMonth() !== today.getMonth() ||
                date.getDate() !== today.getDate();
        };

        const istodayfirst: boolean = isTodayFirst(last.dtime);
        if (istodayfirst) {
            console.log('本日初めての訪問者です！');
        }

        if (ips.length === 0) {
            if (excephostcheck) {
                if (isAdminHost) {
                    await knex('counter3').insert({
                        loadcount: !istodayfirst ? last.loadcount : 0,
                        ipcount: !istodayfirst ? last.ipcount : 0,
                        adloadcount: !istodayfirst ? last.adloadcount + 1 : 1,
                        adipcount: !istodayfirst ? last.adipcount + 1 : 1,
                        url: req.path,
                        ip: iphost,
                        time: formattedDate,
                    });
                } else {
                    todaycount = count + 1;
                    await knex('counter3').insert({
                        loadcount: !istodayfirst ? last.loadcount + 1 : 1,
                        ipcount: !istodayfirst ? last.ipcount + 1 : 1,
                        adloadcount: !istodayfirst ? last.adloadcount : 0,
                        adipcount: !istodayfirst ? last.adipcount : 0,
                        url: req.path,
                        ip: iphost,
                        time: formattedDate,
                    });
                }
            }
        } else if (isAdminHost) {
            await knex('counter3').insert({
                loadcount: !istodayfirst ? last.loadcount : 0,
                ipcount: !istodayfirst ? last.ipcount : 0,
                adloadcount: !istodayfirst ? last.adloadcount + 1 : 1,
                adipcount: !istodayfirst ? last.adipcount : 0,
                url: req.path,
                ip: iphost,
                time: formattedDate,
            });
        } else {
            await knex('counter3').insert({
                loadcount: !istodayfirst ? last.loadcount + 1 : 1,
                ipcount: !istodayfirst ? last.ipcount : 0,
                adloadcount: !istodayfirst ? last.adloadcount : 0,
                adipcount: !istodayfirst ? last.adipcount : 0,
                url: req.path,
                ip: iphost,
                time: formattedDate,
            });
        }

        res.locals.today_count = todaycount;
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server failed to calc your access count');
    }
};

export default counter;
