"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SupabaseRealtimeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseRealtimeService = void 0;
const common_1 = require("@nestjs/common");
const supabaseClient_1 = require("./supabaseClient");
const parking_service_1 = require("../../parking/parking.service");
let SupabaseRealtimeService = SupabaseRealtimeService_1 = class SupabaseRealtimeService {
    parkingService;
    logger = new common_1.Logger(SupabaseRealtimeService_1.name);
    constructor(parkingService) {
        this.parkingService = parkingService;
        console.log('SupabaseRealtimeService constructor');
    }
    onModuleInit() {
        this.logger.log('SupabaseRealtimeService initialized');
        this.listenParkingStatus();
    }
    async listenParkingStatus() {
        this.logger.log(' Listening Supabase Realtime: read_parking_status');
        supabaseClient_1.supabase
            .channel('parking-status-listener')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'read_parking_status',
        }, (payload) => {
            const status = payload.new;
            if (!status)
                return;
            const event = {
                siteId: status.site_id,
                lotId: status.lot_id,
                availableSlots: status.available_slots,
                availableNormal: status.available_normal,
                availableEv: status.available_ev,
                availableMotorcycle: status.available_motorcycle,
                updatedAt: new Date(status.updated_at),
            };
            this.logger.log(`ParkingStatus Update → site=${event.siteId} lot=${event.lotId} `);
            this.parkingService.handleReadModelUpdate(event);
        })
            .subscribe();
    }
};
exports.SupabaseRealtimeService = SupabaseRealtimeService;
exports.SupabaseRealtimeService = SupabaseRealtimeService = SupabaseRealtimeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [parking_service_1.ParkingService])
], SupabaseRealtimeService);
//# sourceMappingURL=supabase-realtime.service.js.map