import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateParkingInput {
  @Field()
  siteId: string;

  @Field()
  lotName: string;

  @Field(() => Float)
  lat: number;

  @Field(() => Float)
  lng: number;

  @Field({ nullable: true })
  lotType?: string;
}