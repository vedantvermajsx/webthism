const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    if (process.env.EMAIL_HOST) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });
    }

    return transporter;
};

const sendLeadAlert = async (lead, businessEmail) => {
    if (!businessEmail && !process.env.ALERT_EMAIL) {
        logger.warn('No alert email configured, skipping lead alert');
        return { success: false, reason: 'no_email_configured' };
    }

    const to = businessEmail || process.env.ALERT_EMAIL;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #4F46E5; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🎯 New Lead Alert</h2>
        <p style="margin: 8px 0 0; opacity: 0.85;">You have a new lead to follow up on</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Name</td>
              <td style="padding: 8px 0; font-weight: 600;">${lead.firstName} ${lead.lastName || ''}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${lead.email}" style="color: #4F46E5;">${lead.email}</a></td></tr>
          ${lead.phone ? `<tr><td style="padding: 8px 0; color: #6b7280;">Phone</td>
              <td style="padding: 8px 0;">${lead.phone}</td></tr>` : ''}
          ${lead.company ? `<tr><td style="padding: 8px 0; color: #6b7280;">Company</td>
              <td style="padding: 8px 0;">${lead.company}</td></tr>` : ''}
          ${lead.jobTitle ? `<tr><td style="padding: 8px 0; color: #6b7280;">Job Title</td>
              <td style="padding: 8px 0;">${lead.jobTitle}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #6b7280;">Source</td>
              <td style="padding: 8px 0;"><span style="background: #EEF2FF; color: #4F46E5; padding: 2px 8px; border-radius: 9999px; font-size: 13px;">${lead.source}</span></td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Score</td>
              <td style="padding: 8px 0;"><strong>${lead.score}/100</strong></td></tr>
          ${lead.tags && lead.tags.length ? `<tr><td style="padding: 8px 0; color: #6b7280;">Tags</td>
              <td style="padding: 8px 0;">${lead.tags.map(t => `<span style="background: #F3F4F6; padding: 2px 8px; border-radius: 9999px; font-size: 12px; margin-right: 4px;">${t}</span>`).join('')}</td></tr>` : ''}
        </table>
      </div>
      <div style="background: white; padding: 16px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">Lead Generation Service API • ${new Date().toUTCString()}</p>
      </div>
    </div>
    `;

    try {
        const info = await getTransporter().sendMail({
            from: process.env.EMAIL_FROM || `"Lead Gen API" <${process.env.EMAIL_USER || process.env.GMAIL_USER}>`,
            to,
            subject: `🎯 New Lead: ${lead.firstName} ${lead.lastName || ''} from ${lead.company || lead.source}`,
            html
        });

        logger.info('Lead alert email sent', { messageId: info.messageId, to, leadId: lead._id });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('Failed to send lead alert email', { error: error.message, to, leadId: lead._id });
        return { success: false, error: error.message };
    }
};

const sendLeadStatusUpdate = async (lead, previousStatus, recipientEmail) => {
    const to = recipientEmail || process.env.ALERT_EMAIL;
    if (!to) return { success: false, reason: 'no_email_configured' };

    const statusColors = {
        new: '#3B82F6',
        contacted: '#F59E0B',
        qualified: '#10B981',
        unqualified: '#EF4444',
        converted: '#8B5CF6',
        lost: '#6B7280'
    };

    const color = statusColors[lead.status] || '#6B7280';

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${color}; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Lead Status Updated</h2>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p><strong>${lead.firstName} ${lead.lastName || ''}</strong> (${lead.email}) status changed:</p>
        <p style="font-size: 20px; text-align: center;">
          <span style="color: #6b7280;">${previousStatus}</span>
          &nbsp;→&nbsp;
          <span style="color: ${color}; font-weight: 700;">${lead.status}</span>
        </p>
      </div>
    </div>
    `;

    try {
        const info = await getTransporter().sendMail({
            from: process.env.EMAIL_FROM || `"Lead Gen API" <${process.env.EMAIL_USER || process.env.GMAIL_USER}>`,
            to,
            subject: `Lead Status: ${lead.firstName} is now "${lead.status}"`,
            html
        });
        logger.info('Status update email sent', { messageId: info.messageId, leadId: lead._id });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('Failed to send status update email', { error: error.message });
        return { success: false, error: error.message };
    }
};

const verifyEmailConfig = async () => {
    try {
        await getTransporter().verify();
        logger.info('Email configuration verified successfully');
        return true;
    } catch (error) {
        logger.warn('Email configuration verification failed', { error: error.message });
        return false;
    }
};

module.exports = { sendLeadAlert, sendLeadStatusUpdate, verifyEmailConfig };
