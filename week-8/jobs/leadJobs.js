const cron = require('node-cron');
const Lead = require('../models/Lead');
const { leadQueue, emailQueue } = require('../services/jobQueue');
const { sendLeadAlert, sendLeadStatusUpdate } = require('../services/emailService');
const logger = require('../utils/logger');

emailQueue.define('send-lead-alert', async (data) => {
    const { lead, businessEmail } = data;
    await sendLeadAlert(lead, businessEmail);
});

emailQueue.define('send-status-update', async (data) => {
    const { lead, previousStatus, recipientEmail } = data;
    await sendLeadStatusUpdate(lead, previousStatus, recipientEmail);
});

leadQueue.define('auto-tag-lead', async (data) => {
    const { leadId } = data;
    const lead = await Lead.findById(leadId);
    if (!lead) return;

    const autoTags = [];

    if (lead.score >= 80) autoTags.push('hot');
    else if (lead.score >= 50) autoTags.push('warm');
    else autoTags.push('cold');

    if (lead.company) autoTags.push('has-company');
    if (lead.phone) autoTags.push('has-phone');
    if (lead.source === 'campaign') autoTags.push('campaign-lead');
    if (lead.metadata?.utmSource) autoTags.push(`utm-${lead.metadata.utmSource}`);

    const newTags = [...new Set([...lead.tags, ...autoTags])];

    if (newTags.length !== lead.tags.length) {
        await Lead.findByIdAndUpdate(leadId, { tags: newTags });
        logger.info('Auto-tagged lead', { leadId, addedTags: autoTags });
    }
});

leadQueue.define('score-lead', async (data) => {
    const { leadId } = data;
    const lead = await Lead.findById(leadId);
    if (!lead) return;

    let score = 0;

    if (lead.email) score += 20;
    if (lead.phone) score += 15;
    if (lead.company) score += 20;
    if (lead.jobTitle) score += 10;
    if (lead.source === 'campaign') score += 15;
    if (lead.source === 'referral') score += 20;
    if (lead.metadata?.utmSource) score += 10;

    const SENIOR_TITLES = ['ceo', 'cto', 'cfo', 'vp', 'director', 'president', 'founder', 'owner'];
    if (lead.jobTitle && SENIOR_TITLES.some(t => lead.jobTitle.toLowerCase().includes(t))) {
        score += 20;
    }

    score = Math.min(100, score);

    if (score !== lead.score) {
        await Lead.findByIdAndUpdate(leadId, { score });
        logger.info('Lead auto-scored', { leadId, score });
    }
});

const setupCronJobs = () => {
    cron.schedule('0 */6 * * *', async () => {
        logger.info('Running stale lead check cron job');
        try {
            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            const staleLeads = await Lead.find({
                status: 'new',
                createdAt: { $lte: twoDaysAgo }
            }).limit(100);

            for (const lead of staleLeads) {
                leadQueue.add('auto-tag-lead', { leadId: lead._id.toString() });
            }

            logger.info(`Stale lead check complete`, { count: staleLeads.length });
        } catch (error) {
            logger.error('Stale lead check failed', { error: error.message });
        }
    });

    cron.schedule('0 0 * * *', async () => {
        logger.info('Running daily lead scoring cron job');
        try {
            const leads = await Lead.find({ status: { $in: ['new', 'contacted'] } }).limit(500);
            for (const lead of leads) {
                leadQueue.add('score-lead', { leadId: lead._id.toString() }, { delay: Math.random() * 5000 });
            }
            logger.info(`Daily scoring queued for ${leads.length} leads`);
        } catch (error) {
            logger.error('Daily lead scoring failed', { error: error.message });
        }
    });

    logger.info('Cron jobs initialized');
};

module.exports = { setupCronJobs };
