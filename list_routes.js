const express = require('express');
const mockApp = express();
const Module = require('module');
const originalRequire = Module.prototype.require;

// Mock express to capture the app instance
Module.prototype.require = function(name) {
    if (name === 'express') {
        const mockExpress = () => mockApp;
        Object.assign(mockExpress, express);
        return mockExpress;
    }
    return originalRequire.apply(this, arguments);
};

// Prevent app.listen from actually running
mockApp.listen = function() {
    console.log('mockApp.listen called, preventing server start');
    return { close: () => {} };
};

// Require server.js
try {
    require('./server.js');
} catch (e) {
    console.log('Captured require error (expected if DB/env is missing):', e.message);
}

// Print all registered routes
console.log('\n--- REGISTERED ROUTES ---');
if (mockApp._router && mockApp._router.stack) {
    mockApp._router.stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
            console.log(`${methods} ${layer.route.path}`);
        } else if (layer.name === 'router') {
            layer.handle.stack.forEach(subLayer => {
                if (subLayer.route) {
                    const methods = Object.keys(subLayer.route.methods).join(',').toUpperCase();
                    console.log(`[Router] ${methods} ${subLayer.route.path}`);
                }
            });
        }
    });
} else {
    console.log('No router stack found!');
}
