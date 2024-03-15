import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheService } from './cache/cache.service';
import {Request, Response} from "express"
import {getModelToken} from "@nestjs/mongoose"
import { Provider } from '@nestjs/common';



describe('AppController', () => {
  let appController: AppController;
  let appService: AppService

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
        provide:getModelToken("Event"),
        useValue:{
          find: jest.fn().mockReturnThis(),
          populate:jest.fn().mockReturnThis(),
          sort:jest.fn().mockReturnThis(),
          limit:jest.fn().mockReturnThis(),
          exec:jest.fn().mockResolvedValue([])
        },
      },
      AppService,
      CacheService
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService)
  });

  describe('root', () => {
    it('should render the "Home Page"', async () => {
      const mockRequest = {} as Request
      const mockResponse = {render:jest.fn()} as unknown as Response
      await appController.getHome(mockRequest, mockResponse  )
      // expect(appController.getHome(mockRequest, mockResponse  )).toBe('text/html');
      expect(mockResponse.render).toHaveBeenCalledWith("index", {
        message:"Eventful", 
        events:[]
      })
    });
  });
});
