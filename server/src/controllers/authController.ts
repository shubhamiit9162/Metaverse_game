import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserStatus } from '@prisma/client';
import { generateToken } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword, status: UserStatus.ONLINE },
    });

    // Generate Token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, status: user.status },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message || 'Unknown error' });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update user status
    await prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.ONLINE } });

    const token = generateToken(user.id, user.email);

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, status: UserStatus.ONLINE },
    });
  } catch (error: any) {
    console.error('Signin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message || 'Unknown error' });
  }
};

export const signout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (userId) {
      await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.OFFLINE } });
    }
    res.json({ message: 'Signed out successfully' });
  } catch (error: any) {
    console.error('Signout error:', error);
    res.status(500).json({ message: 'Server error', error: error.message || 'Unknown error' });
  }
};
