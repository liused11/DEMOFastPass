import { Field, ObjectType, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class ParkingStatus {
  @Field(() => ID)
  lotId: string;

  @Field(() => ID)
  siteId: string;

  @Field(() => Int)
  availableSlots: number;

  @Field(() => Int)
  availableNormal: number;

  @Field(() => Int)
  availableEv: number;

  @Field(() => Int)
  availableMotorcycle: number;

  @Field(() => String)
  updatedAt: string;
}
