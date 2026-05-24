import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

let io: Server;
const connectedUsers = new Map<string, string[]>(); // userId -> socketIds[]

export const initSocket = (server: HttpServer): void => {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
    pingTimeout: 60000,
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) { next(new Error('Authentication required')); return; }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
      (socket as any).userId = decoded.id;
      (socket as any).userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const userRole = (socket as any).userRole;
    logger.info(`Socket connected: user ${userId}`);

    if (!connectedUsers.has(userId)) connectedUsers.set(userId, []);
    connectedUsers.get(userId)!.push(socket.id);

    // Join role-based rooms
    socket.join(`user:${userId}`);
    socket.join(`role:${userRole}`);

    socket.on('ticket:join', (ticketId: string) => socket.join(`ticket:${ticketId}`));
    socket.on('ticket:leave', (ticketId: string) => socket.leave(`ticket:${ticketId}`));
    socket.on('typing:start', (ticketId: string) => socket.to(`ticket:${ticketId}`).emit('typing:start', { userId }));
    socket.on('typing:stop', (ticketId: string) => socket.to(`ticket:${ticketId}`).emit('typing:stop', { userId }));

    socket.on('disconnect', () => {
      const sockets = connectedUsers.get(userId)?.filter(id => id !== socket.id) || [];
      if (sockets.length === 0) connectedUsers.delete(userId);
      else connectedUsers.set(userId, sockets);
      logger.info(`Socket disconnected: user ${userId}`);
    });
  });

  logger.info('Socket.IO initialized');
};

export const notifyUsers = (userIds: string[], event: string, data: unknown, broadcast = false): void => {
  if (!io) return;
  if (broadcast) {
    io.to('role:ENGINEER').to('role:ADMIN').to('role:SUPER_ADMIN').emit(event, data);
    return;
  }
  for (const userId of userIds) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToTicket = (ticketId: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(`ticket:${ticketId}`).emit(event, data);
};

export const getOnlineUsers = (): string[] => [...connectedUsers.keys()];
