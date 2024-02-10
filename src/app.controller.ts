import { Controller, Get, Render, Res } from '@nestjs/common';
import { AppService } from './app.service';
import {Response} from "express"


@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render("index")
  getHome(){
      return {message:'Welcome to Eventful.'}
  }

  // @Get("*")
  // getPageNotFound(@Res() res:Response){
  //   return res.render(this.appService.getError(), {error:"Page not found"})
  // }
}
