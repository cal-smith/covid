import { LineChart } from "@carbon/charts";

const chartElement = document.querySelector("#chart");
const pageTitle = document.querySelector("#title");

const today = new Date();
const start = new Date();
if (today.getDate() <= 7) {
    start.setDate(-7+(1+today.getDate()));
} else {
    start.setDate(today.getDate() - 8);
}

const lineOptions = {
	title: 'Change in cases over time',
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

fetch('https://covid-data.calsmith.workers.dev')
    .then(res => res.json())
    .then(json => {
        applyData(json.data);
        updateTitle(json.last_updated);
    })
    .catch(error => console.error(error));

const updateTitle = (updatedAt) => {
    const updatedDate = new Date(`${updatedAt}-05:00`);
    pageTitle.textContent = `Last updated ${updatedDate.toDateString()} at ${updatedDate.toLocaleTimeString()}`;
}

const applyData = (rawData) => {
    let data = [];
    let rollingCaseData = [0, 0, 0, 0, 0, 0, 0];
    let rollingRecoveryData = [0, 0, 0, 0, 0, 0, 0];

    for (const day of rawData) {
        let date = new Date(day.date);
        
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

    chart.model.setData(data);
};
