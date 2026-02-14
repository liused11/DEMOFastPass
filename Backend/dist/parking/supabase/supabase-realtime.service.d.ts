import { OnModuleInit } from '@nestjs/common';
import { ParkingService } from '../../parking/parking.service';
export declare class SupabaseRealtimeService implements OnModuleInit {
    private readonly parkingService;
    private readonly logger;
    constructor(parkingService: ParkingService);
    onModuleInit(): void;
    listenParkingStatus(): Promise<void>;
}
