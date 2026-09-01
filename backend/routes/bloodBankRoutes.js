const express = require('express');
const router = express.Router();
const bloodBankController = require('../controllers/bloodBankController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(authorizeRoles('Blood Bank Staff'));

router.get('/dashboard', bloodBankController.getInventoryDashboard);
router.get('/inventory', bloodBankController.getInventoryList);
router.post('/inventory', bloodBankController.addInventoryUnit);
router.put('/inventory/:id', bloodBankController.updateInventoryUnit);
router.delete('/inventory/:id', bloodBankController.deleteInventoryUnit);
router.post('/test', bloodBankController.addBloodTestRecord);
router.post('/collect', bloodBankController.registerDonationCollection);
router.get('/expired', bloodBankController.getExpiredUnits);
router.post('/clean-expired', bloodBankController.cleanExpiredInventory);

module.exports = router;
