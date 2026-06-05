module.exports = {
    apps: [{
        name: "AperionX",
        script: "./server.js",
        env: {
            NODE_ENV: "production",
            PORT: 3000
        },
        // Watch can be enabled for development, usually disabled for prod
        watch: false,
        // Restart logic
        max_memory_restart: '1G',
        instances: 1,
        exec_mode: "fork"
    },
    {
        name: "AperionX-DB-Backup",
        script: "./scripts/backup_db.js",
        instances: 1,
        exec_mode: "fork",
        cron_restart: "0 3 * * *", // Her gece saat 03:00'te çalıştır
        autorestart: false, // Sadece cron ile çalışsın, sürekli yeniden başlamasın
        watch: false
    }]
};
