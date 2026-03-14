import { RequestHandler, Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { JobStatusResponse, JobResultResponse, InterestRequest } from '../types';

export const getJobStatus: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId, 10);

    if (isNaN(jobId)) {
      res.status(400).json({ error: 'Invalid jobId' });
      return;
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const response: JobStatusResponse = {
      jobId: String(job.id),
      status: job.status,
      progress: job.progress,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const getJobResult: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId, 10);

    if (isNaN(jobId)) {
      res.status(400).json({ error: 'Invalid jobId' });
      return;
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { result: true },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'COMPLETED') {
      res.status(202).json({ message: 'Job not yet completed', status: job.status });
      return;
    }

    const response: JobResultResponse = {
      jobId: String(job.id),
      wordCount: job.result!.wordCount,
      paragraphCount: job.result!.paragraphCount,
      topKeywords: job.result!.keywords,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const registerInterest: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, selectedStep } = req.body as InterestRequest;

    if (!name || !email || !selectedStep) {
      res.status(400).json({ error: 'name, email, and selectedStep are required' });
      return;
    }

    console.log('Interest registered:', { name, email, selectedStep });

    res.status(201).json({ message: 'Interest registered successfully' });
  } catch (err) {
    next(err);
  }
};
