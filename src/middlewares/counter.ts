import { Request, Response, NextFunction } from 'express';
import dns from 'dns';
import Knex from 'knex';
import knex from '../config/knex';

export async function getLastEntriesEachDay() {
  const subquery: Knex.QueryBuilder = knex('counter')
    .select(knex.raw('DATE(time) as date'), knex.raw('MAX(time) as max_time'))
    .groupBy('date')
    .as('sub');

  const rows = await knex('counter')
    .join(subquery as ('sub'), function() {
      this.on('counter.time', '=', 'sub.max_time');
    })
    .select('counter.*');

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
        reject(ip);
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
    const [{ count }] = await knex('counter').count<{ count: number }[]>('* as count');
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
      //console.error('Failed to resolve hostname:', error);
      iphost = ip;
    }

    const excephost = ["aterm.me", "ip6-loopback"];

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

    const rows: any = await knex('counter')
      .where('time', '>=', today)
      .whereNot('ip', '')
      .select('*');

    const ips = rows.map((row: any) => row.ip);

    const last = await knex('counter').orderBy('id', 'desc').first();

    const isAdminHost: boolean = excephost.includes(iphost);

    const isTodayFirst = (timestamp: any) => {
      const date = new Date(timestamp);

      return date.getFullYear() !== today.getFullYear() ||
        date.getMonth() !== today.getMonth() ||
        date.getDate() !== today.getDate();
    };

    const istodayfirst: boolean = isTodayFirst(last.time);
    if (istodayfirst) {
      console.log('本日初めての訪問者です！');
    }

    if (ips.length === 0) {
      if (excephostcheck) {
        if (isAdminHost) {
          await knex('counter').insert({
            loadcount: !istodayfirst ? last.loadcount : 0,
            ipcount: !istodayfirst ? last.ipcount : 0,
            adloadcount: !istodayfirst ? last.adloadcount + 1 : 1,
            adipcount: !istodayfirst ? last.adipcount + 1 : 1,
            url: req.path,
            ip: iphost,
          });
        } else {
          todaycount = count + 1;
          await knex('counter').insert({
            loadcount: !istodayfirst ? last.loadcount + 1 : 1,
            ipcount: !istodayfirst ? last.ipcount + 1 : 1,
            adloadcount: !istodayfirst ? last.adloadcount : 0,
            adipcount: !istodayfirst ? last.adipcount : 0,
            url: req.path,
            ip: iphost,
          });
        }
      }
    } else if (isAdminHost) {
      await knex('counter').insert({
        loadcount: !istodayfirst ? last.loadcount : 0,
        ipcount: !istodayfirst ? last.ipcount : 0,
        adloadcount: !istodayfirst ? last.adloadcount + 1 : 1,
        adipcount: !istodayfirst ? last.adipcount : 0,
        url: req.path,
        ip: iphost,
      });
    } else {
      await knex('counter').insert({
        loadcount: !istodayfirst ? last.loadcount + 1 : 1,
        ipcount: !istodayfirst ? last.ipcount : 0,
        adloadcount: !istodayfirst ? last.adloadcount : 0,
        adipcount: !istodayfirst ? last.adipcount : 0,
        url: req.path,
        ip: iphost,
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
