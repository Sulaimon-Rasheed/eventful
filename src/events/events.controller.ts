import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Res, UseInterceptors, UploadedFile, ValidationPipe, Put, ParseIntPipe, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as cron from "node-cron"
import { ThrottlerGuard } from '@nestjs/throttler';
import { multerConfig } from '../config/multer.config';
@Controller('events')
@UseGuards(ThrottlerGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('/createEvent')
  async getEventCreationPage(@Req() req:Request, @Res() res:Response){
    await this.eventsService.getEventCreationPage(req, res)
  }

  @Post('/createEvent')
  @UseInterceptors(FileInterceptor("event_image", multerConfig))
  async createEvent(@UploadedFile() event_image:Express.Multer.File, @Body(new ValidationPipe) CreateEventDto:CreateEventDto, @Req() req:Request, @Res() res:Response){
    await this.eventsService.createEvent(CreateEventDto, event_image, req, res)
  }

  
  @Post("/postEvent/:id")
  async postEvent(@Param("id") id:string,@Req() req:Request, @Res() res:Response) {
   await this.eventsService.postEvent(id, req, res);
  }

  @Post("/chooseEvent/:eventId")
  async chooseEvent(@Param("eventId") eventId:string, @Req() req:Request, @Res() res:Response ) {
    await this.eventsService.chooseEvent(eventId,req, res);
  }

  @Post("/removeEvent/:eventId")
  async removeEvent(@Param("eventId") eventId:string, @Req() req:Request, @Res() res:Response ) {
    await this.eventsService.removeEvent(eventId,req, res);
  }


  @Get('/eventUpdatePage/:eventId')
  async getEventUpdatePage(@Param("eventId") eventId:string, @Req() req:Request, @Res() res:Response){
    await this.eventsService.getEventUpdatePage(req, res, eventId)
  }

  @Post('/updateEvent/:eventId')
  async updateEvent(@Param("eventId") eventId:string, @Req() req:Request, @Res() res:Response, @Body(new ValidationPipe) UpdateEventDto:UpdateEventDto){
    await this.eventsService.updateEvent(req, res, eventId, UpdateEventDto)
  }

  @Post('/deleteEvent/:eventId')
  async deleteEvent(@Param("eventId") eventId:string, @Req() req:Request, @Res() res:Response){
    await this.eventsService.deleteEvent(req, res, eventId)
  }

  @Get('/myCheckList')
  async getMyCheckList(@Req() req:Request, @Res() res:Response) {
    await this.eventsService.getMyCheckList(req, res)
  }

  @Get('thisEvent/share/:eventId')
  async getThisEvent(@Param('eventId') eventId: string,@Res() res:Response ) {
    await this.eventsService.getThisEvent(eventId, res);
  }

  @Post('changePrice/:eventId')
  async changePrice(@Param('eventId') eventId: string, @Req() req:Request,@Res() res:Response,@Body(new ValidationPipe) UpdateEventDto:UpdateEventDto ) {
    await this.eventsService.changePrice(eventId, req, res, UpdateEventDto);
  }

}
