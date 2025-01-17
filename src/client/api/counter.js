// @ts-check
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

/**
 * @typedef {Object} MysqlRow
 * @property {number} id
 * @property {number} loadcount
 * @property {number} ipcount
 * @property {number} adloadcount
 * @property {number} adipcount
 * @property {string} url
 * @property {number} ip
 * @property {string} time
 * @property {Date} dtime
 */

/**
 * @typedef {Object} TotalCounts
 * @property {number} loadcount
 * @property {number} ipcount
 * @property {number} adloadcount
 * @property {number} adipcount
 */

/**
 * @param {string} type - year/month/day
 * @returns {Promise<any>}
 */
async function fetchData(type) {
    const response = await fetch(`./api/counter?type=${type}`);
    const data = await response.json();
    return data;
}

const datanames = {
    loadcount: { name: 'ロード数', color: 'rgba(255, 0, 0, 1)', type: 'nonadmin' },
    ipcount: { name: '訪問者数', color: 'rgba(0, 0, 255, 1)', type: 'common' },
    adipcount: { name: '訪問者数(管理者含む)', color: 'rgba(0, 255, 0, 1)', type: 'admin' },
    adloadcount: { name: 'ロード数(管理者含む)', color: 'rgba(255, 255, 0, 1)', type: 'admin' },
};

/** @type {Chart | null} */
let chart;

/** @type {TotalCounts} */
const totalCounts = {
    loadcount: 0,
    ipcount: 0,
    adloadcount: 0,
    adipcount: 0
};

/**
 * @param {any} data
 */
function createChart(data) {
    const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('myChart'));
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('2D context not found');
        return;
    }
    const labels = Object.keys(data);

    const datasets = Object.keys(datanames).map((key, _) => {
        const values = labels.map(label => {
            return data[label].map(/** @type {MysqlRow} */ (/** @type {MysqlRow} */ item) => {
                let count = item[key];
                totalCounts[key] += count;
                return count;
            });
        }).flat();

        return {
            label: datanames[key]['name'],
            data: values,
            borderColor: datanames[key]['color'],
            borderWidth: 1,
            hidden: [ 'adloadcount', 'adipcount' ].includes(key)
        };
    });

    console.log('totalCounts:', totalCounts);

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * @param  {...string} keys
 */
function toggleDataset(...keys) {
    if (!chart) {
        console.error('Chart is not created');
        return;
    }

    const currentChart = /** @type {Chart} */ (chart);
    keys.forEach(key => {
        if (key in datanames) {
            const dataset = currentChart.data.datasets.find(ds => ds.label === datanames[key]['name']);
            if (dataset) {
                dataset.hidden = !dataset.hidden;
            } else {
                console.error(`Dataset not found: ${key}`);
            }
        }
    });
    chart.update();
}

document.getElementById('toggleAdcount')?.addEventListener('click', () => toggleDataset('adloadcount', 'adipcount'));

const urlParams = new URLSearchParams(window.location.search);
const type = urlParams.get('type') || 'month';

fetchData(type).then(data => {
    createChart(data);
}).catch(error => console.error('Error fetching data:', error));