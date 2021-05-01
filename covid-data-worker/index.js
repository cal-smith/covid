addEventListener('fetch', (event) => {
  const { request } = event;
  const response = handleRequest(request).catch(handleError);
  event.respondWith(response);
});

addEventListener('scheduled', (event) => {
  event.waitUntil(handleSchedule());
});

const handleSchedule = async () => {
  try {
    const jsonText = await fetch('https://api.covid19tracker.ca/reports')
      .then(res => res.text());
    await COVID_DATA.put('canada_report', jsonText);
  } catch (error) {
    console.error(error);
  }
};

const handleRequest = async (request) => {
  let allowedOrigin = 'https://covid-r9aa.pages.dev';
  if (ENVIRONMENT === 'development') {
    console.log('development mode, allowing all origins');
    allowedOrigin = '*'
  }
  const jsonText = await COVID_DATA.get('canada_report');
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
