import { LineChart } from '@carbon/charts';
import { Legend, ZoomBar } from '@carbon/charts/interfaces/events';
import { subDays, format, parse, isAfter, isBefore, formatDistance } from 'date-fns'

// global elements
const chartElement = document.querySelector('#chart');
const tableElement = document.querySelector('#table');
const pageTitle = document.querySelector('#title');
const provincesElement = document.querySelector('#provinces');
const canadaContainer = document.querySelector('.canada');
const candaChartToggle = document.querySelector('.canada .chart-toggle');

candaChartToggle.addEventListener('click', () => {
    canadaContainer.classList.toggle('show-table');
    if (canadaContainer.classList.contains('show-table')) {
        candaChartToggle.textContent = 'Chart';
    } else {
        candaChartToggle.textContent = 'Table';
    }
});

// provinces, raw data, and the associated chart instance
const PROVINCES = [
    {
        code: 'on',
        name: 'Ontario',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'qc',
        name: 'Quebec',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'ns',
        name: 'Nova Scotia',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'nb',
        name: 'New Brunswick',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'mb',
        name: 'Manitoba',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'bc',
        name: 'British Columbia',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'pe',
        name: 'Prince Edward Island',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'sk',
        name: 'Saskatchewan',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'ab',
        name: 'Alberta',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'nl',
        name: 'Newfoundland and Labrador',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'nt',
        name: 'Northwest Territories',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'yt',
        name: 'Yukon',
        chartElement: null,
        rawData: null,
        chart: null
    },
    {
        code: 'nu',
        name: 'Nunavut',
        chartElement: null,
        rawData: null,
        chart: null
    },
];

const today = new Date();
const start = subDays(today, 30);

const lineOptions = {
    axes: {
        bottom: {
            title: 'Days',
            mapsTo: 'date',
            scaleType: 'time',
        },
        left: {
            mapsTo: 'value',
            title: 'Change',
            scaleType: 'linear',
            domain: [0, 20000]
        },
    },
    zoomBar: {
        top: {
            enabled: true,
            initialZoomDomain: [
                start,
                today
            ]
        }
    }
};

const chart = new LineChart(chartElement, {
    data: [],
    options: lineOptions
});

const getMaxValue = (data) => {
    return data.reduce((previous, current) => {
        if (current.value > previous) { return current.value; }
        return previous;
    }, 0);
};

const getVisibleData = (data, domain) => {
    const [start, end] = domain;
    return data.filter(data => {
        return isAfter(data.date, start) && isBefore(data.date, end);
    });
};

const updateRangeFromZoom = (chart, newDomain) => {
    const data = chart.model.getData();
    const filtered = getVisibleData(data, newDomain)
    const max = getMaxValue(filtered);
    chart.model.setOptions({
        axes: {
            left: {
                domain: [0, max]
            }
        }
    });
};

const updateRangeFromLegend = (chart, legendItems) => {
    const domain = chart.services.zoom.model.state.zoomDomain;
    const names = legendItems.filter(item => item.status === 1).map(item => item.name);
    const data = chart.model.getData();
    const filtered = getVisibleData(data, domain).filter(data => names.includes(data.group));
    const max = getMaxValue(filtered);
    chart.model.setOptions({
        axes: {
            left: {
                domain: [0, max]
            }
        }
    });
};

chart.services.events.addEventListener(ZoomBar.SELECTION_END, event => {
    updateRangeFromZoom(chart, event.detail.newDomain);
});

chart.services.events.addEventListener(Legend.ITEMS_UPDATE, event => {
    updateRangeFromLegend(chart, event.detail.dataGroups)
});

let workerURL = import.meta.env.PROD_WORKER;
if (import.meta.env.MODE === 'development') {
    workerURL = import.meta.env.DEV_WORKER;
}

const renderCanadaData = (rawData) => {
    const data = formatData(rawData.data);
    chart.model.setData(data);
    updateTitle(rawData.last_updated);
    updateRangeFromZoom(chart, [start, today]);
    const table = generateTable(rawData.data);
    tableElement.appendChild(table);
}

const renderProviceData = (province, rawData) => {
    province.chartElement = document.createElement('div');
    province.chartElement.classList.add('province-chart');
    provincesElement.appendChild(province.chartElement);
    const options = Object.assign({}, lineOptions, {
        title: `${province.name} change in cases over time`
    });
    province.rawData = rawData;
    const data = formatData(rawData.data);
    const chart = new LineChart(province.chartElement, {
        data,
        options
    });
    chart.services.events.addEventListener(ZoomBar.SELECTION_END, event => {
        updateRangeFromZoom(chart, event.detail.newDomain);
    });
    updateRangeFromZoom(chart, [start, today]);
    province.chart = chart;
}

const renderSummary = (summaryData) => {
    const summaryElements = Array.from(document.querySelectorAll('.summary .bx--tile'));
        const summaries = [
            {
                title: 'Cases',
                totalKey: 'total_cases',
                changeKey: 'change_cases'
            },
            {
                title: 'Recoveries',
                totalKey: 'total_recoveries',
                changeKey: 'change_recoveries'
            },
            {
                title: 'Hospitalizations',
                totalKey: 'total_hospitalizations',
                changeKey: 'change_hospitalizations'
            },
            {
                title: 'Vaccinations',
                totalKey: 'total_vaccinations',
                changeKey: 'change_vaccinations'
            }
        ];

        for (const summary of summaries) {
            const element = summaryElements.shift();
            const total = formatNumber(summaryData[summary.totalKey]);
            let change = formatNumber(summaryData[summary.changeKey]);
            if (!change.startsWith('-')) {
                change = `+${change}`;
            }
            element.innerHTML = `
                <h1>${total}</h1>
                <h3>${summary.title}</h3>
                <span>${change} today</span>
            `;
        }
}

