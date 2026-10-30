module.exports = {
  apps: [
    {
      name: 'chery',
      script: './bin/www',
      watch: ['bin', 'db', 'routes', 'utils', 'app.js', 'config.js', 'package.json'],
      watch_delay: 2000,
      ignore_watch: [
        'node_modules',
        'data',
        '*.db',
        '*.db-wal',
        '*.db-shm',
        '*.log',
        '.git',
        '.env'
      ]
    }
  ]
};
