import { Field, ObjectType, ID, Float } from '@nestjs/graphql';

@ObjectType()
export class ParkingSite {
  @Field(() => ID)
  site_id: string;

  @Field()
  name: string;

  @Field()
  code: string;

  @Field(() => [String])
  geohash: string[];

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field()
  timezone: string;

  @Field()
  status: string;
  
  @Field()
  timezone_offset: string;
}