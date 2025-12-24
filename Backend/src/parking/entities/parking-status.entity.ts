import { Field, ObjectType, ID, Int } from '@nestjs/graphql';
import { GraphQLBigInt } from 'graphql-scalars';

@ObjectType()
export class ParkingStatus {
  @Field(() => ID)
  lotId: string;

  @Field(() => ID)
  siteId: string;

  @Field(() => Int)
  availableNormal: number;

  @Field(() => Int)
  availableEv: number;

  @Field(() => Int)
  availableMotorcycle: number;

  @Field(() => String)
  updatedDate: string;

  @Field(() => String)
  updateTimestamp: string;
}
