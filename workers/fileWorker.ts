import { Worker, Job } from 'bullmq';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db';
import { JobPayload, ProcessingResult, JobStatus } from '../types';

const STOPWORDS: Set<string> = new Set([
  'a','the','is','in','of','to','and','for','it','that',
  'with','this','on','at','be','as','by','are','was',
  'were','has','have','had','but','or','an'
]);

const extractKeywords = (text: string): string[] => {
  const tokens: string[] = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
  const freq = new Map<string, number>();
  for (const word of tokens) {
    if (!STOPWORDS.has(word)) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
};

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const worker = new Worker<JobPayload>(
  'file-processing',
  async (job: Job<JobPayload>) => {
    try {
      console.log(`[Worker] Processing job ${job.id}, DB jobId: ${job.data.jobId}`);

      // Step a: Update status to PROCESSING, progress to 10
      await prisma.job.update({
        where: { id: job.data.jobId },
        data: { status: 'PROCESSING' as JobStatus, progress: 10 },
      });

      // Step b & c: Read file based on type
      const ext: string = path.extname(job.data.filePath).toLowerCase();
      let text: string;

      if (ext === '.pdf') {
        const data = await pdfParse(fs.readFileSync(job.data.filePath));
        text = data.text;
      } else if (ext === '.txt') {
        text = await fs.promises.readFile(job.data.filePath, 'utf-8');
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }

      // Step d: Update progress to 40
      await prisma.job.update({
        where: { id: job.data.jobId },
        data: { progress: 40 },
      });

      // Step e: Count words
      const wordCount: number = text.trim().split(/\s+/).filter(Boolean).length;

      // Step f: Count paragraphs
      const paragraphCount: number = text.split(/\n\n+/).filter(s => s.trim().length > 0).length;

      // Step g: Update progress to 70
      await prisma.job.update({
        where: { id: job.data.jobId },
        data: { progress: 70 },
      });

      // Step h: Extract keywords
      const keywords: string[] = extractKeywords(text);

      // Step i: Update progress to 90
      await prisma.job.update({
        where: { id: job.data.jobId },
        data: { progress: 90 },
      });

      // Step j: Create Result record
      const result: ProcessingResult = { wordCount, paragraphCount, keywords };
      await prisma.result.create({
        data: {
          jobId: job.data.jobId,
          wordCount: result.wordCount,
          paragraphCount: result.paragraphCount,
          keywords: result.keywords,
        },
      });

      // Step k: Update status to COMPLETED, progress to 100
      await prisma.job.update({
        where: { id: job.data.jobId },
        data: { status: 'COMPLETED' as JobStatus, progress: 100 },
      });

      // Step l: Log completion
      console.log(`[Worker] Job ${job.id} completed`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      await prisma.job.update({
        where: { id: job.data.jobId },
        data: { status: 'FAILED' as JobStatus },
      }).catch(() => {});
      throw error;
    }
  },
  { connection: { url: redisUrl }, concurrency: 3 }
);

worker.on('failed', (job, err: Error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err: Error) => {
  console.error('[Worker] Worker error:', err.message);
});
