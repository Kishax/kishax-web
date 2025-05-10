import { format } from 'date-fns';

export function categorizeData(rows: any[], type: string) {
  const categorizedData: any = {};

  switch (type) {
    case 'year':
      rows.forEach(row => {
        const year = format(new Date(row.time), 'yyyy');
        if (!categorizedData[year]) {
          categorizedData[year] = [];
        }
        categorizedData[year].push(row);
      });
      break;
    case 'month':
      rows.forEach(row => {
        const month = format(new Date(row.time), 'yyyy-MM');
        if (!categorizedData[month]) {
          categorizedData[month] = [];
        }
        categorizedData[month].push(row);
      })
      break;
    case 'last7days':
      const last7Days = rows.slice(-7);

      last7Days.forEach(row => {
        const date = new Date(row.time);
        const last7days = format(date, 'yyyy-MM-dd');
        if (!categorizedData[last7days]) {
          categorizedData[last7days] = [];
        }
        categorizedData[last7days].push(row);
      })
      break;
  }

  return categorizedData;
}
