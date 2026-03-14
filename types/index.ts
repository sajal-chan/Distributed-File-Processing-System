import { JobStatus as PrismaJobStatus } from '@prisma/client';

export type JobStatus = PrismaJobStatus;

export interface JobPayload {
  jobId: number;
  filePath: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
}

export interface JobResultResponse {
  jobId: string;
  wordCount: number;
  paragraphCount: number;
  topKeywords: string[];
}

export interface InterestRequest {
  name: string;
  email: string;
  selectedStep: string;
}

export interface UploadResponse {
  message: string;
  jobId: number;
}

export interface ApiError {
  error: string;
}

export interface ProcessingResult {
  wordCount: number;
  paragraphCount: number;
  keywords: string[];
}
