import express from 'express';
import { 
  createSpace, 
  getAllSpaces, 
  getSpaceById,
  joinSpace
} from '../controllers/spaceController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authenticateToken, createSpace);
router.get('/', authenticateToken, getAllSpaces);
router.get('/:spaceId', authenticateToken, getSpaceById);
router.post('/:spaceId/join', authenticateToken, joinSpace);

export default router;