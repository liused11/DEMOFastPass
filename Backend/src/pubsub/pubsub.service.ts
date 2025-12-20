import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class PubSubService {
  private pubsub = new PubSub();

  async publish(channel: string, payload: any) {
    await this.pubsub.publish(channel, payload);
  }

  async asyncIterator(channel: string) {
    return this.pubsub.asyncIterator(channel);
  }
}