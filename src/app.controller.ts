import { Controller, Get, Render, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import {Request, Response} from "express"


@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  // @Render("index")
  async getHome(@Req() req:Request, @Res() res:Response){
    await this.appService.getHome(req, res)
      // return {message:'Eventful'}
  }
}
