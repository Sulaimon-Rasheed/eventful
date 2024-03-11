import { Injectable} from '@nestjs/common';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { v2 } from 'cloudinary';
import { InjectModel } from '@nestjs/mongoose';
import { Creator } from './creators.model';
import { Event } from '../events/events.model';
import { Model } from 'mongoose';
import * as encoding from 'Utils/bcrypt';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { MailerService } from 'src/mailer/mailer.service';
dotenv.config();
import { v4 as uuidv4 } from 'uuid';
import { CreatorVerification } from './verifiedCreators.model';
import { LoginCreatorDto } from './dto/login-creator.dto';
import { AuthService } from 'src/auth/auth.service';
import { Request, Response } from 'express';
import { Eventee } from 'src/eventees/eventees.model';
import { Wallet } from 'src/wallets/wallets.model';
import { UpdateEventDto } from 'src/events/dto/update-event.dto';
import { CacheService } from 'src/cache/cache.service';
import { emailVerifyDto } from './dto/email-verify.dto';
import { newPasswordDto } from './dto/newPassword.dto';
import { DateTime } from 'luxon';
import { Transaction } from 'src/transactions/transactions.model';
import { debitDto } from './dto/debit.dto';

@Injectable()
export class CreatorsService {
  constructor(
    @InjectModel('Creator') private readonly creatorModel: Model<Creator>,
    @InjectModel('CreatorVerification')
    private readonly creatorVerificationModel: Model<CreatorVerification>,
    @InjectModel('Event') private readonly eventModel: Model<Event>,
    @InjectModel('Transaction') private readonly transactionModel: Model<Transaction>,
    @InjectModel('Eventee') private readonly eventeeModel: Model<Eventee>,
    @InjectModel('Wallet') private readonly walletModel: Model<Wallet>,
    private readonly mailservice: MailerService,
    private readonly Authservice: AuthService,
    private readonly cacheService: CacheService,
  ) {
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  async createCreator(
    createCreatorDto: CreateCreatorDto,
    filePath: string,
    req:any,
    res: Response,
  ) {
    try {
      const existingCreator: object = await this.creatorModel.findOne({
        email: createCreatorDto.email,
      });
      if (existingCreator) {
        return res.render('error', { message: 'existingCreatorError' });
      }

      const password = await encoding.encodePassword(createCreatorDto.password);
      
      const result = await v2.uploader.upload(filePath, {
        folder: 'eventful_creators_ProfileImage',
      });
      if (!result) {
        return res.render('error', { message: 'fileUploadError' });
      }

      let newCreator = await this.creatorModel.create({
        creator_name: createCreatorDto.creator_name,
        company_name: createCreatorDto.company_name,
        email: createCreatorDto.email,
        phoneNum: createCreatorDto.phoneNum,
        country: createCreatorDto.country,
        state: createCreatorDto.state,
        account_name:createCreatorDto.account_name,
        account_number:createCreatorDto. account_number,
        bank_name:createCreatorDto. bank_name,
        profileImage: result,
        password: password,
      });

      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err.message)
        }
      });

      const currUrl = 'https://eventful-8xm4.onrender.com';
      let uniqueString = newCreator._id + uuidv4();

      const hashedUniqueString = await encoding.encodePassword(uniqueString);

      await this.creatorVerificationModel.create({
        creatorId: newCreator._id,
        uniqueString: hashedUniqueString,
        creation_date: Date.now(),
        expiring_date: Date.now() + 21600000,
      });

      // create a wallet for the creator
      const newWallet = await this.walletModel.create({
        creatorId:newCreator._id,
        currency:"Naira",
      })

      newCreator.walletId = newWallet._id
      newCreator.save()

      await this.mailservice.sendVerificationEmail({
        email: createCreatorDto.email,
        subject: 'Verify your email',
        html: `<div style = "background-color:lightgrey; padding:16px"; border-radius:20px>
          <p>Hi, ${createCreatorDto.creator_name} of ${createCreatorDto.company_name}</P>
          <p>Thank you for opening account with us.</p>
          <p>We need to confirm it is you before being authorized to login to your account</P>
              <p>Click <a href=${
                currUrl +
                '/creators/verify/' +
                newCreator._id +
                '/' +
                uniqueString
              }>here</a> to get authorized</P>
              <p>This link <b>will expire in the next 6hrs</b></p>
              <p>We look forward to your impactfull events post on <b>Eventful</b></P>
              <p>Click this link: <a href=${
                currUrl +
                '/creators/verify/' +
                newCreator._id +
                '/' +
                uniqueString
              } >${currUrl + '/creators/verify/' + newCreator._id + '/' + uniqueString}<a/></p>
              </div>`,
      });

      req.flash("creatorCreation", "Successful signup. Check your email for verification link.")
     return res.redirect("/creators/signup")
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  getSignupPage(req:any, res:Response) {
    try{
      const creatorSignup = req.flash("creatorCreation")
      return res.render('creator_signup_page', {creatorSignup})
      } catch (err) {
        return res.render('catchError', { catchError: err.message });
      }
    }

  async verifyCreator(userId: string, uniqueString: string, res: Response) {
    try {
      let user = await this.creatorVerificationModel.findOne({
        creatorId: userId,
      });

      if (!user) {
        return res.render('error', { message: 'creatorNotFound' });
      }

      if (user.expiring_date.getTime() < Date.now()) {
        await this.creatorVerificationModel.deleteOne({ creatorId: userId });
        await this.creatorModel.deleteOne({ _id: userId });
      }

      const valid = await encoding.validateEncodedString(
        uniqueString,
        user.uniqueString,
      );
      if (!valid) {
        return res.render('error', { message: 'linkAlteration' });
      }

      await this.creatorModel.findByIdAndUpdate(
        { _id: userId },
        { verified: true },
      );
      await this.creatorVerificationModel.deleteOne({ creatorId: userId });

      return res.render(`successful_verification`, { user: 'creator' });
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  getLoginPage() {
    return `creatorLogin_page`;
  }

  getPasswordResetPage(req:any, res: Response) {
    try{
    const validEmail = req.flash("validEmail")
    return res.render('passwordReset', { user: 'creator', validEmail });
  }catch(err){
    return res.render('catchError', { catchError: err.message });
  }
  }

  // Verifying the email for password reset.
  async verifyEmailForPasswordReset(
    emailVerifyDto: emailVerifyDto,
    req: any,
    res: Response,
  ) {
    try {
      const creator: Creator = await this.creatorModel.findOne({
        email: emailVerifyDto.email,
      });
      if (!creator) {
        return res.render('error', { message: 'creatorNotFound' });
      }

      const resetToken = uuidv4();
      const hashedResetToken = await encoding.encodePassword(resetToken);
      console.log(hashedResetToken);
      creator.passwordResetToken = hashedResetToken;
      // creator.passwordResetExpireDate = Date.now() + 10 * 60 * 1000
      console.log(resetToken);
      console.log(hashedResetToken);
      creator.save();
      const currUrl = 'https://eventful-8xm4.onrender.com';
      this.mailservice.sendVerificationEmail({
        email: creator.email,
        subject: 'We received your request for password reset',
        html: `<div style = "background-color:lightgrey; padding:16px"; border-radius:20px>
        <p>Hi, ${creator.creator_name}</P>
        <p>Click the link below to reset your paasword.</P>
        <p><a href= ${currUrl + '/creators/resetPassword/newPassword/' + resetToken + '/' + creator.email}>
        ${currUrl + '/creators/resetPassword/newPassword/' + resetToken + '/' + creator.email}
        </a>
        </P>
        <p>This link <b>will expire in the next 10min</b></P>
        </div>`,
      });
      req.flash("validEmail", "successfull request. Check your email for password reset link")
      return res.redirect('/creators/passwordResetPage');
    } catch (err) {
      return res.render('catch', { catchError: err.message });
    }
  }

  // Verifying Password reset Token
  async verifyUserPasswordResetLink(
    resetToken: string,
    email: string,
    res: Response,
  ) {
    try {
      const user = await this.creatorModel.findOne({ email: email });
      if (!user) {
        return res.render('error', { message: 'creatorNotFound' });
      }

      const expireTimestamp = new Date(user.passwordResetExpireDate).getTime()

      if (expireTimestamp < Date.now()) {
        return res.render('error', { message: 'expiredPasswordResetLinkForCreator' });
      }

      const valid = await encoding.validateEncodedString(
        resetToken,
        user.passwordResetToken,
      );
      if (!valid) {
        res.render('error', { message: 'invalidResetToken' });
      }

      user.passwordResetToken = undefined;
      user.passwordResetExpireDate = undefined
      user.save();

      return res.render('newPasswordPage', {
        userId: user._id,
        user: 'creator',
      });
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  async setNewPassword(
    newPasswordDto: newPasswordDto,
    userId: string,
    req:any,
    res: Response,
  ) {

    try{
    const user = await this.creatorModel.findOne({ _id: userId });
    if (!user) {
      return res.render('error', { message: 'creatorNotFound' });
    }

    const newPassword = newPasswordDto.newPassword;
    const hashedPassword = await encoding.encodePassword(newPassword);
    user.password = hashedPassword;
    user.save();

    return res.render('successfulNewPassword', { user: 'creator' });
  }catch(err){
    return res.render('catchError', { catchError: err.message });
  }
  }


  // Get creators Home Page
  async getCreatorHomePage(req:Request, res:Response){
    try{
      await res.render("creatorHomePage")
    }catch(err){
      return res.render('catchError', { catchError: err.message });
    }
  }

  // Creators login
  async login(LoginCreatorDto: LoginCreatorDto, res: Response) {
    try {
      const { email, password } = LoginCreatorDto;
      let user = await this.creatorModel.findOne({ email });

      if (!user) {
        return res.render('error', { message: 'creatorNotFound' });
      }

      if (!user.verified) {
        return res.render('error', { message: 'verificationError' });
      }

      const valid = await encoding.validateEncodedString(
        password,
        user.password,
      );

      if (!valid) {
        return res.render('error', { message: 'creatorPasswordError' });
      }

      const token: string = this.Authservice.generateJwtToken(
        user._id,
        user.email,
        user.creator_name,
        user.profileImage,
        res,
      );

      res.cookie('jwt', token, { maxAge: 2 * 60 * 60 * 1000 });

      return res.redirect(`/creators/creatorDashboard`);
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  async getDashboard(req: any, res: Response, page: any) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const allPages = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20,
      ];
      let stringifyPage: any = req.query.page || 0;
      let page = parseInt(stringifyPage);
      const allEvents = await this.cacheService.get(
        `creatorAllEvents_${res.locals.user.id}`,
      );

      const events = await this.cacheService.get(
        `creatorDashBoard_${res.locals.user.id}_${page}`,
      );

      if (!events) {
        const eventPerPage: number = 10;

        const allEvents = await this.eventModel
          .find({ creatorId: res.locals.user.id })
          .sort({ created_date: 'desc' });

        const events: any = await this.eventModel
          .find({ creatorId: res.locals.user.id })
          .sort({ created_date: 'desc' })
          .skip(page * eventPerPage)
          .limit(eventPerPage);

        if (!events) {
          return [];
        }

        const maxPage = Math.round(allEvents.length / eventPerPage);
        const skip = page * eventPerPage;

        let passdays = [];
        events.forEach((event) => {
          let postDate = event.created_date;
          let parsedDate = DateTime.fromFormat(
            postDate,
            "LLL d, yyyy 'at' HH:mm",
          );
          let currentDate = DateTime.now();

          passdays.push(currentDate.diff(parsedDate, 'days').toObject().days);
        });

        await this.cacheService.set(
          `creatorAllEvents_${res.locals.user.id}`,
          allEvents,
        );

        await this.cacheService.set(
          `creatorDashBoard_${res.locals.user.id}_${page}`,
          events,
        );

        const reminderUpdateSuccess = req.flash("reminderUpdate")
        return res.render('creatorDashboard', {
          user: res.locals.user,
          events,
          page,
          maxPage,
          allPages,
          skip,
          passdays: passdays,
          date: DateTime.now().toFormat('LLL d, yyyy'),
          reminderUpdateSuccess
        });
      }

      const eventPerPage: number = 10;
      const maxPage = Math.round(allEvents.length / eventPerPage);
      const skip = page * eventPerPage;

      let passdays = [];
      events.forEach((event) => {
        let postDate = event.created_date;
        let parsedDate = DateTime.fromFormat(
          postDate,
          "LLL d, yyyy 'at' HH:mm",
        );
        let currentDate = DateTime.now();

        passdays.push(currentDate.diff(parsedDate, 'days').toObject().days);
      });
      const reminderUpdateSuccess = req.flash("reminderUpdate")
      return res.render('creatorDashboard', {
        user: res.locals.user,
        events,
        page,
        maxPage,
        allPages,
        skip,
        passdays: passdays,
        date: DateTime.now().toFormat('LLL d, yyyy'),
        reminderUpdateSuccess
      });
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  //-------------------Opening the Wallet----------------------
  async openWallet(req:any, res:Response){
    try{
      await this.Authservice.ensureLogin(req, res);
      const wallet = await this.walletModel.findOne({creatorId:res.locals.user.id, status:"active"}).populate("transactions")
      if(!wallet){
        return res.render("error", {message:"inactiveWallet"})
      }

      let theTransactions = []

      for (const transactionId of wallet.transactions){
        const transaction = await (await this.transactionModel.findOne({_id:transactionId}).populate("eventeeId")).populate("eventId")
        theTransactions.push(transaction)
      }

      const successfulTransaction = req.flash("transactionSuccess")
      await res.render("wallet", {user:res.locals.user, wallet, theTransactions, successfulTransaction})
    }catch(err){
      return res.render('catchError', { catchError: err.message });
    }
  }

  // -----------------------Wallet Debit
  async debitWallet(debitDto:debitDto, walletId:string, req:any, res:Response, ){
    try{
    await this.Authservice.ensureLogin(req, res)

    const creator = await this.creatorModel.findOne({_id:res.locals.user.id})
    if(!creator){
      return res.render("error", {message:"creatorNotFound"})
    }

    const amount = parseInt(debitDto.debit_amount)
    const wallet = await (await this.walletModel.findOne({_id:walletId, status:"active"})).populate("transactions")
    if(!wallet){
      return res.render("error", {message:"walletNotFound"})
    }

    if(wallet.balance - amount < 0){
      return res.render("error", {message:"insufficientBalance"})
    }

    wallet.balance = wallet.balance - amount
    wallet.updatedAt = DateTime.now().toFormat('LLL d, yyyy \'at\' HH:mm')
    

    const newTransaction = await this.transactionModel.create({
      amount:`${-amount}`,
      status:"success",
      type:"debit",
      creatorId:res.locals.user.id
    })

    wallet.transactions.push(newTransaction._id)
    wallet.save()

    await this.mailservice.sendVerificationEmail({
      email:"maito4me@gmail.com",
        subject: 'Credit request',
        html: `<div style = "background-color:lightgrey; padding:16px"; border-radius:20px>
          <p>Hi, Account officer</P>
          <p>${creator.creator_name} of ${creator.company_name} just made a request to be credited with N${amount}</p>
          <p>Ensure the user is credited within the next 24hrs</P>
          <h2>Account Details</h2>
          <p><strong>Account name</strong>${creator.account_name}</P>
          <p><strong>Account number</strong>${creator.account_number}</P>
          <p><strong>Bank name</strong>${creator.bank_name}</P>
          <p>Thanks</P>
      </div>`,
    })

    req.flash("transactionSuccess", "Successful Transaction ")
    return res.redirect("/creators/myWallet")
  }catch(err){
    return res.render('catchError', { catchError: err.message });
  }
  }
// ----------------------------------------------


  //---------------------------------------Filtering event by state--------------------------------
  async filterEventByState(req: Request, res: Response, page: any) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const allPages = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20,
      ];
      let state = req.query.state || 'All';
      let stringifyPage: any = req.query.page || 0;
      let page = parseInt(stringifyPage);

      const allEvents = await this.cacheService.get(
        `creatorFilterdAllEvents_${res.locals.user.id}`,
      );

      let events;
      if (state == 'All') {
        events = await this.cacheService.get(
          `creatorFilterdDashBoard_${res.locals.user.id}_All`,
        );

        if (!events) {
          const eventPerPage: number = 10;

          let allEvents: any;
          let events: any;

          allEvents = await this.eventModel
            .find({ creatorId: res.locals.user.id })
            .sort({ created_date: 'desc' });

          events = await this.eventModel
            .find({ creatorId: res.locals.user.id })
            .sort({ created_date: 'desc' })
            .skip(page * eventPerPage)
            .limit(eventPerPage);

          if (!events) {
            return [];
          }

          const maxPage = Math.round(allEvents.length / eventPerPage);
          const skip = page * eventPerPage;

          let passdays = [];
          events.forEach((event) => {
            let postDate = event.created_date;
            let parsedDate = DateTime.fromFormat(
              postDate,
              "LLL d, yyyy 'at' HH:mm",
            );
            let currentDate = DateTime.now();

            passdays.push(currentDate.diff(parsedDate, 'days').toObject().days);
          });

          await this.cacheService.set(
            `creatorFilterdAllEvents_${res.locals.user.id}`,
            allEvents,
          );

          await this.cacheService.set(
            `creatorFilterdDashBoard_${res.locals.user.id}_All`,
            events,
          );

          return res.render('creatorDashboard', {
            user: res.locals.user,
            events,
            page,
            maxPage,
            allPages,
            skip,
            passdays: passdays,
            date: DateTime.now().toFormat('LLL d, yyyy'),
          });
        }
      } else {
        events = await this.cacheService.get(
          `creatorFilterdDashBoard_${res.locals.user.id}_${state}`,
        );

        if (!events) {
          const eventPerPage: number = 10;

          let allEvents: any;
          let events: any;

          allEvents = await this.eventModel
            .find({ creatorId: res.locals.user.id, state: state })
            .sort({ created_date: 'desc' });

          events = await this.eventModel
            .find({ creatorId: res.locals.user.id, state: state })
            .sort({ created_date: 'desc' })
            .skip(page * eventPerPage)
            .limit(eventPerPage);

          if (!events) {
            return [];
          }

          const maxPage = Math.round(allEvents.length / eventPerPage);
          const skip = page * eventPerPage;

          let passdays = [];
          events.forEach((event) => {
            let postDate = event.created_date;
            let parsedDate = DateTime.fromFormat(
              postDate,
              "LLL d, yyyy 'at' HH:mm",
            );
            let currentDate = DateTime.now();

            passdays.push(currentDate.diff(parsedDate, 'days').toObject().days);
          });

          await this.cacheService.set(
            `creatorFilterdAllEvents_${res.locals.user.id}`,
            allEvents,
          );

          await this.cacheService.set(
            `creatorFilterdDashBoard_${res.locals.user.id}_${state}`,
            events,
          );

          return res.render('creatorDashboard', {
            user: res.locals.user,
            events,
            page,
            maxPage,
            allPages,
            skip,
            passdays: passdays,
            date: DateTime.now().toFormat('LLL d, yyyy'),
          });
        }
      }

      const eventPerPage: number = 10;
      const maxPage = Math.round(allEvents.length / eventPerPage);
      const skip = page * eventPerPage;

      let passdays = [];
      events.forEach((event) => {
        let postDate = event.created_date;
        let parsedDate = DateTime.fromFormat(
          postDate,
          "LLL d, yyyy 'at' HH:mm",
        );
        let currentDate = DateTime.now();

        passdays.push(currentDate.diff(parsedDate, 'days').toObject().days);
      });

      return res.render('creatorDashboard', {
        user: res.locals.user,
        events,
        page,
        maxPage,
        allPages,
        skip,
        passdays: passdays,
        date: DateTime.now().toFormat('LLL d, yyyy'),
      });
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  async getUnticketedEventees(eventId: string, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
     
      const event = await this.eventModel
        .findOne({ _id: eventId })
        .populate('unticketedEventeesId');
      if (!event) {
        return res.render('error', { message: 'eventNotfound' });
      }
      let unticketedEventees = [];
      let count = 0;
      for (const eventee of event.unticketedEventeesId) {
        unticketedEventees.push(eventee);
        count++;
      }
      
      return res.render("unticketedEventees", {unticketedEventees,count})
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  async getTicketedEventees(eventId: string, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      
      const event = await this.eventModel
        .findOne({ _id: eventId })
        .populate('ticketedEventeesId');
      if (!event) {
        return res.render('error', { message: 'eventNotfound' });
      }
      let ticketedEventees = [];
      let count = 0;
      for (const eventee of event.ticketedEventeesId) {
        ticketedEventees.push(eventee);
        count++;
      }
     

      return res.render("ticketedEventees", {ticketedEventees,count})

    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }


  async getScannedEventees(eventId: string, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      
      const event = await this.eventModel
        .findOne({ _id: eventId })
        .populate('scannedEventeesId');
      if (!event) {
        return res.render('error', { message: 'eventNotfound' });
      }
      let scannedEventees = [];
      let count = 0;
      for (const eventee of event.scannedEventeesId) {
        scannedEventees.push(eventee);
        count++;
      }

      return res.render("scannedEventees", {scannedEventees,count})
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }


  //------------------Getting ALL THE TIME eventees that bougth the ticket of a creator events but was not in attendance-------------------------------------------

  async getAllTicketedEventees(req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      
      const creator = await this.creatorModel.findOne({ _id:res.locals.user.id}).populate("allTicketedEventeesId")
    
      if (!creator) {
        return res.render('error', { message: 'creatorNotfound' });
      }
      let allTicketedEventees = [];
      let count = 0;
      for (const eventee of creator.allTicketedEventeesId) {
        allTicketedEventees.push(eventee);
        count++;
      }

      return res.render("allTicketedEventees", {allTicketedEventees,count})
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  //----------------Getting All THE TIME Eventees that attended a creator events with their QR code scanned-----------------------------------------
  async getAllScannedEventees(req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
       
      const creator = await this.creatorModel.findOne({ _id:res.locals.user.id}).populate("allScannedEventeesId")
    
      if (!creator) {
        return res.render('error', { message: 'creatorNotfound' });
      }
      let allScannedEventees = [];
      let count = 0;
      for (const eventee of creator.allScannedEventeesId) {
        allScannedEventees.push(eventee);
        count++;
      }

      return res.render("allScannedEventees", {allScannedEventees,count})
     
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }



  async resetReminderDays(
    eventId: String,
    UpdateEventDto: UpdateEventDto,
    req: any,
    res: Response,
  ) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const event = await this.eventModel.findOne({ _id: eventId });
      if (!event) {
        return res.render('error', { message: 'eventNotfound' });
      }

      event.reminder_days = UpdateEventDto.reminder_days;
      event.save();

      req.flash("reminderUpdate", "Successful reminder day update.")
      return res.redirect(`/events/eventUpdatePage/${event._id}`);
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  
  // Opening the Qr code scanner.
  async getScanner(req: any, res: Response) {
    try {
        await this.Authservice.ensureLogin(req, res);
        const successfulScan = req.flash("successfulScan")
        return res.render('scanner', {successfulScan});
    } catch (err) {
        return res.render('catchError', { catchError: err.message });
    }
  }


  async getScanningResult(encodedResult:string, req: any, res: Response){
    try {
      await this.Authservice.ensureLogin(req, res);
      const result = decodeURIComponent(encodedResult)
      const parsedObject = JSON.parse(result);
      const transaction = await this.transactionModel.findOne({_id:parsedObject.transactionId}).populate("eventeeId").populate("eventId")
      
      if(!transaction){
        res.render("error", {message:"transactionNotFound"})
      }

      const eventId = transaction.eventId
      const event = await this.eventModel.findOne({_id:eventId})

      if(!event){
        return res.render("error", {message:"eventNotFound"})
      }

      if(event.scannedEventeesId.includes(transaction.eventeeId)){
        return res.render("error", {message:"alreadyScanned"})
      }

      event.scannedEventeesId.push(transaction.eventeeId)
      event.save()

      const creator = await this.creatorModel.findOne({_id:event.creatorId})
      creator.allScannedEventeesId.push(transaction.eventeeId)
      creator.save()

      const eventee = await this.eventeeModel.findOne({_id:transaction.eventeeId})
      eventee.attended_eventsId.push(transaction.eventId)
      eventee.save()

      req.flash("successfulScan", "Successfully recorded")
      res.redirect('/creators/scanner')

  } catch (err) {
      return res.render('catchError', { catchError: err.message });
  }
  }

}
