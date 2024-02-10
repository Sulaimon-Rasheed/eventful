import { Controller, Get, Post, Body, Param, UseInterceptors, Res, UploadedFile, ValidationPipe, Req, ParseIntPipe } from '@nestjs/common';
import { EventeesService } from './eventees.service';
import { CreateEventeeDto } from './dto/create-eventee.dto';
import { FileInterceptor} from '@nestjs/platform-express';
import {Request, Response} from "express"
import { LoginEventeeDto } from './dto/login-eventee.dto';


@Controller('eventees')
export class EventeesController {
  constructor(private readonly eventeesService: EventeesService) {}

  @Post("signup")
  @UseInterceptors(FileInterceptor('profileImage'))
  
  async createEventee(@UploadedFile() file:Express.Multer.File ,@Body(new ValidationPipe) createEventeeDto: CreateEventeeDto, @Res() res:Response) {
  try{
      return res.render( await this.eventeesService.createEventee(createEventeeDto, file.path), {message:"You are created successfully",createEventeeDto })
  }catch(err){   
    console.log(err.message)
  }
  }

  @Get("signup")
  getSignUpPage(@Res() res:Response) {
    return res.render(this.eventeesService.getSignUpPage()) 
  }

  @Get("verify/:userId/:uniqueString")
  async verifyEventee(@Param("userId") userId:string, @Param("uniqueString") uniqueString:string, @Res() res:Response) {
    return res.render(await this.eventeesService.verifyEventee(userId, uniqueString), {user:"eventee"});
  }

  @Get('login')
  getLoginPage(@Res() res:Response) {
    return res.render(this.eventeesService.getLoginPage());
  }

   // To login eventee
   @Post('login')
   async login(@Body(new ValidationPipe) LoginEventeeDto:LoginEventeeDto,@Res() res:Response) {
     return res.redirect(await this.eventeesService.login(LoginEventeeDto, res));
   }
  
   @Get('/eventeeDashboard')
   async getDashboard(@Res() res:Response, @Req() req:Request) {
    try{
      let postedEvents = await this.eventeesService.getDashboard(req, res);
      return res.render("eventeeDashboard", {user:res.locals.user, postedEvents})
      }catch(err){
        res.send(err.message)
      }
    }

    @Get('/buyTicket/:eventId/:price')
   async buyTicket(@Param("eventId") eventId:string, @Param("price" , ParseIntPipe) price:number, @Res() res:Response, @Req() req:Request) {
    try{
     const response = await this.eventeesService.buyTicket(eventId, price, req, res)
     return res.redirect(response.data.data.authorization_url)
      }catch(err){
        res.send(err.message)
      }
    }


    @Post('/paystack/callback')
    async processPaystackCallBack(@Res() res:Response, @Req() req:Request) {
     try{
      const message:string = await this.eventeesService.processPaystackCallBack(req, res)
      return res.send(message)
       }catch(err){
         res.send(err.message)
       }
     }

     @Get('/paystack/success')
    async getPaymentSuccessPage(@Res() res:Response) {
     try{
      return res.render(await this.eventeesService.getPaymentSuccessPage()) 
       }catch(err){
         res.send(err.message)
       }
     }
 
  
}
