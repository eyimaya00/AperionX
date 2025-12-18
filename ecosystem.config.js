module.exports = {
    apps: [{
        name: "aperionx-app",
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
    }]
};
