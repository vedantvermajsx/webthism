const express = require('express');
const router = express.Router();

const {
    createContact, getContacts, getContactById,
    updateContact, deleteContact, linkLead
} = require('../controllers/contactController');

const { protect } = require('../middleware/auth');
const {
    validate,
    createContactSchema,
    updateContactSchema
} = require('../middleware/validation');

router.use(protect);

router.post('/', validate(createContactSchema), createContact);
router.get('/', getContacts);
router.get('/:id', getContactById);
router.put('/:id', validate(updateContactSchema), updateContact);
router.delete('/:id', deleteContact);
router.post('/:id/link-lead', linkLead);

module.exports = router;
