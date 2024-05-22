import { Controller, Get, Post, Body, Patch, Param, Delete, Res, ValidationPipe, UseInterceptors, UploadedFile, Req, Put, UseGuards, Query } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import {Response, Request} from "express"
import { FileInterceptor } from '@nestjs/platform-express';
import { LoginCreatorDto } from './dto/login-creator.dto';
import { CreateEventDto } from 'src/events/dto/create-event.dto';
import { EventsService } from 'src/events/events.service';
import {Event} from "../events/events.model"
import { UpdateEventDto } from 'src/events/dto/update-event.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { emailVerifyDto } from './dto/email-verify.dto';
import { newPasswordDto } from './dto/newPassword.dto';
import { debitDto } from './dto/debit.dto';
import { multerConfig } from '../config/multer.config';


@Controller('creators')
@UseGuards(ThrottlerGuard)
export class CreatorsController {
  constructor(
    private readonly creatorsService: CreatorsService,
    ) {}

  @Post("signup")
  @UseInterceptors(FileInterceptor("profileImage", multerConfig))
  async createCreator(@UploadedFile() profileImage:Express.Multer.File, @Body() createCreatorDto: CreateCreatorDto, @Req() req:Request, @Res() res:Response) {
      await this.creatorsService.createCreator(createCreatorDto, profileImage ,req, res)
  }

  @Get("signup")
  getSignupPage(@Req() req:Request, @Res() res:Response, ){
    this.creatorsService.getSignupPage(req,res)
  }

  // Verify email verification link
  @Get('verify/:userId/:uniqueString')
  async verifyCreator(@Param('userId') userId: string, @Param("uniqueString") uniqueString:string, @Res() res:Response) {
    await this.creatorsService.verifyCreator(userId, uniqueString, res)
  }

  // Get creators home page
  @Get("/creatorHomePage")
  async getCreatorHomePage(@Req() req:Request, @Res() res:Response){
  await this.creatorsService.getCreatorHomePage(req, res)
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
  getPasswordResetPage(@Req() req:Request, @Res() res:Response) {
    this.creatorsService.getPasswordResetPage(req, res);
  }

  @Post('verifyEmailForPasswordReset')
  async verifyEmailForPasswordReset(@Body() emailVerifyDto:emailVerifyDto,@Req() req:Request, @Res() res:Response) {
    await this.creatorsService.verifyEmailForPasswordReset(emailVerifyDto, req, res)
  }

  @Get("/resetPassword/newPassword/:resetToken/:email")
  verifyUserPasswordResetLink(@Param("resetToken") resetToken:string, @Param("email") email:string, @Res() res:Response){
    this.creatorsService.verifyUserPasswordResetLink(resetToken, email,res)
  }

  @Post('/newPassword/:userId')
  async setNewPassword(@Body() newPasswordDto:newPasswordDto,@Param("userId") userId:string, @Req() req:Request, @Res() res:Response) {
    await this.creatorsService.setNewPassword(newPasswordDto, userId, req, res)
  }

  @Get('/creatorDashboard')
  async getDashboard(@Query("page") page:any , @Res() res:Response, @Req() req:Request) {
    await this.creatorsService.getDashboard(req, res, page || 0);
  }

  
  @Get('/myWallet')
  async openWallet(@Res() res:Response, @Req() req:Request) {
    await this.creatorsService.openWallet(req, res);
  }

  @Post('/withdrawFund/:walletId')
  async debitWallet(@Body() debitDto:debitDto, @Param("walletId") walletId:string,  @Req() req:Request, @Res() res:Response) {
    await this.creatorsService.debitWallet(debitDto, walletId, req, res, );
  }

  @Get('/event/filter')
  async filterEventByState(@Query("page") page:any , @Res() res:Response, @Req() req:Request) {
    await this.creatorsService.filterEventByState(req, res, page || 0);
  }

  @Get('/getUnticketedEventees/:eventId')
  async getUnticketedEventees(@Param("eventId") eventId:string,  @Res() res:Response, @Req() req:Request) {
    await this.creatorsService.getUnticketedEventees(eventId, req, res); 
  }

  @Get('/getTicketedEventees/:eventId')
  async getTicketedEventees(@Param("eventId") eventId:string,  @Res() res:Response, @Req() req:Request) {
    await this.creatorsService.getTicketedEventees(eventId, req, res);
  }

  @Get('/getScannedEventees/:eventId')
  async getScannedEventees(@Param("eventId") eventId:string,  @Res() res:Response, @Req() req:Request) {
    await this.creatorsService.getScannedEventees(eventId, req, res);
  }

  @Get('/allTicketedEventees')
  async getAllTicketedEventees(@Res() res:Response, @Req() req:Request) {
    await this.creatorsService.getAllTicketedEventees(req, res);
  }

  @Get('/allScannedEventees')
  async getAllScannedEventees(@Res() res:Response, @Req() req:Request) {
    await this.creatorsService.getAllScannedEventees(req, res);
  }

  @Post("/setReminder/:eventId")
  async resetReminderDays(@Param("eventId") eventId:string, @Body(new ValidationPipe) UpdateEventDto:UpdateEventDto, @Req() req:Request, @Res() res:Response){
    await this.creatorsService.resetReminderDays(eventId, UpdateEventDto, req, res)
  }

  @Get("/scanner")
    async getScanner(@Req() req:Request, @Res() res:Response){
    await this.creatorsService.getScanner(req, res)
  }

  @Post("/getScanningResult")
  async getScanningResult(@Query("result") encodedResult: string, @Req() req:Request, @Res() res:Response){
  await this.creatorsService.getScanningResult(encodedResult, req, res)
}

  @Get("/logout")
  logOut(@Res() res:Response){
   res.clearCookie("jwt")
   res.redirect("/creators/login")
  }

}