// get reports for everything, all at once
fetch(`${workerURL}/all`)
    .then(res => res.json())
    .then(allReports => {
        renderSummary(allReports.summary.data[0]);
        renderCanadaData(allReports.can);
        for (const province of PROVINCES) {
            renderProviceData(province, allReports[province.code]);
        }
    })
    .catch(error => console.error(error));

const updateTitle = (updatedAt) => {
    const updatedDate = parse(`${updatedAt} -05`, 'yyyy-MM-dd HH:mm:ss x', new Date())
    const formattedDate = format(updatedDate, 'EEE MMM do');
    const formattedTime = format(updatedDate, 'h:mmaaa (O)');
    pageTitle.textContent = `Last updated ${formattedDate} at ${formattedTime}`;
}

const formatNumber = (numberString) => {
    return parseInt(numberString, 10).toLocaleString();
}

const createElement = (tagName, initOptions) => {
    const tag = document.createElement(tagName);
    const options = Object.assign({
        classList: [],
        attrs: {},
        textContent: '',
        children: []
    }, initOptions);
    for (const classNameOrObject of options.classList) {
        if (typeof classNameOrObject === 'object') {
            for (const [className, enabled] of Object.entries(classNameOrObject)) {
                if (enabled) {
                    tag.classList.add(className);
                }
            }
        } else {
            tag.classList.add(classNameOrObject);
        }
    }

    for (const [attr, value] of Object.entries(options.attrs)) {
        tag.setAttribute(attr, value);
    }

    tag.textContent = options.textContent;

    for (const child of options.children) {
        tag.appendChild(child);
    }

    return tag;
};

const generateTable = (rawData) => {
    console.log(rawData);
    const headerCells = [
        'Day',
        'Cases',
        'Recoveries',
        'Hospitalizations',
        'Criticals',
        'Deaths',
        'Vaccinations'
    ].map(header => {
        const tableHeader = createElement('th', {
            classList: [header.toLowerCase()],
            attrs: {
                scope: 'col',
                title: header
            },
            children: [
                createElement('div', {
                    classList: ['bx--table-header-label'],
                    textContent: header
                })
            ]
        });
        return tableHeader;
    });

    const thead = createElement('thead', {
        children: [
            createElement('tr', {
                children: headerCells
            })
        ]
    });

    const dayRows = Array.from(rawData).reverse().map(day => {
        const date = parse(day.date, 'yyyy-MM-dd', new Date());
        const daysAgo = formatDistance(date, new Date(), { addSuffix: true });
        const monthDay = format(date, 'MMM do');
        const dayCell = createElement('td', {
            classList: ['day'],
            textContent: `${daysAgo} (${monthDay})`
        });

        const population = 37_899_277; // https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901 Q1 2020
        const percentVaccinated = (day.total_vaccinations / population * 100).toFixed(2);
        const vaxCell = createElement('td', {
            classList: ['vaccinations'],
            textContent: `${formatNumber(day.change_vaccinations)} (${percentVaccinated}%)`
        });

        const otherCells = [
            'change_cases',
            'change_recoveries',
            'change_hospitalizations',
            'change_criticals',
            'change_fatalities'
        ].map(attr => createElement('td', {
            textContent: formatNumber(day[attr])
        }));
        return createElement('tr', {
            children: [dayCell, ...otherCells, vaxCell]
        });
    });

    const tbody = createElement('tbody', {
        attrs: { 'aria-live': 'polite' },
        children: dayRows
    });

    const docWidth = document.body.getBoundingClientRect().width;
    const table = createElement('table', {
        classList: ['bx--data-table', { 'bx--data-table--sticky-header': docWidth > 1000 }],
        children: [thead, tbody]
    });
    return table;
};

const formatData = (rawData) => {
    let data = [];
    let rollingCaseData = [0, 0, 0, 0, 0, 0, 0];
    let rollingRecoveryData = [0, 0, 0, 0, 0, 0, 0];

    for (const day of rawData) {
        let date = parse(day.date, 'yyyy-MM-dd', new Date());

        data.push({
            date,
            value: day.change_cases,
            group: 'Cases'
        });
        data.push({
            date,
            value: day.change_recoveries,
            group: 'Recoveries'
        });
        data.push({
            date,
            value: day.change_fatalities,
            group: 'Deaths'
        });

        rollingCaseData.shift();
        rollingCaseData.push(day.change_cases);
        const rollingCaseSum = rollingCaseData.reduce((d, i) => d + i);
        data.push({
            date,
            value: Math.round(rollingCaseSum / 7),
            group: 'Cases (7 day average)'
        });

        rollingRecoveryData.shift();
        rollingRecoveryData.push(day.change_recoveries);
        const rollingRecoverySum = rollingRecoveryData.reduce((d, i) => d + i);
        data.push({
            date,
            value: Math.round(rollingRecoverySum / 7),
            group: 'Recoveries (7 day average)'
        });
    }

    return data;
};
