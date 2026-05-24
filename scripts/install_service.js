var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name: 'AperionX Server',
    description: 'The Node.js server for AperionX application.',
    script: require('path').join(__dirname, 'server.js'),
    env: [
        {
            name: "PORT",
            value: "80"
        },
        {
            name: "NODE_ENV",
            value: "production"
        }
    ],
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function () {
    svc.start();
    console.log('Service installed and started!');
});

// Listen for the "alreadyinstalled" event
svc.on('alreadyinstalled', function () {
    console.log('This service is already installed.');
    svc.start();
});

// Listen for the "start" event and let us know when the
// process has actually started working.
svc.on('start', function () {
    console.log(svc.name + ' started!');
});

svc.install();
