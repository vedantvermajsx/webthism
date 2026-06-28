const express = require('express');
const router = express.Router();

const {
    createLead, getLeads, getLeadById, updateLead,
    deleteLead, updateLeadStatus, addNote, getLeadStats,
    bulkUpdateLeads, bulkDeleteLeads, manageTags, getJobStats
} = require('../controllers/leadController');

const { protect } = require('../middleware/auth');
const {
    validate,
    createLeadSchema,
    updateLeadSchema,
    updateLeadStatusSchema,
    addLeadNoteSchema
} = require('../middleware/validation');

router.post('/', validate(createLeadSchema), createLead);

router.use(protect);

router.get('/stats', getLeadStats);
router.get('/job-stats', getJobStats);
router.get('/', getLeads);
router.get('/:id', getLeadById);
router.put('/:id', validate(updateLeadSchema), updateLead);
router.delete('/:id', deleteLead);
router.patch('/:id/status', validate(updateLeadStatusSchema), updateLeadStatus);
router.post('/:id/notes', validate(addLeadNoteSchema), addNote);
router.patch('/:id/tags', manageTags);

router.patch('/bulk/update', bulkUpdateLeads);
router.delete('/bulk/delete', bulkDeleteLeads);

module.exports = router;
