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

    // ==========================================
    // PUBLIC ROUTES (PRESERVED)
    // ==========================================
    router.get('/', expController.getAllExperiments);
    router.get('/categories', expController.getCategories);

    // ==========================================
    // AUTHOR PANEL ROUTES (REWRITTEN AS REQUESTED)
    // ==========================================
    const authorRoles = ['author', 'editor', 'admin'];
    const uploadMiddleware = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]);

    router.get('/my-experiments', authenticateToken, checkRole(authorRoles), expController.getExperiments);
    router.post('/add', authenticateToken, checkRole(authorRoles), uploadMiddleware, expController.createExperiment);
    router.put('/update/:id', authenticateToken, checkRole(authorRoles), uploadMiddleware, expController.updateExperiment);
    router.patch('/trash/:id', authenticateToken, checkRole(authorRoles), expController.softDeleteExperiment);
    router.patch('/restore/:id', authenticateToken, checkRole(authorRoles), expController.restoreExperiment);
    router.delete('/permanent/:id', authenticateToken, checkRole(authorRoles), expController.permanentDeleteExperiment);

    // ==========================================
    // EDITOR/ADMIN ROUTES (PRESERVED)
    // ==========================================
    router.put('/editor/experiment-decide/:id', authenticateToken, checkRole(['admin', 'editor']), expController.decideExperiment);
    router.get('/editor/all-experiments', authenticateToken, checkRole(['admin', 'editor']), expController.getAllExperimentsEditor);

    return router;
};
