const express = require('express');
const router = express.Router();

const {
    createCampaign, getCampaigns, getCampaignById,
    updateCampaign, deleteCampaign, getCampaignLeads,
    updateCampaignMetrics
} = require('../controllers/campaignController');

const { protect } = require('../middleware/auth');
const {
    validate,
    createCampaignSchema,
    updateCampaignSchema,
    updateCampaignMetricsSchema
} = require('../middleware/validation');

router.use(protect);

router.post('/', validate(createCampaignSchema), createCampaign);
router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.put('/:id', validate(updateCampaignSchema), updateCampaign);
router.delete('/:id', deleteCampaign);
router.get('/:id/leads', getCampaignLeads);
router.patch('/:id/metrics', validate(updateCampaignMetricsSchema), updateCampaignMetrics);

module.exports = router;
