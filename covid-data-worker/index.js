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
    const jsonText = await COVID_DATA.get('canada_report');
    return new Response(jsonText, {
      headers: {
        'Access-Control-Allow-Origin': 'https://covid-r9aa.pages.dev/'
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
  