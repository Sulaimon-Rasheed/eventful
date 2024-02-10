import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Res, UseInterceptors, UploadedFile, ValidationPipe, Put, ParseIntPipe } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('/createEvent')
  async getEventCreationPage(@Req() req:Request, @Res() res:Response){
    return res.render(await this.eventsService.getEventCreationPage(req, res))
  }

  @Post('/createEvent')
  @UseInterceptors(FileInterceptor("event_image"))
  async createEvent(@UploadedFile() file:Express.Multer.File, @Body(new ValidationPipe) CreateEventDto:CreateEventDto, @Req() req:Request, @Res() res:Response){
    try{
    return res.render(await this.eventsService.createEvent(CreateEventDto, file.path, req, res))
  }catch(err){
    console.log(err)
    res.send(err.message)
  }
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

  @Get('/myCheckList')
  async getMyCheckList(@Req() req:Request, @Res() res:Response) {
    const result = await this.eventsService.getMyCheckList(req, res)
    return res.render("myCheckList", {lists:result[0], eventeeId:result[1]})
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
  //   return this.eventsService.update(+id, updateEventDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.eventsService.remove(+id);
  // }
}
