import { Router } from 'express';
import { upload } from '../middleware/upload';
import { handleUpload } from '../controllers/uploadController';

const router = Router();
router.post('/upload', upload.single('file'), handleUpload);
export default router;
