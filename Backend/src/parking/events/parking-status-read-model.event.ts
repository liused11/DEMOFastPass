export interface ParkingStatusReadModelUpdated {
  siteId: string;
  lotId: string;
  availableNormal: number;
  availableEv: number;
  availableMotorcycle: number;
  updatedDate: string;
  updateTimestamp: string;
}