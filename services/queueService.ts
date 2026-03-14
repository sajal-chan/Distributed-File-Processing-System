import { Queue } from 'bullmq';
import { JobPayload } from '../types';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const fileQueue = new Queue<JobPayload>('file-processing', {
  connection: { url: redisUrl },
});

export const addFileJob = async (jobId: number, filePath: string): Promise<void> => {
  await fileQueue.add(
    'process-file',
    { jobId, filePath },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    }
  );
};
