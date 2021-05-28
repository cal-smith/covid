// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  devOptions: {
    port: 8081
  },
  env: {
    DEV_WORKER: 'http://127.0.0.1:8787',
    PROD_WORKER: 'https://covid-data.calsmith.workers.dev'
  },
  plugins: [
    [
      '@snowpack/plugin-run-script',
      {
        name: 'worker',
        cmd: 'exit 0',
        watch: 'cd covid-data-worker && npm start'
      }
    ]
  ],
  exclude: [
    '**/node_modules/**/*',
    '**/covid-data-worker/**/*',
    '**.git/**/*'
  ]
};
