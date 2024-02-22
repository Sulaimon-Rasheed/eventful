import { Controller, Get, Post, Body, Patch, Param, Delete, Res, ValidationPipe, UseInterceptors, UploadedFile, Req, Put, UseGuards, Query } from '@nestjs/common';
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
import { UpdateEventDto } from 'src/events/dto/update-event.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { emailVerifyDto } from './dto/email-verify.dto';
import { newPasswordDto } from './dto/newPassword.dto';
// import { MailerService } from 'src/mailer/mailer.service';
// import { FlashMiddleware } from 'src/middlewares/flash.middleware';
// import { MiddlewareBuilder } from '@nestjs/core';

@Controller('creators')
@UseGuards(ThrottlerGuard)
export class CreatorsController {
  constructor(
    private readonly creatorsService: CreatorsService,
    private readonly eventsService:EventsService
    // private readonly mailService:MailerService,
    ) {}

  @Post("signup")
  @UseInterceptors(FileInterceptor("profileImage"))
  async createCreator(@UploadedFile() file:Express.Multer.File, @Body(new ValidationPipe) createCreatorDto: CreateCreatorDto, @Req() req:RequestWithFlash , @Res() res:Response) {
      // const result:object = await this.creatorsService.createCreator(createCreatorDto, file.path)
      // if(!result){
      //   req.flash('error', 'Signup failed! Please try again.')
      //   res.redirect('/creators/signup')
      // }else if(result){
      //   req.flash('info', 'Successful signup')
      //   res.redirect('/creators/signup')
      // }
      
      await this.creatorsService.createCreator(createCreatorDto, file.path, res)
   
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
    await this.creatorsService.verifyCreator(userId, uniqueString, res)
  }

  // Get login Page
  @Get('login')
  getLoginPage(@Res() res:Response) {
    return res.render(this.creatorsService.getLoginPage());
  }

  // To login creator
  @Post('login')
  async login(@Body(new ValidationPipe) LoginCreatorDto:LoginCreatorDto,@Res() res:Response) {
      await this.creatorsService.login(LoginCreatorDto, res)
  }

  @Get('passwordResetPage')
  getPasswordResetPagePage(@Res() res:Response) {
    this.creatorsService.getPasswordResetPagePage(res);
  }

  @Post('verifyEmailForPasswordReset')
  async verifyEmailForPasswordReset(@Body() emailVerifyDto:emailVerifyDto,@Req() req:Request, @Res() res:Response) {
    await this.creatorsService.verifyEmailForPasswordReset(emailVerifyDto, req, res)
  }

  @Get("/resetPassword/newPassword/:resetToken/:email")
  verifyUserPasswordResetLink(@Param("resetToken") resetToken:string, @Param("email") email:string, @Res() res:Response){
    this.creatorsService.verifyUserPasswordResetLink(resetToken,email, res)
  }

  @Post('/newPassword/:userId')
  async setNewPassword(@Body() newPasswordDto:newPasswordDto,@Param("userId") userId:string, @Req() req:Request, @Res() res:Response) {
    await this.creatorsService.setNewPassword(newPasswordDto, userId, res)
  }

  @Get('/creatorDashboard')
  async getDashboard(@Query("page") page:any , @Res() res:Response, @Req() req:Request) {
    await this.creatorsService.getDashboard(req, res, page || 0);
  }

  @Get('/event/filter')
  async filterEventByState(@Query("page") page:any , @Res() res:Response, @Req() req:Request) {
    await this.creatorsService.filterEventByState(req, res, page || 0);
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

  @Post("/setReminder/:eventId")
  async resetReminderDays(@Param("eventId") eventId:string, @Body(new ValidationPipe) UpdateEventDto:UpdateEventDto, @Req() req:Request, @Res() res:Response){
    await this.creatorsService.resetReminderDays(eventId, UpdateEventDto, req, res)
  }

  @Get("/logout")
  logOut(@Res() res:Response){
   res.clearCookie("jwt")
   res.redirect("/creators/login")
  }

}
