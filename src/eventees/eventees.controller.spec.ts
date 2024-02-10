import { Test, TestingModule } from '@nestjs/testing';
import { EventeesController } from './eventees.controller';
import { EventeesService } from './eventees.service';

describe('EventeesController', () => {
  let controller: EventeesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventeesController],
      providers: [EventeesService],
    }).compile();

    controller = module.get<EventeesController>(EventeesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
