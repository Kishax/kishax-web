// @ts-check
import { Chart, registerables } from 'chart.js';
// import { disnum } from '../../middlewares/counter';

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
 * @enum {string}
 */
const DataType = {
    NON_ADMIN: 'nonadmin',
    COMMON: 'common',
    ADMIN: 'admin',
};

/**
 * @typedef {Object} DataName
 * @property {string} name
 * @property {string} color
 * @property {DataType} type
 * @property {string} sumname
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

/** @type {{ [key: string]: DataName }} */
const datanames = {
    loadcount: { name: 'アクセス数', color: 'rgba(255, 0, 0, 1)', type: DataType.NON_ADMIN, sumname: '総アクセス数' },
    ipcount: { name: '訪問者数', color: 'rgba(0, 0, 255, 1)', type: DataType.COMMON, sumname: '総訪問者数' },
    adipcount: { name: '訪問者数(管理者含む)', color: 'rgba(0, 255, 0, 1)', type: DataType.ADMIN, sumname: '総訪問者数(管理者を含む)' },
    adloadcount: { name: 'アクセス数(管理者含む)', color: 'rgba(255, 255, 0, 1)', type: DataType.ADMIN, sumname: '総アクセス数(管理者を含む)' },
};

/** @type {Chart | null} */
let chart;

/** @type {TotalCounts} */
var totalCounts = {
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
            return data[label].map((/** @type {MysqlRow} */ item) => {
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
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    onClick: function(e, legendItem) {
                        console.log('plugins.block!');
                        const index = legendItem.datasetIndex;
                        const ci = this.chart;
                        if (index) {
                            const meta = ci.getDatasetMeta(index);
                        }
                        console.log(`グラフの見出し: ${legendItem.text} がクリックされました。`)
                    }
                }
            }
        }
    });
}

/** @type {boolean} */
var isAdminView = false;

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
                if (!isAdminView) {
                    // 含めるPUSH
                    if (dataset.hidden) {
                        dataset.hidden = !dataset.hidden;
                    }
                    const buttonDiv = document.getElementById('toggleAdcount');
                    if (buttonDiv) {
                        buttonDiv.textContent = '';
                        const newText = document.createTextNode('管理者を除外する');
                        buttonDiv.appendChild(newText);
                    }
                } else {
                    // 省くPUSH
                    if (!dataset.hidden) {
                        dataset.hidden = !dataset.hidden;
                    }
                    const buttonDiv = document.getElementById('toggleAdcount');
                    if (buttonDiv) {
                        buttonDiv.textContent = '';
                        const newText = document.createTextNode('管理者を含める');
                        buttonDiv.appendChild(newText);
                    }
                }
                isAdminView = !isAdminView;
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
    const ids = [ 'ipcount', 'loadcount', 'adipcount', 'adloadcount' ];

    ids.forEach(id => {
        /** @type {number} */
        let countnum = totalCounts[id];
        let elm = document.getElementById(id);
        if (elm) {
            elm.className = 'count-num';

            elm.textContent = '';
            const text = document.createTextNode(datanames[id]['sumname'] + ': ' + countnum.toString());
            const br = document.createElement('br');
            elm.appendChild(text);
            elm.appendChild(br);
        } else {
            console.error('elm nothing!');
        }
    });
}).catch(error => console.error('Error fetching data:', error));
