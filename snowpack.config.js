// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  env: {
    DEV_WORKER: 'http://127.0.0.1:8787',
    PROD_WORKER: 'https://covid-data.calsmith.workers.dev/'
  }
};
