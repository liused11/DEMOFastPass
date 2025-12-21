export interface ParkingStatusReadModelUpdated {
  siteId: string;
  lotId: string;
  availableSlots: number;
  availableNormal: number;
  availableEv: number;
  availableMotorcycle: number;
  updatedAt: Date;
}