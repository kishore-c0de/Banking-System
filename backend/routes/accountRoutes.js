const express = require('express');
const router = express.Router();
const { listMyAccounts, openAccount, getAccount, lookupByAccountNumber } = require('../controllers/accountController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', listMyAccounts);
router.post('/', openAccount);
router.get('/lookup/:accountNumber', lookupByAccountNumber);
router.get('/:id', getAccount);

module.exports = router;
