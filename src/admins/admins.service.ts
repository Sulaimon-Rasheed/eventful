import { Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Request, Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin } from './admins.model';
import{v4 as uuidv4} from "uuid"
import * as encoding from 'Utils/bcrypt';
import { MailerService } from 'src/mailer/mailer.service';
import { AdminVerification } from './adminVerification.model';
import { LoginAdminDto } from './dto/login-admin.dto';
import { AuthService } from 'src/auth/auth.service';
import { v2 } from 'cloudinary';
import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import { EmailAuthDto } from './dto/emailAuth.dto';
import { Creator } from 'src/creators/creators.model';
import { Wallet } from 'src/wallets/wallets.model';
import { Eventee } from 'src/eventees/eventees.model';
import { Transaction } from 'src/transactions/transactions.model';
import { Event } from 'src/events/events.model';


@Injectable()
export class AdminsService {
    constructor(
        @InjectModel("Admin") private readonly adminModel:Model<Admin>,
        @InjectModel("AdminVerification") private readonly adminVerificationModel:Model<AdminVerification>,
        @InjectModel("Creator") private readonly creatorModel:Model<Creator>,
        @InjectModel("Eventee") private readonly eventeeModel:Model<Eventee>,
        @InjectModel("Transaction") private readonly transactionModel:Model<Transaction>,
        @InjectModel("Event") private readonly eventModel:Model<Event>,
        @InjectModel("Wallet") private readonly walletModel:Model<Wallet>,

        private readonly mailService:MailerService,
        private readonly Authservice: AuthService,
        ){
          v2.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
          });
        }


    async createAdmin(profileImage:Express.Multer.File, createAdminDto:CreateAdminDto, req:any, res:Response){
        try{
        const admin_key = uuidv4()
        const hashed_admin_key = await encoding.encodePassword(admin_key) 
        
        const result = await v2.uploader.upload( profileImage.path, {
          folder: 'eventful_admins_ProfileImage',
        });
        if (!result) {
          return res.render('error', { message: 'fileUploadError' });
        }
        
        
        const newAdmin = await this.adminModel.create({
            first_name:createAdminDto.first_name,
            last_name:createAdminDto.last_name,
            email:createAdminDto.email,
            phoneNum:createAdminDto.phoneNum,
            admin_key:hashed_admin_key,
            profileImage: result,
        })

        fs.unlink(profileImage.path, (err) => {
          if (err) {
            console.log(err.message)
          }
        });

      const currUrl = 'https://eventful-8xm4.onrender.com';
      let uniqueString = newAdmin._id + uuidv4();
      const hashedUniqueString = await encoding.encodePassword(uniqueString);


      await this.adminVerificationModel.create({
        adminId: newAdmin._id,
        uniqueString: hashedUniqueString,
        creation_date: Date.now(),
        expiring_date: Date.now() + 21600000,
      });

      await this.mailService.sendVerificationEmail({
        email: createAdminDto.email,
        subject: 'Successful account opening',
        html: `<div style = "background-color:lightgrey; padding:16px"; border-radius:20px>
          <p>Congratulations!!, <b>${createAdminDto.first_name}</b></P>
          <p>You now have an account with Eventful as an Admin.</p>
          <p>Your admin key is:<span><h2>${admin_key}</h2></span>.</p>
          <p>You will need it when logging into your account.</p> 
          <p>The admin key is very confidential and should be strictly guided.</p> 
          <p>However,for now, you don't have login access until verified by the top management.</P>
          <p>You will be contacted once verified.</P>
          <p>Thanks</P>
          </div>`,
      });


      await this.mailService.sendVerificationEmail({
        email:newAdmin.chairman_email,
        subject: 'New Admin signup',
        html: `<div style = "background-color:lightgrey; padding:16px"; border-radius:20px>
          <p>Hi, Chairman</P>
          <p>A staff by the name <b>${newAdmin.first_name} ${newAdmin.last_name}</b> with email, <b>${newAdmin.email}</b> and phone number, <b>${newAdmin.phoneNum}</b> just opened an account with Eventful as an Admin.</p>
          <p>The generated admin_key for the staff is ,<h2>${admin_key}</h2></p>   
          <p>If truely your staff and approved by you, click <a href=${
                currUrl +
                '/admins/verify/' +
                newAdmin._id +
                '/' +
                uniqueString
              }>here</a> to grant the staff login access as an Admin.</P>
              <p>This link <b>will expire in the next 6hrs</b></p>
              <p>You can also copy the link to your browser: <a href=${
                currUrl +
                '/admins/verify/' +
                newAdmin._id +
                '/' +
                uniqueString
              } >${currUrl + '/admins/verify/' + newAdmin._id + '/' + uniqueString}<a/></p>
              </div>`,
      });

      req.flash("AdminCreated", "Successful signup. Check your email for your admin_key to login.")
      return res.redirect("/admins/signup")

    }catch(err){
        return res.render('catchError', { catchError: err.message });
    }

    }

    getSignUpPage(req:any, res:Response) {
     try{
        const adminCreated = req.flash("EventeeCreated")
        return res.render('admin_signup_page', {adminCreated})
      } catch (err) {
        return res.render('catchError', { catchError: err.message });
      } 
    }

    async verifyAdmin(userId: string, uniqueString: string, res: Response) {
        try {
          let user = await this.adminVerificationModel.findOne({
            adminId: userId,
          });
    
          if (!user) {
            return res.render('error', { message: 'adminNotFound' });
          }
    
          if (user.expiring_date.getTime() < Date.now()) {
            await this.adminVerificationModel.deleteOne({ adminId: userId });
            await this.adminModel.deleteOne({ _id: userId });
          }
    
          const valid = await encoding.validateEncodedString(
            uniqueString,
            user.uniqueString,
          );
          if (!valid) {
            return res.render('error', { message: 'linkAlteration' });
          }
    
          await this.adminModel.findByIdAndUpdate(
            { _id: userId },
            { verified: true },
          );
          await this.adminVerificationModel.deleteOne({ adminId: userId });
    
          return res.render(`successful_verification`, { user: 'admin' });
        } catch (err) {
          return res.render('catchError', { catchError: err.message });
        }
      }
    
      //---------------------------------------Getting login page---------------------------------------------
      getLoginPage() {
        return `adminLogin_page`;
      }


      async login(LoginAdminDto:LoginAdminDto, res: Response) {
        try {
          const { email, admin_key } = LoginAdminDto;
          let user = await this.adminModel.findOne({ email });
    
          if (!user) {
            return res.render('error', { message: 'adminNotFound' });
          }
    
          if (!user.verified) {
            // throw new Error("")
            return res.render('error', { message: 'verificationError' });
          }
    
          const valid = await encoding.validateEncodedString(
            admin_key,
            user.admin_key,
          );
    
          if (!valid) {
            return res.render('error', { message: 'admin_keyError' });
          }
    
          const token: string = this.Authservice.generateJwtToken(
            user._id,
            user.email,
            user.first_name,
            user.profileImage,
            res,
          );
    
          res.cookie('jwt', token, { maxAge: 60 * 60 * 1000 });
    
          return res.redirect(`/admins/adminDashboard`);
        } catch (err) {
          return res.render('catchError', { catchError: err.message });
        }
      }

      async getDashboard(req:any, res:Response){
      try {
        await this.Authservice.ensureLogin(req,res)

        const walletSuspension = req.flash("walletSuspension")
        const walletActivated = req.flash("walletActivated")
        return res.render("adminDashboard", {user:res.locals.user, walletSuspension, walletActivated})
      } catch (err) {
        return res.render('catchError', { catchError: err.message });
      }

      }

      // ---------------To suspend a Creator Wallet--------------------

      async suspendWallet(emailAuthDto:EmailAuthDto,req:any, res:Response){
        try {
          await this.Authservice.ensureLogin(req,res)
          const creator = await this.creatorModel.findOne({email:emailAuthDto.email})

          if(!creator){
           res.render("error", {message:"email not found"})
          }

          const wallet = await this.walletModel.findOne({creatorId:creator._id, status:"active"})
          if(!wallet){
            res.render("error", {message:"wallet already suspended"})
          }

          wallet.status = "suspended"
          wallet.save()
          
          req.flash("walletSuspension", "Wallet suspended successfully")
          res.redirect("/admins/adminDashboard")
        } catch (err) {
          return res.render('catchError', { catchError: err.message });
        }
      }


      // ---------------To activate a Creator Wallet--------------------

      async activateWallet(emailAuthDto:EmailAuthDto,req:any, res:Response){
        try {
          await this.Authservice.ensureLogin(req,res)
          const creator = await this.creatorModel.findOne({email:emailAuthDto.email})

          if(!creator){
           res.render("error", {message:"email not found"})
          }

          const wallet = await this.walletModel.findOne({creatorId:creator._id, status:"suspended"})
          if(!wallet){
            res.render("error", {message:"wallet already activated"})
          }

          wallet.status = "active"
          wallet.save()
          
          req.flash("walletActivated", "Wallet activated successfully")
          res.redirect("/admins/adminDashboard")
        } catch (err) {
          return res.render('catchError', { catchError: err.message });
        }
      }


      async getCreatorsList(req:Request, res:Response){
        try {
          await this.Authservice.ensureLogin(req,res)
          const creators:any = await this.creatorModel.find({verified:true}).populate("walletId")
          if(!creators){
            res.render("error", {message:"creatorNotFound"})
          }

          let creatorsList = []
          let count = 0
          for(const creator of creators){
            const wallet = await this.walletModel.findOne({_id:creator.walletId})
            const neededInfo = {
              image:creator.profileImage.url,
              name:creator.creator_name,
              email:creator.email,
              phoneNum:creator.phoneNum,
              company_name:creator.company_name,
              wallet_balance:wallet.balance,
              wallet_status:wallet.status,
              last_transactionDate:wallet.updatedAt
            }

            count++
            creatorsList.push(neededInfo)
          }
          return res.render("creatorList", {creatorsList, user:res.locals.user,count})
        } catch (err) {
          return res.render('catchError', { catchError: err.message });
        }
      }


      async getEventeesList(req:Request, res:Response){
        try {
          await this.Authservice.ensureLogin(req,res)

          const eventees:any = await this.eventeeModel.find({verified:true})
          if(!eventees){
            res.render("error", {message:"eventeeNotFound"})
          }

          let eventeesList = []
          let count = 0
          for(const eventee of eventees){
            const neededInfo = {
              image:eventee.profileImage.url,
              name:`${eventee.first_name} ${eventee.last_name}`,
              email:eventee.email,
              phoneNum:eventee.phoneNum,
              event_count:eventee.event_count,
              sex:eventee.sex,
              state:eventee.state,
              country:eventee.country
            }

            count++

            eventeesList.push(neededInfo)
          }

          return res.render("eventeeList", { eventeesList, user:res.locals.user, count})
        } catch (err) {
          return res.render('catchError', { catchError: err.message });
        }
      }

}
