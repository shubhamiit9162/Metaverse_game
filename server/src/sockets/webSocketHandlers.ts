import { Server, Socket } from 'socket.io';
import { PrismaClient, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

export default function setupWebSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('New client connected');

    // Space Joining Logic
    socket.on('joinSpace', async (data) => {
      try {
        const { spaceId, userId } = data;
        const space = await prisma.space.findUnique({ 
          where: { id: spaceId },
          include: { 
            owner: true,
            members: {
              include: {
                user: true
              }
            }
          }
        });

        if (!space) {
          socket.emit('spaceJoinError', { message: 'Space not found' });
          return;
        }

        // Check if user is a member
        const isMember = space.members.some(member => member.userId === userId);
        if (!isMember && space.type === 'PRIVATE') {
          socket.emit('spaceJoinError', { message: 'Not authorized to join this space' });
          return;
        }

        socket.join(spaceId);
        socket.emit('spaceJoined', { space });
      } catch (error) {
        socket.emit('spaceJoinError', { message: error.message });
      }
    });

    // Movement Event
    socket.on('movement', async (data) => {
      const { spaceId, userId, position } = data;
      
      try {
        // Validate space and user
        const space = await prisma.space.findUnique({ 
          where: { id: spaceId },
          include: { members: true }
        });

        if (!space) return;

        const isMember = space.members.some(member => member.userId === userId);
        if (!isMember) return;

        socket.to(spaceId).emit('userMoved', { userId, position });
      } catch (error) {
        console.error('Movement error:', error);
      }
    });

    // Chat Event
    socket.on('chatMessage', async (data) => {
      const { spaceId, message, userId } = data;

      try {
        // Validate space and user
        const space = await prisma.space.findUnique({ 
          where: { id: spaceId },
          include: { members: true }
        });

        if (!space) return;

        const isMember = space.members.some(member => member.userId === userId);
        if (!isMember) return;

        // Save message to database
        const savedMessage = await prisma.message.create({
          data: {
            content: message,
            senderId: userId,
            spaceId: spaceId,
            type: MessageType.TEXT
          },
          include: {
            sender: {
              select: { id: true, username: true, avatar: true }
            }
          }
        });

        socket.to(spaceId).emit('newChatMessage', savedMessage);
        socket.emit('newChatMessage', savedMessage);
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
}