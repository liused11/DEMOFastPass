import { Resolver, Query, Args, Subscription, Float } from '@nestjs/graphql';
import { ParkingService } from './parking.service';
import { ParkingLot } from './entities/parking-lot.entity';
import { ParkingStatus } from './entities/parking-status.entity';
import { ParkingSite } from './entities/parking-site.entity';
import { PubSubService } from '../pubsub/pubsub.service';
import { ParkingByLocationResponse } from './entities/parking-by-location.response'

@Resolver()
export class ParkingResolver {
  constructor(
    private readonly service: ParkingService,
    private readonly pubsub: PubSubService,
  ) {}

  // -------------------------------
  // Query: หา site จากตำแหน่งผู้ใช้
  // -------------------------------
  @Query(() => ParkingByLocationResponse)
  parkingByLocation(
    @Args('lat', { type: () => Float }) lat: number,
    @Args('lng', { type: () => Float }) lng: number,
  ) {
    return this.service.getParkingByLocation(lat, lng);
  }


  // -------------------------------
  // Subscription: Realtime update
  // -------------------------------
  @Subscription(() => ParkingStatus, {
    resolve: (payload) => payload.parkingStatusUpdated,
    filter: (payload, variables) =>
      payload.parkingStatusUpdated.siteId  === variables.siteId,
  })
  parkingStatusUpdated(@Args('siteId') siteId: string) {
    return this.pubsub.asyncIterator(`parkingStatusUpdated.${siteId}`);
  }
}