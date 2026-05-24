var Service = require('node-windows').Service;

var svc = new Service({
    name: 'AperionX Server',
    script: require('path').join(__dirname, 'server.js')
});

svc.on('uninstall', function () {
    console.log('Uninstall complete.');
    console.log('The service exists: ', svc.exists);
});

svc.uninstall();
