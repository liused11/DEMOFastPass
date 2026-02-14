import { PubSubService } from '../pubsub/pubsub.service';
import { ParkingStatusReadModelUpdated } from './events/parking-status-read-model.event';
export declare class ParkingService {
    private readonly pubsub;
    constructor(pubsub: PubSubService);
    getCurrentSite(lat: number, lng: number): Promise<any>;
    getParkingBySiteId(siteId: string): Promise<{
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
            };
        }[];
    }[]>;
    getParkingByLocation(lat: number, lng: number): Promise<{
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
                };
            }[];
        }[];
        parking_list?: undefined;
        reason?: undefined;
    }>;
    resolveSiteFromLocation(lat: number, lng: number): Promise<any>;
    private isPointInsideBoundingBox;
    handleReadModelUpdate(event: ParkingStatusReadModelUpdated): Promise<void>;
}
