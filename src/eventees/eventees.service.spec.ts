import { Test, TestingModule } from '@nestjs/testing';
import { EventeesService } from './eventees.service';

describe('EventeesService', () => {
  let service: EventeesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventeesService],
    }).compile();

    service = module.get<EventeesService>(EventeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
