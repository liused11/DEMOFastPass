// parking-by-location.response.ts
import { ObjectType, Field } from '@nestjs/graphql';
import { ParkingLot } from './parking-lot.entity';
import { ParkingSite } from './parking-site.entity';

@ObjectType()
export class ParkingByLocationResponse {
  @Field(() => ParkingSite)
  site: ParkingSite;

  @Field(() => [ParkingLot])
  parkingList: ParkingLot[];
}