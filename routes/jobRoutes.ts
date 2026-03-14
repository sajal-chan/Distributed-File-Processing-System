import { Router } from 'express';
import { getJobStatus, getJobResult, registerInterest } from '../controllers/jobController';

const router = Router();
router.get('/jobs/:jobId/status', getJobStatus);
router.get('/jobs/:jobId/result', getJobResult);
router.post('/interest', registerInterest);
export default router;
