module.exports = {
  apps: [{
    name: 'cosaif-download',
    cwd: '/var/www/BackCosaif/descarga-movil',
    script: '/usr/bin/npm',
    args: ['start'],
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production' },
  }],
};
