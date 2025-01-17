import { format, startOfDay, subDays } from 'date-fns';

export function categorizeData(rows: any[], type: string) {
    const categorizedData: any = {};

    switch (type) {
        case 'year':
            rows.forEach(row => {
                const year = format(new Date(row.dtime), 'yyyy');
                if (!categorizedData[year]) {
                    categorizedData[year] = [];
                }
                categorizedData[year].push(row);
            });
            break;
        case 'month':
            rows.forEach(row => {
                const month = format(new Date(row.dtime), 'yyyy-MM');
                if (!categorizedData[month]) {
                    categorizedData[month] = [];
                }
                categorizedData[month].push(row);
            })
            break;
        case 'week':
            const today = startOfDay(new Date());
            const last7Days = subDays(today, 7);

            rows.forEach(row => {
                const date = new Date(row.dtime);
                if (date >= last7Days && date <= today) {
                    const day = format(date, 'yyyy-MM-dd');
                    if (!categorizedData[day]) {
                        categorizedData[day] = [];
                    }
                    categorizedData[day].push(row);
                }
            })
            break;
    }

    return categorizedData;
}
