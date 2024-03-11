import { Controller, Get, Post, Body, Param, UseInterceptors, Res, UploadedFile, ValidationPipe, Req, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { EventeesService } from './eventees.service';
import { CreateEventeeDto } from './dto/create-eventee.dto';
import { FileInterceptor} from '@nestjs/platform-express';
import {Request, Response} from "express"
import { LoginEventeeDto } from './dto/login-eventee.dto';
import { UpdateEventeeDto } from './dto/update-eventee.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { emailVerificationDto } from './dto/emailVerification.dto';
import { newEpasswordDto } from './dto/newEpassword.dto';


@Controller('eventees')
@UseGuards(ThrottlerGuard)
export class EventeesController {
  constructor(private readonly eventeesService: EventeesService) {}

  @Post("signup")
  @UseInterceptors(FileInterceptor('profileImage'))
  
  async createEventee(@UploadedFile() file:any ,@Body(new ValidationPipe) createEventeeDto: CreateEventeeDto,@Req() req:Request, @Res() res:Response) {
      await this.eventeesService.createEventee(createEventeeDto, file.path,req, res)
  }

  @Get("signup")
  getSignUpPage(@Req() req:Request , @Res() res:Response) {
    this.eventeesService.getSignUpPage(req, res)
  }

  @Get("verify/:userId/:uniqueString")
  async verifyEventee(@Param("userId") userId:string, @Param("uniqueString") uniqueString:string, @Res() res:Response) {
    await this.eventeesService.verifyEventee(userId, uniqueString, res)
  }

  @Get('login')
  getLoginPage(@Res() res:Response) {
    return res.render(this.eventeesService.getLoginPage());
  }

   // To login eventee
   @Post('login')
   async login(@Body(new ValidationPipe) LoginEventeeDto:LoginEventeeDto,@Res() res:Response) {
     await this.eventeesService.login(LoginEventeeDto, res)
   }

   @Get('passwordResetPage')
  getPasswordResetPage(@Req() req:Request, @Res() res:Response) {
    this.eventeesService.getPasswordResetPage(req,res);
  }

  @Post('verifyEmailForPasswordReset')
  async verifyEmailForPasswordReset(@Body() emailVerifyDto:emailVerificationDto,@Req() req:Request, @Res() res:Response) {
    await this.eventeesService.verifyEmailForPasswordReset(emailVerifyDto, req, res)
  }

  @Get("/resetPassword/newPassword/:resetToken/:email")
  verifyUserPasswordResetLink(@Param("resetToken") resetToken:string, @Param("email") email:string, @Res() res:Response){
    this.eventeesService.verifyUserPasswordResetLink(resetToken,email, res)
  }

  @Post('/newPassword/:userId')
  async setNewPassword(@Body() newPasswordDto:newEpasswordDto,@Param("userId") userId:string, @Req() req:Request, @Res() res:Response) {
    await this.eventeesService.setNewPassword(newPasswordDto, userId, res)
  }
  
   @Get('/eventeeDashboard')
   async getDashboard(@Query("page") page:any , @Res() res:Response, @Req() req:Request) {
      await this.eventeesService.getDashboard(req, res, page || 0);
    }

    @Get('/event/filter')
   async filterEvent(@Query("category") category:string , @Res() res:Response, @Req() req:Request) {
      await this.eventeesService.filterEvent(req, res, category || "All");
    }

    @Get('/event/titleSearch')
   async searchForTitle(@Query("title") title:string , @Res() res:Response, @Req() req:Request) {
      await this.eventeesService.searchForTitle(req, res, title);
    }

    @Get('/buyTicket/:eventId/:price')
   async buyTicket(@Param("eventId") eventId:string, @Param("price" , ParseIntPipe) price:number, @Res() res:Response, @Req() req:Request) {
     await this.eventeesService.buyTicket(eventId, price, req, res)
    }


    @Post('/paystack/callback')
    async processPaystackCallBack(@Res() res:Response, @Req() req:Request) {
      await this.eventeesService.processPaystackCallBack(req, res)
     }

     @Get('/paystack/success')
    async getPaymentSuccessPage(@Res() res:Response) {
      await this.eventeesService.getPaymentSuccessPage(res) 
     }

     @Get('/boughtEvents')
    async getBoughtEventsPage(@Req() req:Request, @Res() res:Response) {
      await this.eventeesService. getBoughtEventsPage(req, res) 
     }

     @Get('/attendedEvents')
     async getAttendedEventsPage(@Req() req:Request, @Res() res:Response) {
       await this.eventeesService. getAttendedEventsPage(req, res) 
      }
 
     @Post("/setReminder/:eventId/:eventeeId")
     async resetReminderDays(@Param("eventId") eventId:string,@Param("eventeeId") eventeeId:string, @Body(new ValidationPipe) UpdateEventeetDto:UpdateEventeeDto, @Req() req:Request, @Res() res:Response){
       await this.eventeesService.resetReminderDays(eventId, eventeeId, UpdateEventeetDto, req, res)
     }

     @Get("/logout")
     async logOut(@Res() res:Response){
      await res.clearCookie("jwt")
      res.redirect("/eventees/login")
     }
}
