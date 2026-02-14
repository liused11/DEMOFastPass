import { ParkingLot } from './parking-lot.entity';
import { ParkingSite } from './parking-site.entity';
export declare class ParkingByLocationResponse {
    site: ParkingSite;
    parkingList: ParkingLot[];
}
