import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WebRTCMessage {
  type: 'join-room' | 'offer' | 'answer' | 'ice-candidate' | 'leave-room';
  roomId?: string;
  data?: any;
  userId?: string;
}

interface RoomParticipant {
  userId: string;
  socket: WebSocket;
  metadata?: any;
}

class WebRTCSignalingServer {
  private wss: WebSocketServer;
  private rooms: Map<string, Map<string, RoomParticipant>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: false 
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(socket: WebSocket) {
    console.log('New WebSocket connection established');

    socket.on('message', (data: Buffer) => {
      try {
        const message: WebRTCMessage = JSON.parse(data.toString());
        this.handleMessage(socket, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.sendError(socket, 'Invalid message format');
      }
    });

    socket.on('close', () => {
      this.handleDisconnection(socket);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleMessage(socket: WebSocket, message: WebRTCMessage) {
    switch (message.type) {
      case 'join-room':
        this.handleJoinRoom(socket, message);
        break;
      case 'offer':
        this.handleOffer(socket, message);
        break;
      case 'answer':
        this.handleAnswer(socket, message);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(socket, message);
        break;
      case 'leave-room':
        this.handleLeaveRoom(socket, message);
        break;
      default:
        this.sendError(socket, `Unknown message type: ${message.type}`);
    }
  }

  private handleJoinRoom(socket: WebSocket, message: WebRTCMessage) {
    const { roomId, userId } = message;
    
    if (!roomId || !userId) {
      this.sendError(socket, 'Room ID and User ID are required');
      return;
    }

    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }

    const room = this.rooms.get(roomId)!;
    
    // Add participant to room
    const participant: RoomParticipant = {
      userId,
      socket,
      metadata: message.data || {}
    };
    
    room.set(userId, participant);

    // Notify other participants
    this.broadcastToRoom(roomId, {
      type: 'user-joined',
      userId,
      data: { participantCount: room.size }
    }, [userId]);

    // Send confirmation to joining user
    this.sendToUser(socket, {
      type: 'joined-room',
      roomId,
      data: { 
        participantCount: room.size,
        participants: Array.from(room.keys()).filter(id => id !== userId)
      }
    });

    console.log(`User ${userId} joined room ${roomId}. Room size: ${room.size}`);
  }

  private handleOffer(socket: WebSocket, message: WebRTCMessage) {
    const { roomId, data } = message;
    
    if (!roomId) {
      this.sendError(socket, 'Room ID is required');
      return;
    }

    this.broadcastToRoom(roomId, {
      type: 'offer',
      data
    }, [this.getUserIdBySocket(socket)]);
  }

  private handleAnswer(socket: WebSocket, message: WebRTCMessage) {
    const { roomId, data } = message;
    
    if (!roomId) {
      this.sendError(socket, 'Room ID is required');
      return;
    }

    this.broadcastToRoom(roomId, {
      type: 'answer',
      data
    }, [this.getUserIdBySocket(socket)]);
  }

  private handleIceCandidate(socket: WebSocket, message: WebRTCMessage) {
    const { roomId, data } = message;
    
    if (!roomId) {
      this.sendError(socket, 'Room ID is required');
      return;
    }

    this.broadcastToRoom(roomId, {
      type: 'ice-candidate',
      data
    }, [this.getUserIdBySocket(socket)]);
  }

  private handleLeaveRoom(socket: WebSocket, message: WebRTCMessage) {
    const { roomId, userId } = message;
    this.removeUserFromRoom(roomId, userId || this.getUserIdBySocket(socket), socket);
  }

  private handleDisconnection(socket: WebSocket) {
    // Find and remove user from all rooms
    for (const [roomId, room] of Array.from(this.rooms.entries())) {
      for (const [userId, participant] of Array.from(room.entries())) {
        if (participant.socket === socket) {
          this.removeUserFromRoom(roomId, userId, socket);
          break;
        }
      }
    }
  }

  private removeUserFromRoom(roomId: string | undefined, userId: string, socket: WebSocket) {
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.delete(userId);

    // Notify other participants
    this.broadcastToRoom(roomId, {
      type: 'user-left',
      userId,
      data: { participantCount: room.size }
    }, [userId]);

    // Clean up empty rooms
    if (room.size === 0) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    }

    console.log(`User ${userId} left room ${roomId}. Room size: ${room.size}`);
  }

  private broadcastToRoom(roomId: string, message: any, excludeUserIds: string[] = []) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const [userId, participant] of Array.from(room.entries())) {
      if (!excludeUserIds.includes(userId) && participant.socket.readyState === WebSocket.OPEN) {
        participant.socket.send(JSON.stringify(message));
      }
    }
  }

  private sendToUser(socket: WebSocket, message: any) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private sendError(socket: WebSocket, error: string) {
    this.sendToUser(socket, {
      type: 'error',
      data: { message: error }
    });
  }

  private getUserIdBySocket(socket: WebSocket): string {
    for (const room of Array.from(this.rooms.values())) {
      for (const [userId, participant] of Array.from(room.entries())) {
        if (participant.socket === socket) {
          return userId;
        }
      }
    }
    return '';
  }

  public getRoomInfo(roomId: string) {
    const room = this.rooms.get(roomId);
    return {
      exists: !!room,
      participantCount: room?.size || 0,
      participants: room ? Array.from(room.keys()) : []
    };
  }
}

export function setupWebRTCSignaling(server: Server): WebRTCSignalingServer {
  return new WebRTCSignalingServer(server);
}
