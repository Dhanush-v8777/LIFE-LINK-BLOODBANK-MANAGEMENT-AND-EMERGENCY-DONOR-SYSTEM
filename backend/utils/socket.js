let io;

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected to socket:', socket.id);
      
      // Room for specific user notifications
      socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Socket ${socket.id} joined user room: user_${userId}`);
      });

      // Room for specific role notifications (e.g. Hospital, Staff)
      socket.on('join_role', (roleName) => {
        socket.join(`role_${roleName}`);
        console.log(`Socket ${socket.id} joined role room: role_${roleName}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected from socket:', socket.id);
      });
    });

    return io;
  },
  getIO: () => {
    return io;
  },
  sendNotification: (userId, data) => {
    if (io) {
      io.to(`user_${userId}`).emit('notification', data);
    }
  },
  sendToRole: (roleName, event, data) => {
    if (io) {
      io.to(`role_${roleName}`).emit(event, data);
    }
  },
  broadcast: (event, data) => {
    if (io) {
      io.emit(event, data);
    }
  }
};
