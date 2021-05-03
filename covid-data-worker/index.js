addEventListener('fetch', (event) => {
  const { request } = event;
  const response = handleRequest(request).catch(handleError);
  event.respondWith(response);
});

addEventListener('scheduled', (event) => {
  event.waitUntil(handleSchedule());
});

const PROVINCES = [
  'on', 'qc', 'ns', 'nb', 'mb', 'bc', 'pe', 'sk', 'ab', 'nl', 'nt', 'yt', 'nu'
];

const getCovidData = async (province) => {
  let url = 'https://api.covid19tracker.ca/reports';
  if (province) {
    url = `https://api.covid19tracker.ca/reports/province/${province}`;
  }
  try {
    return await fetch(url).then(res => res.text());
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const handleSchedule = async () => {
  try {
    const jsonText = await getCovidData();
    await COVID_DATA.put('canada_report', jsonText);
    for (const province of PROVINCES) {
      const jsonText = await getCovidData(province);
      await COVID_DATA.put(`${province}_report`, jsonText);
    }
    const summaryText = await fetch('https://api.covid19tracker.ca/summary').then(res => res.text());
    await COVID_DATA.put('summary', summaryText);
  } catch (error) {
    console.error(error);
  }
};

const handleRequest = async (request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const searchParams = url.searchParams;
  const province = searchParams.get('province');

  if (province && !PROVINCES.includes(province)) {
    return new Response(null, { status: 404 });
  }

  let allowedOrigin = 'https://covid-r9aa.pages.dev';
  if (ENVIRONMENT === 'development') {
    console.log('development mode, allowing all origins');
    allowedOrigin = '*';
    // dev env hack - http://localhost:8787?refresh=true to refresh data
    if (searchParams.get('refresh')) {
      await handleSchedule();
      return new Response('done');
    }
  }

  let jsonText = '';
  if (!province) {
    if (pathname.includes('summary')) {
      jsonText = await COVID_DATA.get('summary');
    } else {
      jsonText = await COVID_DATA.get('canada_report');
    }
  } else {
    jsonText = await COVID_DATA.get(`${province}_report`);
  }

  const jsonBlob = new Blob([jsonText], {
    type: 'application/json'
  });
  return new Response(jsonBlob, {
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Vary': 'Origin'
    }
  });
};

const handleError = (error) => {
  console.error('Uncaught error:', error);

  const { stack } = error;
  return new Response(stack || error, {
    status: 500,
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8'
    }
  });
};
