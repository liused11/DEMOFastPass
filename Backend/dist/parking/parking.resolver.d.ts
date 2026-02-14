import { ParkingService } from './parking.service';
import { PubSubService } from '../pubsub/pubsub.service';
export declare class ParkingResolver {
    private readonly service;
    private readonly pubsub;
    constructor(service: ParkingService, pubsub: PubSubService);
    parkingByLocation(lat: number, lng: number): Promise<{
        parking_list: never[];
        reason: string;
        site?: undefined;
        parkingList?: undefined;
    } | {
        site: any;
        parkingList: {
            id: any;
            name: any;
            lat: any;
            lng: any;
            capacity: {
                normal: any;
                ev: any;
                motorcycle: any;
            };
            available: {
                normal: any;
                ev: any;
                motorcycle: any;
            };
            floor: any;
            price: any;
            priceUnit: string;
            allowedUserTypes: any;
            hasEVCharger: boolean;
            schedule: {
                days: string[];
                open_time: string;
                close_time: string;
                cron?: {
                    open: string;
                    close: string;
                } | undefined;
            }[];
        }[];
        parking_list?: undefined;
        reason?: undefined;
    }>;
    parkingStatusUpdated(siteId: string): Promise<AsyncIterator<unknown, any, any>>;
}
