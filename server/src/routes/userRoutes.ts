import express from 'express';
import { 
  getUserProfile, 
  updateUserProfile, 
  searchUsers 
} from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.get('/search', authenticateToken, searchUsers);

export default router;