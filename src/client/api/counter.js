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
 * @typedef {Object} CountFlag
 * @property {boolean} loadcount
 * @property {boolean} ipcount
 * @property {boolean} adloadcount
 * @property {boolean} adipcount
 */

/** @typedef {'year' | 'month' | 'last7days'} TimeType */

/** @type {{ [key in TimeType]: string }} */
const timenames = { 'year': '年間のグラフ', 'month': '月間のグラフ', 'last7days': '過去7日間のグラフ' };

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

/** @type {CountFlag} */
let countFlags = {
    loadcount: false,
    ipcount: false,
    adloadcount: false,
    adipcount: false
};

/**
 * @param {TimeType} type
 * @param {any} data
 */
function createChart(type, data) {
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
                title: {
                    display: true,
                    text: timenames[type]
                },
                legend: {
                    onClick: function(e, legendItem) {
                        const index = legendItem.datasetIndex;
                        const ci = this.chart;
                        if (index !== undefined) {
                            const meta = ci.getDatasetMeta(index);

                            if (meta.hidden === null || meta.hidden === undefined) {
                                meta.hidden = !ci.data.datasets[index].hidden;
                            } else {
                                meta.hidden = !meta.hidden;
                            }
                            ci.update();
                        } else {
                            console.error('Index is undefined');
                        }

                        const matchingKey = Object.entries(datanames).find(([key, value]) => value.name === legendItem.text)?.[0];
                        if (matchingKey) {
                            countFlags[matchingKey] = !countFlags[matchingKey];
                        }
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

    //var currentChart = /** @type {Chart} */ (chart);
    keys.forEach(key => {
        if (key in datanames) {
            const dataset = (/** @type {Chart} */ (chart)).data.datasets.find(ds => ds.label === datanames[key]['name']);
            if (dataset) {
                if (!isAdminView) {
                    // include setting
                    if (!countFlags[key]) {
                        dataset.hidden = false;
                        countFlags[key] = !countFlags[key];
                    } else {
                        // dataset.hidden = true;
                    }
                } else {
                    // exclude setting
                    if (countFlags[key]) {
                        dataset.hidden = true;
                        countFlags[key] = !countFlags[key];
                    } else {
                        // dataset.hidden = false;
                    }
                }
            }
        } else {
            console.error('not key in datanames');
        }
    });
    chart.update();
    isAdminView = !isAdminView;
}

const urlParams = new URLSearchParams(window.location.search);
const getType = urlParams.get('type') || 'month';

/**
 * @param {string | null} value
 * @returns {value is TimeType}
 */
function isValidTimeType(value) {
    if (value === null) {
        return false;
    }
    return ['year', 'month', 'last7days'].includes(value);
}

if (!isValidTimeType(getType)) {
    throw new Error("Wrong get query!");
}

/** @type {TimeType} */
const type = getType || 'month';

/** @param {...string} labels */
function hideShowElement(...labels) {
    labels.forEach(label => {
        const labelDiv = document.getElementById(label);
        if (labelDiv) {
            if (labelDiv.style.display === "none") {
                labelDiv.style.display = '';
                labelDiv.style.display = "block";
            } else {
                labelDiv.style.display = "none";
            }
        }
    });
}

/** @param {TimeType} targetType */
function updateGetButton(targetType) {
    Object.keys(timenames).forEach(timename => {
        if (timename === targetType) {
            hideShowElement(timename);
        } else {
            let elmDiv = document.getElementById(timename);
            if (elmDiv) {
                const text = document.createTextNode(timenames[timename]);
                elmDiv?.appendChild(text);
                elmDiv.addEventListener('click', () => {
                    window.location.href = `?type=${timename}`;
                });
            }
        }
    });
}

/** @param {string} label */
function updateButtonLabel(label) {
    const buttonDiv = document.getElementById('toggleAdcount');
    if (buttonDiv) {
        buttonDiv.textContent = '';
        const newText = document.createTextNode(label);
        buttonDiv.appendChild(newText);
    }
}

updateGetButton(type);
updateButtonLabel('管理者を含める');
hideShowElement('adipcount', 'adloadcount');

document.getElementById('toggleAdcount')?.addEventListener('click', () => {
    toggleDataset('adloadcount', 'adipcount');
    updateButtonLabel(isAdminView ? '管理者を除外する' : '管理者を含める');
    hideShowElement('adipcount', 'adloadcount', 'br', 'ipcount', 'loadcount');
});

fetchData(type).then(data => {
    createChart(type, data);
    const ids = [ 'ipcount', 'loadcount', 'adipcount', 'adloadcount' ];

    const br = document.createElement('br');

    const brDiv = document.getElementById('br');
    brDiv?.appendChild(br);

    ids.forEach(id => {
        /** @type {number} */
        let countnum = totalCounts[id];
        let elm = document.getElementById(id);
        if (elm) {
            elm.className = 'count-num';

            elm.textContent = '';
            var text;
            if (['adloadcount', 'adipcount'].includes(id)) {
                const notAdcountName = id.slice(2);
                const notAdcountnum = totalCounts[notAdcountName];
                const adcountnum = countnum - notAdcountnum;
                text = document.createTextNode(`${datanames[notAdcountName]['sumname']}: ${notAdcountnum} + ${adcountnum} = ${countnum}`);
            } else {
                text = document.createTextNode(datanames[id]['sumname'] + ': ' + countnum.toString());
            }
            elm.appendChild(text);
        }
    });
}).catch(error => console.error('Error fetching data:', error));
