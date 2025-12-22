
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { FinnhubService } from '../market-data/finnhub.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly finnhub: FinnhubService) {
    // Listen to all trades from Finnhub service and broadcast to corresponding rooms
    this.finnhub.on('trade', (trade: any) => {
      // trade.s is the symbol
      if (this.server) {
        this.server.to(trade.s).emit('trade', { symbol: trade.s, data: trade });
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToSymbol')
  handleSubscribeToSymbol(
    @MessageBody() symbol: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} subscribing to ${symbol}`);
    client.join(symbol);
    this.finnhub.subscribe(symbol);
    return { event: 'subscribed', data: symbol };
  }

  @SubscribeMessage('unsubscribeFromSymbol')
  handleUnsubscribeFromSymbol(
    @MessageBody() symbol: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} unsubscribing from ${symbol}`);
    client.leave(symbol);
    // We don't unsubscribe from Finnhub immediately to avoid thrashing if other clients are listening
    return { event: 'unsubscribed', data: symbol };
  }
}
