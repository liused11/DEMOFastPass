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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParkingResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const parking_service_1 = require("./parking.service");
const parking_status_entity_1 = require("./entities/parking-status.entity");
const pubsub_service_1 = require("../pubsub/pubsub.service");
const parking_by_location_response_1 = require("./entities/parking-by-location.response");
let ParkingResolver = class ParkingResolver {
    service;
    pubsub;
    constructor(service, pubsub) {
        this.service = service;
        this.pubsub = pubsub;
    }
    parkingByLocation(lat, lng) {
        return this.service.getParkingByLocation(lat, lng);
    }
    parkingStatusUpdated(siteId) {
        return this.pubsub.asyncIterator(`parkingStatusUpdated.${siteId}`);
    }
};
exports.ParkingResolver = ParkingResolver;
__decorate([
    (0, graphql_1.Query)(() => parking_by_location_response_1.ParkingByLocationResponse),
    __param(0, (0, graphql_1.Args)('lat', { type: () => graphql_1.Float })),
    __param(1, (0, graphql_1.Args)('lng', { type: () => graphql_1.Float })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], ParkingResolver.prototype, "parkingByLocation", null);
__decorate([
    (0, graphql_1.Subscription)(() => parking_status_entity_1.ParkingStatus, {
        resolve: (payload) => payload.parkingStatusUpdated,
        filter: (payload, variables) => payload.parkingStatusUpdated.siteId === variables.siteId,
    }),
    __param(0, (0, graphql_1.Args)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ParkingResolver.prototype, "parkingStatusUpdated", null);
exports.ParkingResolver = ParkingResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [parking_service_1.ParkingService,
        pubsub_service_1.PubSubService])
], ParkingResolver);
//# sourceMappingURL=parking.resolver.js.map