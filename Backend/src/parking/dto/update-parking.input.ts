import { CreateParkingInput } from './create-parking.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateParkingInput extends PartialType(CreateParkingInput) {
  @Field(() => Int)
  id: number;
}
