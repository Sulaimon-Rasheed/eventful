import { Body, Controller, Get, Param, Post, Req, Res, UploadedFile, UseInterceptors, ValidationPipe } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Request, Response } from 'express';
import { LoginAdminDto } from './dto/login-admin.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/config/multer.config';
import { EmailAuthDto } from './dto/emailAuth.dto';

@Controller('admins')
export class AdminsController {
  constructor(
    private readonly adminsService: AdminsService,
    ) {}

  @Get("signup")
  getSignUpPage(@Req() req:Request, @Res() res:Response){
    this.adminsService.getSignUpPage(req,res)
  }

  @Post("signup")
  @UseInterceptors(FileInterceptor("profileImage", multerConfig))
  async createAdmin(@UploadedFile() profileImage:Express.Multer.File, @Body() createAdminDto:CreateAdminDto, @Req() req:Request, @Res()res:Response){
    await this.adminsService.createAdmin(profileImage,createAdminDto,req,res)
  }

  @Get("verify/:userId/:uniqueString")
  async verifyAdmin(@Param("userId") userId:string, @Param("uniqueString") uniqueString:string, @Res() res:Response) {
    await this.adminsService.verifyAdmin(userId, uniqueString, res)
  }

  @Get('login')
  getLoginPage(@Res() res:Response) {
    return res.render(this.adminsService.getLoginPage());
  }

  @Post('login')
   async login(@Body(new ValidationPipe) LoginAdminDto:LoginAdminDto,@Res() res:Response) {
     await this.adminsService.login(LoginAdminDto, res)
   }

   @Get('/adminDashboard')
   async getDashboard(@Res() res:Response, @Req() req:Request) {
      await this.adminsService.getDashboard(req, res);
    }

    @Post('suspendWallet')
    async suspendWallet(@Body(new ValidationPipe) emailAuthDto:EmailAuthDto,@Req() req:Request, @Res() res:Response) {
      await this.adminsService.suspendWallet(emailAuthDto ,req, res)
    }

    @Post('activateWallet')
    async activateWallet(@Body(new ValidationPipe) emailAuthDto:EmailAuthDto,@Req() req:Request, @Res() res:Response) {
      await this.adminsService.activateWallet(emailAuthDto ,req, res)
    }

    @Get('/getCreatorsList')
   async getCreatorsList(@Res() res:Response, @Req() req:Request) {
      await this.adminsService.getCreatorsList(req, res);
    }

    @Get('/getEventeesList')
    async getEventeesList(@Res() res:Response, @Req() req:Request) {
       await this.adminsService.getEventeesList(req, res);
     }
 

  @Get("/logout")
  logOut(@Res() res:Response){
   res.clearCookie("jwt")
   res.redirect("/admins/login")
  }

}
