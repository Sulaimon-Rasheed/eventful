import { Controller, Get, Post, Body, Patch, Param, Delete, Res, ValidationPipe, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import {Response, Request} from "express"
import { FileInterceptor } from '@nestjs/platform-express';
import RequestWithFlash from "../requestWithFlash"
import { LoginCreatorDto } from './dto/login-creator.dto';
import { CreateEventDto } from 'src/events/dto/create-event.dto';
import { EventsService } from 'src/events/events.service';
import {Event} from "../events/events.model"
// import { MailerService } from 'src/mailer/mailer.service';
// import { FlashMiddleware } from 'src/middlewares/flash.middleware';
// import { MiddlewareBuilder } from '@nestjs/core';

@Controller('creators')
export class CreatorsController {
  constructor(
    private readonly creatorsService: CreatorsService,
    private readonly eventsService:EventsService
    // private readonly mailService:MailerService,
    ) {}

  @Post("signup")
  @UseInterceptors(FileInterceptor("profileImage"))
  async createCreator(@UploadedFile() file:Express.Multer.File, @Body(new ValidationPipe) createCreatorDto: CreateCreatorDto, @Req() req:RequestWithFlash , @Res() res:Response) {
    try{
      // const result:object = await this.creatorsService.createCreator(createCreatorDto, file.path)
      // if(!result){
      //   req.flash('error', 'Signup failed! Please try again.')
      //   res.redirect('/creators/signup')
      // }else if(result){
      //   req.flash('info', 'Successful signup')
      //   res.redirect('/creators/signup')
      // }
      
      return res.render( await this.creatorsService.createCreator(createCreatorDto, file.path), {message:"You are created successfully", createCreatorDto})  
      
    }catch(err){
      
      console.log(err.message)
    }
   
  }

  @Get("signup")
  getSignupPage(@Res() res:Response, @Req() req:RequestWithFlash){
    // const message = req.flash("info", "Successful signup")
    // const error = req.flash("error", "Signup failed! Please try again.")
    // const error:string = req.flash("error")
    return res.render(this.creatorsService.getSignupPage())
  }

  // Verify email verification link
  @Get('verify/:userId/:uniqueString')
  async verifyCreator(@Param('userId') userId: string, @Param("uniqueString") uniqueString:string, @Res() res:Response) {
    return res.render(await this.creatorsService.verifyCreator(userId, uniqueString), {user:"creator"});
  }

  // Get login Page
  @Get('login')
  getLoginPage(@Res() res:Response) {
    return res.render(this.creatorsService.getLoginPage());
  }

  // To login creator
  @Post('login')
  async login(@Body(new ValidationPipe) LoginCreatorDto:LoginCreatorDto,@Res() res:Response) {
    try{
      const result = await this.creatorsService.login(LoginCreatorDto, res)
      res.cookie("jwt", result.token, { maxAge: 60 * 60 * 1000 })
      return res.redirect(`/creators/creatorDashboard`);
  }catch(err){
    res.send(err.message)
  }
  }

  @Get('/creatorDashboard')
  async getDashboard(@Res() res:Response, @Req() req:Request) {
    try{
    let events = await this.creatorsService.getDashboard(req, res);
    return res.render("creatorDashboard", {user:res.locals.user, events})
  }catch(err){
    res.send(err.message)
  }
  }

  @Get('/getUnticketedEventees/:eventId')
  async getUnticketedEventees(@Param("eventId") eventId:string,  @Res() res:Response, @Req() req:Request) {
    try{
    let result = await this.creatorsService.getUnticketedEventees(eventId, req, res);
    return res.render("unticketedEventees", {unticketedEventees:result[0],count:result[1]})
  }catch(err){
    res.send(err.message)
  }
  }

  @Get('/getTicketedEventees/:eventId')
  async getTicketedEventees(@Param("eventId") eventId:string,  @Res() res:Response, @Req() req:Request) {
    try{
    let result = await this.creatorsService.getTicketedEventees(eventId, req, res);
    return res.render("ticketedEventees", {ticketedEventees:result[0],count:result[1]})
  }catch(err){
    res.send(err.message)
  }
  }

}
