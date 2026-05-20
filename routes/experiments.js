const express = require('express');
const expController = require('../controllers/experimentController');

module.exports = function(upload, authenticateToken, checkRole, createNotification, getUniqueExperimentSlug) {
    const router = express.Router();

    // Inject helpers for the controller to use
    router.use((req, res, next) => {
        req.createNotification = createNotification;
        req.getUniqueExperimentSlug = getUniqueExperimentSlug;
        next();
    });

    // ─── Public Routes ───
    router.get('/', expController.getAllExperiments);
    router.get('/categories', expController.getCategories);

    // ─── Auth Routes ───
    router.get('/my-experiments', authenticateToken, expController.getMyExperiments);
    router.post('/', authenticateToken, upload.any(), expController.createExperiment);

    // ─── Editor/Admin specific routes (MUST come BEFORE /:id to avoid parameter capture) ───
    router.put('/editor/experiment-decide/:id', authenticateToken, checkRole(['admin', 'editor']), expController.decideExperiment);
    router.get('/editor/all-experiments', authenticateToken, checkRole(['admin', 'editor']), expController.getAllExperimentsEditor);

    // ─── Protected Modification Routes (parameterized — MUST come AFTER literal routes) ───
    router.put('/:id', authenticateToken, checkRole(['admin', 'editor', 'author']), upload.fields([{ name: 'image' }, { name: 'pdf' }]), expController.updateExperiment);
    router.delete('/:id', authenticateToken, checkRole(['admin', 'editor', 'author']), expController.deleteExperiment);

    return router;
};
