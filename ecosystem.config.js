module.exports = {
  apps: [
    {
      name: 'payments-service',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
