const express = require('express');
const router = express.Router();

const {
    createForm, getForms, getFormById,
    updateForm, deleteForm, submitForm
} = require('../controllers/formController');

const { protect } = require('../middleware/auth');
const {
    validate,
    createFormSchema,
    updateFormSchema
} = require('../middleware/validation');

router.get('/:id', getFormById);
router.post('/:id/submit', submitForm);

router.use(protect);

router.post('/', validate(createFormSchema), createForm);
router.get('/', getForms);
router.put('/:id', validate(updateFormSchema), updateForm);
router.delete('/:id', deleteForm);

module.exports = router;
