"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParkingService = void 0;
const common_1 = require("@nestjs/common");
const supabaseClient_1 = require("./supabase/supabaseClient");
const geohash = __importStar(require("ngeohash"));
const pubsub_service_1 = require("../pubsub/pubsub.service");
let ParkingService = class ParkingService {
    pubsub;
    constructor(pubsub) {
        this.pubsub = pubsub;
    }
    async getCurrentSite(lat, lng) {
        const gh = geohash.encode(lat, lng);
        const prefix = gh.substring(0, 5);
        const { data, error } = await supabaseClient_1.supabase
            .from('read_parking_site')
            .select('*')
            .contains('geohash', [prefix])
            .single();
        if (error)
            return null;
        return data;
    }
    async getParkingBySiteId(siteId) {
        const [lotsResult, statusResult, scheduleResult] = await Promise.all([
            supabaseClient_1.supabase.from('read_parking_lot')
                .select('*')
                .eq('site_id', siteId),
            supabaseClient_1.supabase.from('read_parking_status')
                .select(`lot_id, available_normal, available_ev, available_motorcycle`)
                .eq('site_id', siteId),
            supabaseClient_1.supabase.from('read_parking_schedule')
                .select(`lot_id, schedule`)
                .eq('site_id', siteId)
                .returns(),
        ]);
        if (lotsResult.error)
            throw new Error(lotsResult.error.message);
        if (statusResult.error)
            throw new Error(statusResult.error.message);
        if (scheduleResult.error)
            throw new Error(scheduleResult.error.message);
        const statusMap = new Map((statusResult.data || []).map(s => [s.lot_id, s]));
        const scheduleMap = new Map();
        (scheduleResult.data || []).forEach(row => {
            scheduleMap.set(row.lot_id, row.schedule ?? []);
        });
        return lotsResult.data.map(lot => {
            const status = statusMap.get(lot.lot_id);
            const supportedVehicles = lot.supported_vehicles ?? [];
            const capacity = {
                normal: supportedVehicles.includes('car') ? lot.total_capacity : 0,
                ev: supportedVehicles.includes('ev') ? lot.total_capacity : 0,
                motorcycle: supportedVehicles.includes('motorcycle') ? lot.total_capacity : 0,
            };
            const available = {
                normal: supportedVehicles.includes('car') ? status?.available_normal ?? 0 : 0,
                ev: supportedVehicles.includes('ev') ? status?.available_ev ?? 0 : 0,
                motorcycle: supportedVehicles.includes('motorcycle') ? status?.available_motorcycle ?? 0 : 0,
            };
            return {
                id: lot.lot_id,
                name: lot.name,
                lat: lot.latitude,
                lng: lot.longitude,
                capacity,
                available,
                floor: lot.floor ?? [],
                price: lot.price ?? 0,
                priceUnit: lot.price_unit === 'flat'
                    ? 'เหมาจ่าย'
                    : lot.price_unit === 'hour'
                        ? 'ต่อชม.'
                        : 'ฟรี',
                allowedUserTypes: lot.supported_roles ?? [],
                hasEVCharger: supportedVehicles.includes('ev'),
                schedule: scheduleMap.get(lot.lot_id) || [],
            };
        });
    }
    async getParkingByLocation(lat, lng) {
        const site = await this.resolveSiteFromLocation(lat, lng);
        if (!site) {
            return {
                parking_list: [],
                reason: 'SITE_NOT_FOUND',
            };
        }
        const parkingList = await this.getParkingBySiteId(site.site_id);
        return {
            site,
            parkingList,
        };
    }
    async resolveSiteFromLocation(lat, lng) {
        const gh = geohash.encode(lat, lng);
        const prefix = gh.slice(0, 5);
        const { data: sites, error } = await supabaseClient_1.supabase
            .from('read_parking_site')
            .select('*')
            .contains('geohash', [prefix]);
        if (error || !sites?.length)
            return null;
        if (sites.length === 1)
            return sites[0];
        return sites.find(site => this.isPointInsideBoundingBox(lat, lng, site));
    }
    isPointInsideBoundingBox(lat, lng, site) {
        return (lat >= site.lat_min &&
            lat <= site.lat_max &&
            lng >= site.lng_min &&
            lng <= site.lng_max);
    }
    handleReadModelUpdate(event) {
        console.log('HANDLE READ MODEL EVENT', event);
        return this.pubsub.publish(`parkingStatusUpdated.${event.siteId}`, {
            parkingStatusUpdated: event,
        });
    }
};
exports.ParkingService = ParkingService;
exports.ParkingService = ParkingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pubsub_service_1.PubSubService])
], ParkingService);
//# sourceMappingURL=parking.service.js.map