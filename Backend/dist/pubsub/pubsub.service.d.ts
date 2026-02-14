export declare class PubSubService {
    private pubsub;
    publish(channel: string, payload: any): Promise<void>;
    asyncIterator(channel: string): Promise<AsyncIterator<unknown, any, any>>;
}
