const logger = require('../utils/logger');

class JobQueue {
    constructor(name) {
        this.name = name;
        this.queue = [];
        this.processing = false;
        this.stats = { processed: 0, failed: 0, pending: 0 };
        this.handlers = {};
    }

    define(jobType, handler) {
        this.handlers[jobType] = handler;
    }

    add(jobType, data, opts = {}) {
        const job = {
            id: `${jobType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: jobType,
            data,
            attempts: 0,
            maxAttempts: opts.maxAttempts || 3,
            delay: opts.delay || 0,
            createdAt: new Date(),
            runAt: opts.delay ? new Date(Date.now() + opts.delay) : new Date()
        };

        this.queue.push(job);
        this.stats.pending++;
        logger.info(`Job added to ${this.name} queue`, { jobId: job.id, type: jobType });

        if (!this.processing) {
            setImmediate(() => this._process());
        }

        return job;
    }

    async _process() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const now = new Date();
            const job = this.queue.find(j => j.runAt <= now);

            if (!job) {
                break;
            }

            this.queue.splice(this.queue.indexOf(job), 1);
            this.stats.pending--;

            const handler = this.handlers[job.type];
            if (!handler) {
                logger.warn(`No handler for job type: ${job.type}`, { jobId: job.id });
                continue;
            }

            try {
                job.attempts++;
                await handler(job.data, job);
                this.stats.processed++;
                logger.info(`Job completed`, { jobId: job.id, type: job.type, attempts: job.attempts });
            } catch (error) {
                logger.error(`Job failed`, { jobId: job.id, type: job.type, attempt: job.attempts, error: error.message });

                if (job.attempts < job.maxAttempts) {
                    const backoff = Math.pow(2, job.attempts) * 1000;
                    job.runAt = new Date(Date.now() + backoff);
                    this.queue.push(job);
                    this.stats.pending++;
                    logger.info(`Job re-queued with backoff`, { jobId: job.id, backoffMs: backoff });
                } else {
                    this.stats.failed++;
                    logger.error(`Job permanently failed after ${job.attempts} attempts`, { jobId: job.id });
                }
            }
        }

        this.processing = false;
    }

    getStats() {
        return { ...this.stats, queueLength: this.queue.length };
    }

    clear() {
        this.queue = [];
        this.stats.pending = 0;
    }
}

const leadQueue = new JobQueue('leads');
const emailQueue = new JobQueue('emails');

module.exports = { leadQueue, emailQueue, JobQueue };
