import { Request, Response } from 'express';
import { PrismaClient, MemberRole } from '@prisma/client';

const prisma = new PrismaClient();

export const createSpace = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, description, type, maxUsers } = req.body;

    const space = await prisma.space.create({
      data: {
        name,
        description,
        type,
        maxUsers,
        owner: { connect: { id: userId } },
        members: {
          create: [{
            user: { connect: { id: userId } },
            role: MemberRole.OWNER
          }]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        }
      }
    });

    res.status(201).json(space);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAllSpaces = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { type } = req.query;

    const spaces = await prisma.space.findMany({
      where: {
        type: type ? type as string : undefined,
        OR: [
          { type: 'PUBLIC' },
          { 
            members: { 
              some: { 
                userId: userId 
              } 
            } 
          }
        ]
      },
      include: {
        owner: {
          select: { id: true, username: true }
        },
        _count: {
          select: { 
            members: true,
            messages: true 
          }
        }
      }
    });

    res.json(spaces);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSpaceById = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const userId = req.user?.userId;

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        owner: {
          select: { id: true, username: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true, status: true }
            }
          }
        },
        messages: {
          include: {
            sender: {
              select: { id: true, username: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    // Check if user is a member of the space
    const isMember = space.members.some(member => member.userId === userId);
    
    if (space.type === 'PRIVATE' && !isMember) {
      return res.status(403).json({ message: 'You do not have access to this space' });
    }

    res.json(space);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const joinSpace = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const userId = req.user?.userId;

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        members: true
      }
    });

    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    if (space.type === 'PRIVATE') {
      return res.status(403).json({ message: 'Cannot join a private space' });
    }

    if (space.members.length >= space.maxUsers) {
      return res.status(400).json({ message: 'Space is full' });
    }

    const existingMember = space.members.find(member => member.userId === userId);
    if (existingMember) {
      return res.status(400).json({ message: 'Already a member of this space' });
    }

    const updatedSpace = await prisma.space.update({
      where: { id: spaceId },
      data: {
        members: {
          create: [{
            user: { connect: { id: userId } },
            role: MemberRole.MEMBER
          }]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true, status: true }
            }
          }
        }
      }
    });

    res.json(updatedSpace);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};