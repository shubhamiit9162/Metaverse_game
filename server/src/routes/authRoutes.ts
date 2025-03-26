import express from 'express';
import { signup, signin, signout } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/signout', authenticateToken, signout);

export default router;