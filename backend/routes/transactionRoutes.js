const express = require('express');
const router = express.Router();
const { deposit, withdraw, transfer, history } = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/deposit', deposit);
router.post('/withdraw', withdraw);
router.post('/transfer', transfer);
router.get('/account/:accountId', history);

module.exports = router;
