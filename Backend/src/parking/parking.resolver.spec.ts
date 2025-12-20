import { Test, TestingModule } from '@nestjs/testing';
import { ParkingResolver } from './parking.resolver';
import { ParkingService } from './parking.service';

describe('ParkingResolver', () => {
  let resolver: ParkingResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParkingResolver, ParkingService],
    }).compile();

    resolver = module.get<ParkingResolver>(ParkingResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
