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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParkingStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
let ParkingStatus = class ParkingStatus {
    lotId;
    siteId;
    availableSlots;
    availableNormal;
    availableEv;
    availableMotorcycle;
    updatedAt;
};
exports.ParkingStatus = ParkingStatus;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], ParkingStatus.prototype, "lotId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], ParkingStatus.prototype, "siteId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ParkingStatus.prototype, "availableSlots", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ParkingStatus.prototype, "availableNormal", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ParkingStatus.prototype, "availableEv", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ParkingStatus.prototype, "availableMotorcycle", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], ParkingStatus.prototype, "updatedAt", void 0);
exports.ParkingStatus = ParkingStatus = __decorate([
    (0, graphql_1.ObjectType)()
], ParkingStatus);
//# sourceMappingURL=parking-status.entity.js.map