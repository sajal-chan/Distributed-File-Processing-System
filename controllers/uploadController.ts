import { RequestHandler, Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { addFileJob } from '../services/queueService';
import { UploadResponse } from '../types';

export const handleUpload: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'name and email are required' });
      return;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email },
    });

    const file = await prisma.file.create({
      data: {
        userId: user.id,
        filePath: req.file.path,
        fileName: req.file.originalname,
      },
    });

    const job = await prisma.job.create({
      data: {
        fileId: file.id,
        status: 'PENDING',
        progress: 0,
      },
    });

    await addFileJob(job.id, req.file.path);

    const response: UploadResponse = {
      message: 'File uploaded successfully',
      jobId: job.id,
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};
