import {
  Injectable
} from '@nestjs/common';
import { CreateEventeeDto } from './dto/create-eventee.dto';
import { UpdateEventeeDto } from './dto/update-eventee.dto';
import { v2 } from 'cloudinary';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Eventee } from './eventees.model';
import * as encoding from 'Utils/bcrypt';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { EventeeVerification } from './verifiedEventee.model';
import { MailerService } from 'src/mailer/mailer.service';
dotenv.config();
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { LoginEventeeDto } from './dto/login-eventee.dto';
import { Event } from '../events/events.model';
import { Wallet } from '../wallets/wallets.model';
import { Transaction } from '../transactions/transactions.model';
import axios from 'axios';
import * as qrcode from 'qrcode';
import { CacheService } from 'src/cache/cache.service';
import { emailVerificationDto } from './dto/emailVerification.dto';
import { newEpasswordDto } from './dto/newEpassword.dto';
import { DateTime } from 'luxon';
import { Creator } from 'src/creators/creators.model';
import { CurrencyService } from '../exchanger/currencyExchange.service';

@Injectable()
export class EventeesService {
  constructor(
    @InjectModel('Eventee') private readonly eventeeModel: Model<Eventee>,
    @InjectModel('EventeeVerification')
    private readonly eventeeVerificationModel: Model<EventeeVerification>,
    @InjectModel('Event') private readonly eventModel: Model<Event>,
    @InjectModel('Creator') private readonly creatorModel: Model<Creator>,
    @InjectModel('Transaction') private readonly transactionModel: Model<Transaction>,
    @InjectModel('Wallet') private readonly walletModel: Model<Wallet>,
    private readonly mailservice: MailerService,
    private readonly Authservice: AuthService,
    private readonly cacheService: CacheService,
    private readonly currencyService :CurrencyService ,
  ) {
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

//   bufferFromBufferString(bufferStr) {
//     return Buffer.from(
//         bufferStr
//             .replace(/[<>]/g, '') // Remove < > symbols from the string
//             .split(' ') // Create an array by splitting it by space
//             .slice(1) // Remove the 'Buffer' word from the array
//             .reduce((acc, val) => acc.concat(parseInt(val, 16)), []) // Convert hex strings to integers
//     ).toString();
// }


  //-----------------------------------Eventee Creation------------------------------------------------

  async createEventee(
    createEventeeDto: CreateEventeeDto,
    profileImage:Express.Multer.File,
    req:any,
    res: Response,
  ) {
    try {
      const existingEventee: object = await this.eventeeModel.findOne({
        email: createEventeeDto.email,
      });
      if (existingEventee) {
        return res.render('error', { message: 'existingEventeeError' });
      }

      const password = await encoding.encodePassword(createEventeeDto.password);
      
      const result = await v2.uploader.upload(profileImage.path, {folder:"eventful_eventees_ProfileImage"})

      if (!result) {
        return res.render('error', { message: 'fileUploadError' });
      }

      console.log(result)

      const newEventee = await this.eventeeModel.create({
        first_name: createEventeeDto.first_name,
        last_name: createEventeeDto.last_name,
        email: createEventeeDto.email,
        sex: createEventeeDto.sex,
        phoneNum: createEventeeDto.phoneNum,
        country: createEventeeDto.country,
        state: createEventeeDto.state,
        profileImage: result,
        password: password,
      });

      fs.unlink(profileImage.path, (err) => {
        if (err) {
          console.log(err.message)
        }
      });

      const currUrl = 'https://b66a-197-210-226-88.ngrok-free.app';
      let uniqueString = newEventee._id + uuidv4();
      const hashedUniqueString = await encoding.encodePassword(uniqueString);

      await this.eventeeVerificationModel.create({
        eventeeId: newEventee._id,
        uniqueString: hashedUniqueString,
        creation_date: Date.now(),
        expiring_date: Date.now() + 21600000,
      });

      await this.mailservice.sendVerificationEmail({
        email: createEventeeDto.email,
        subject: 'Verify your email',
        html: `<div style = "background-color:lightgrey; padding:16px"; border-radius:20px>
          <p>Hi, ${createEventeeDto.first_name}</P>
          <p>Thank you for opening account with Eventful.</p>
          <p>We need to confirm it is you before being authorized to login to your account</P>
              <p>Click <a href=${
                currUrl +
                '/eventees/verify/' +
                newEventee._id +
                '/' +
                uniqueString
              }>here</a> to get authorized</P>
              <p>This link <b>will expire in the next 6hrs</b></p>
              <p>With <b>Eventful</b>, You are assured of passport to a world of unforgettable moments.</P>
              <p>Click this link: <a href=${
                currUrl +
                '/eventees/verify/' +
                newEventee._id +
                '/' +
                uniqueString
              } >${currUrl + '/eventees/verify/' + newEventee._id + '/' + uniqueString}<a/></p>
              </div>`,
      });

      req.flash("EventeeCreated", "Successful signup. Check your email for verification link")
      return res.redirect("/eventees/signup")

    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  //---------------------------------- Getting the signup page--------------------------------------------------
  getSignUpPage(req:any, res:Response) {
    try{
    const eventeeSignup = req.flash("EventeeCreated")
    return res.render('eventee_signup_page', {eventeeSignup})
  } catch (err) {
    return res.render('catchError', { catchError: err.message });
  } 
  }

  //-------------------------------- Verifying the eventee email verification link----------------------------------------------------
  async verifyEventee(userId: string, uniqueString: string, res: Response) {
    try {
      let user = await this.eventeeVerificationModel.findOne({
        eventeeId: userId,
      });

      if (!user) {
        return res.render('error', { message: 'eventeeNotFound' });
      }

      if (user.expiring_date.getTime() < Date.now()) {
        await this.eventeeVerificationModel.deleteOne({ eventeeId: userId });
        await this.eventeeModel.deleteOne({ _id: userId });
      }

      const valid = await encoding.validateEncodedString(
        uniqueString,
        user.uniqueString,
      );
      if (!valid) {
        return res.render('error', { message: 'linkAlteration' });
      }

      await this.eventeeModel.findByIdAndUpdate(
        { _id: userId },
        { verified: true },
      );
      await this.eventeeVerificationModel.deleteOne({ eventeeId: userId });

      return res.render(`successful_verification`, { user: 'eventee' });
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  //---------------------------------------Getting login page---------------------------------------------
  getLoginPage() {
    return `eventeeLogin_page`;
  }

  async login(LoginEventeeDto: LoginEventeeDto, res: Response) {
    try {
      const { email, password } = LoginEventeeDto;
      let user = await this.eventeeModel.findOne({ email });

      if (!user) {
        return res.render('error', { message: 'eventeeNotFound' });
      }

      if (!user.verified) {
        // throw new Error("")
        return res.render('error', { message: 'verificationError' });
      }

      const valid = await encoding.validateEncodedString(
        password,
        user.password,
      );

      if (!valid) {
        return res.render('error', { message: 'eventeePasswordError' });
      }

      const token: string = this.Authservice.generateJwtToken(
        user._id,
        user.email,
        user.first_name,
        user.profileImage,
        res,
      );

      res.cookie('jwt', token, { maxAge: 60 * 60 * 1000 });

      return res.redirect(`/eventees/eventeeDashboard`);
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  //--------------------------------Getting password reset page-------------------------------------------
  getPasswordResetPage(req:any, res: Response) {
    const validEmail = req.flash('validEmail')
    return res.render('passwordReset', { user: 'eventee', validEmail });
  }

  //---------------------------------Verifying the email for password reset.-----------------------------------------
  async verifyEmailForPasswordReset(
    emailVerifyDto: emailVerificationDto,
    req: any,
    res: Response,
  ) {
    try {
      const eventee: Eventee = await this.eventeeModel.findOne({
        email: emailVerifyDto.email,
      });
      if (!eventee) {
        return res.render('error', { message: 'eventeeNotFound' });
      }

      const resetToken = uuidv4();
      const hashedResetToken = await encoding.encodePassword(resetToken);
      eventee.passwordResetToken = hashedResetToken;
      eventee.passwordResetExpireDate = Date.now() + 10 * 60 * 1000;
      eventee.save();
      const currUrl = 'https://b66a-197-210-226-88.ngrok-free.app';
      this.mailservice.sendVerificationEmail({
        email: eventee.email,
        subject: 'We received your request for password reset',
        html: `<div style = "background-color:lightgrey; padding:16px"; border-radius:20px>
      <p>Hi, ${eventee.first_name}</P>
      <p>Click the link below to reset your paasword.</P>
      <p><a href= ${currUrl + '/eventees/resetPassword/newPassword/' + resetToken + '/' + eventee.email}>
      ${currUrl + '/eventees/resetPassword/newPassword/' + resetToken + '/' + eventee.email}
      </a>
      </P>
      <p>This link <b>will expire in the next 10min</b></P>
      </div>`,
      });

      req.flash("validEmail", "successfull request. Check your email for password reset link")
      return res.redirect('/eventees/passwordResetPage');
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  //------------------Verifying Password reset Link---------------------------------------------------
  async verifyUserPasswordResetLink(
    resetToken: string,
    email: string,
    res: Response,
  ) {
    try {
      const user = await this.eventeeModel.findOne({ email: email });
      if (!user) {
        return res.render('error', { message: 'eventeeNotFound' });
      }

      const expireTimestamp = new Date(user.passwordResetExpireDate).getTime()
      if (expireTimestamp < Date.now()) {
        return res.render('error', { message: 'expiredPasswordResetLinkForEventee' });
      }

      const valid = await encoding.validateEncodedString(
        resetToken,
        user.passwordResetToken,
      );
      if (!valid) {
        res.render('error', { message: 'invalidResetToken' });
      }

      user.passwordResetToken = undefined;
      user.passwordResetExpireDate = undefined;
      user.save();

      return res.render('newPasswordPage', {
        userId: user._id,
        user: 'eventee',
      });
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }

  //-----------------------------------Setting new password---------------------------------------------------------
  async setNewPassword(
    newPasswordDto: newEpasswordDto,
    userId: string,
    res: Response,
  ) {
    try{
    const user = await this.eventeeModel.findOne({ _id: userId });
    if (!user) {
      return res.render('error', { message: 'creatorNotFound' });
    }

    const newPassword = newPasswordDto.newPassword;
    const hashedPassword = await encoding.encodePassword(newPassword);
    user.password = hashedPassword;
    user.save();

    return res.render('successfulNewPassword', { user: 'eventee' });
  }catch(err){
    return res.render('catchError', { catchError: err.message });
  }
  }

  //----------------------------------------Getting Eventee dashboard---------------------------------------------------------
  async getDashboard(req: Request, res: Response, page: any) {
    try {
      await this.Authservice.ensureLogin(req, res);

      const allPages = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20,
      ];
      let stringifyPage:any = req.query.page || 0 
      let page = parseInt(stringifyPage)
     
          const allEvents = await this.cacheService.get(
            `eventeeAllEvents_${res.locals.user.id}`,
          );
          const postedEvents = await this.cacheService.get(
            `eventeeDashBoard_${res.locals.user.id}_${page}`,
          );

          if (!postedEvents) {
            const eventPerPage: number = 10;

            const allEvents = await this.eventModel
              .find({ state: 'Posted' })
              .sort({ created_date: 'desc' })
              .populate('creatorId');

            const postedEvents = await this.eventModel
              .find({ state: 'Posted' })
              .sort({ created_date: 'desc' })
              .skip(page * eventPerPage)
              .limit(eventPerPage)
              .populate('creatorId');

            if (!postedEvents) {
              return [];
            }

            const maxPage = Math.round(allEvents.length / eventPerPage);
            const skip = page * eventPerPage;

            let passdays = [];
            postedEvents.forEach((event) => {
              let postDate = event.posted_date;
              let parsedDate = DateTime.fromFormat(
                postDate,
                "LLL d, yyyy",
              );
              let currentDate = DateTime.now();

              passdays.push(
                currentDate.diff(parsedDate, 'days').toObject().days,
              );
            });

            await this.cacheService.set(
              `eventeeAllEvents_${res.locals.user.id}`,
              allEvents,
            );

           
            await this.cacheService.set(
              `eventeeDashBoard_${res.locals.user.id}_${page}`,
              postedEvents,
            );
            

            return res.render('eventeeDashboard', {
              user: res.locals.user,
              postedEvents,
              page,
              maxPage,
              allPages,
              skip,
              passdays: passdays,
              date: DateTime.now().toFormat('LLL d, yyyy'),
            });
          }
          
          const eventPerPage: number = 10;
          const maxPage = Math.round(allEvents.length / eventPerPage);
          const skip = page * eventPerPage;

          let passdays = [];
          postedEvents.forEach((event) => {
            let postDate = event.posted_date;
            let parsedDate = DateTime.fromFormat(
              postDate,
              "LLL d, yyyy",
            );
            let currentDate = DateTime.now();

            passdays.push(currentDate.diff(parsedDate, 'days').toObject().days);
          });

          return res.render('eventeeDashboard', {
            user: res.locals.user,
            postedEvents,
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


//-----------------------Filtering the events by categories-----------------------

  async filterEvent(req:Request, res:Response, category:string){
    try{
      await this.Authservice.ensureLogin(req, res)

      const allPages = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20,
      ];

      const category:any = req.query.category || "All"

      let stringifyPage:any = req.query.page || 0 
      let page = parseInt(stringifyPage)
     
          const allEvents = await this.cacheService.get(
            `eventeeFilterdAllEvents_${res.locals.user.id}`,
          );
          const postedEvents = await this.cacheService.get(
            `eventeeFilterdDashBoard_${res.locals.user.id}_${category}`,
          );

     if(!postedEvents){
      // const postedEvents = await this.eventModel.find({category:category})
      const eventPerPage: number = 10;

      let allEvents:object[] = [];
      if(category == "All"){
        allEvents = await this.eventModel
        .find({ state: 'Posted'})
        .sort({ created_date: 'desc' })
        .populate('creatorId');
      }else{
        allEvents = await this.eventModel
        .find({ state: 'Posted', category:category })
        .sort({ created_date: 'desc' })
        .populate('creatorId');
      }
      
      let postedEvents:any
      if(category == "All"){
        postedEvents = await this.eventModel
        .find({ state: 'Posted'})
        .sort({ created_date: 'desc' })
        .skip(page * eventPerPage)
        .limit(eventPerPage)
        .populate('creatorId');
      }else{
        postedEvents = await this.eventModel
        .find({ state: 'Posted', category:category })
        .sort({ created_date: 'desc' })
        .skip(page * eventPerPage)
        .limit(eventPerPage)
        .populate('creatorId');
      }
      

      if (!postedEvents) {
        return [];
      }

      const maxPage = Math.round(allEvents.length / eventPerPage);
      const skip = page * eventPerPage;

      let passdays = [];
      postedEvents.forEach((event) => {
        let postDate = event.posted_date;
        let parsedDate = DateTime.fromFormat(
          postDate,
          "LLL d, yyyy",
        );
        let currentDate = DateTime.now();

        passdays.push(
          currentDate.diff(parsedDate, 'days').toObject().days,
        );
      });

      await this.cacheService.set(
        `eventeeFilterdAllEvents_${res.locals.user.id}`,
        allEvents,
      );

     
      await this.cacheService.set(
        `eventeeFilterdDashBoard_${res.locals.user.id}_${category}`,
        postedEvents,
      );
    
      return res.render('eventeeDashboard', {
        user: res.locals.user,
        postedEvents,
        page,
        maxPage,
        allPages,
        skip,
        passdays: passdays,
        date: DateTime.now().toFormat('LLL d, yyyy'),
      });
     }

     const eventPerPage: number = 10;
     const maxPage = Math.round(allEvents.length / eventPerPage);
     const skip = page * eventPerPage;

     let passdays = [];
     postedEvents.forEach((event) => {
       let postDate = event.posted_date
       let parsedDate = DateTime.fromFormat(
         postDate,
         "LLL d, yyyy",
       );
       let currentDate = DateTime.now();

       passdays.push(currentDate.diff(parsedDate, 'days').toObject().days);
     });

     return res.render('eventeeDashboard', {
       user: res.locals.user,
       postedEvents,
       page,
       maxPage,
       allPages,
       skip,
       passdays: passdays,
       date: DateTime.now().toFormat('LLL d, yyyy'),
     });

    }catch(err){
      return res.render('catchError', { catchError: err.message });
    }
  }

//--------------------------Searching for event by Title------------------------
  async searchForTitle(req:Request, res:Response, title:string){
    try{
      await this.Authservice.ensureLogin(req,res)
      const lowerCaseTitle = req.query.title.toString()
      const upperCaseTittle = lowerCaseTitle.toUpperCase()

      let event = await this.cacheService.get(`searchedTitle_${res.locals.user.id}_${upperCaseTittle}`)

        if(!event){
         

        const event = await this.eventModel.findOne({state:"Posted", title:upperCaseTittle}).populate("creatorId")

        if(!event){
          return res.render("dashboardByTitle", {
            event,
            user: res.locals.user,
            date: DateTime.now().toFormat('LLL d, yyyy'),
          })
        }

        await this.cacheService.set(`searchedTitle_${res.locals.user.id}_${upperCaseTittle}`, event)


        let postDate = event.posted_date
        let parsedDate = DateTime.fromFormat(
          postDate,
          "LLL d, yyyy",
        );
        let currentDate = DateTime.now();

        const passday = currentDate.diff(parsedDate, 'days').toObject().days

        
        return res.render("dashboardByTitle", {
          event,
          user: res.locals.user,
          date: DateTime.now().toFormat('LLL d, yyyy'),
          passday:passday

        })
      }


      let postDate = event.posted_date
      let parsedDate = DateTime.fromFormat(
        postDate,
        "LLL d, yyyy",
      );
      let currentDate = DateTime.now();

      const passday = currentDate.diff(parsedDate, 'days').toObject().days

      
      return res.render("dashboardByTitle", {
        event,
        user: res.locals.user,
        date: DateTime.now().toFormat('LLL d, yyyy'),
        passday:passday

      })
 
    }catch(err){
      return res.render('catchError', { catchError: err.message });
    }    
  }


  //---------------------Initializing transaction to buy ticket-----------------------------------------
  
  async buyTicket(eventId: string, price: number, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      
      const event = await this.eventModel.findOne({_id:eventId}).populate("creatorId")
      if(!event){
        return res.render("error", {message:"eventNotFound"})
      }

      const creator = await this.creatorModel.findOne({_id:event.creatorId})
      if(!creator){
        return res.render("error", {message:"creatorNotFound"})
      }
     

     const wallet = await this.walletModel.findOne({creatorId:creator.id, status:"active"})
      if(!wallet){
        return res.render("error", {message:"inactiveWallet"})
      }

      let regDeadline = DateTime.fromFormat(event.registration_deadline, "LLL d, yyyy")
      let currentDate = DateTime.now();
      let difference = currentDate.diff(regDeadline, 'days').toObject().days
      
      if(difference > 0){
        return res.render("error", {message:"expired registration"})
      }

      const eventee = await this.eventeeModel.findOne({
        _id: res.locals.user.id,
      });

      let NairaPerDollar = await this.currencyService.getExchangeRate(res)
      let thePriceInNaira = await this.currencyService.convertDollarToNaira(price , NairaPerDollar ) 

      const transaction = await this.transactionModel.create({
        amount: `${+price}`,
        type:"credit",
        eventId: eventId,
        eventeeId: eventee._id,
        creatorId:creator._id
      });

      const data = {
        amount: thePriceInNaira * 100,
        email: eventee.email,
        reference: transaction._id,
      };

      const headers = {
        Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
      };

      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        data,
        { headers },
      );

      return res.redirect(response.data.data.authorization_url)
    } catch (err) {
      console.log(err)
      res.render('catchError', { catchError: err.message });
    }
  }

  //-------------------------------Paystack call back after successful or failed transaction----------------------------------------
  async processPaystackCallBack(req: Request, res: Response) {
    try {
      const body = req.body;
      let transaction = await this.transactionModel
        .findOne({ _id: body.data.reference })
        .populate('eventeeId')
        .populate('eventId');

      if (!transaction) {
        res.render("error", {message:'Transaction is not found'});
      }

      if (body.event === 'charge.success') {
        transaction.status = 'success';
        transaction.save();

        const event = await this.eventModel.findOne({
          _id: transaction.eventId,
        }).populate("creatorId")

        event.ticketedEventeesId.push(transaction.eventeeId);

        event.unticketedEventeesId.splice(
          event.unticketedEventeesId.indexOf(transaction.eventeeId),
          1,
        );
        event.save();

        const creator = await this.creatorModel.findOne({_id:event.creatorId}).populate("allTicketedEventeesId")
        creator.allTicketedEventeesId.push(transaction.eventeeId)
        creator.save()
        
        const eventee = await this.eventeeModel.findOne({
          _id: transaction.eventeeId,
        });

        eventee.event_count = eventee.event_count + 1;
        eventee.bought_eventsId.push(event._id);
        eventee.save();

      const wallet = await this.walletModel.findOne({creatorId:creator.id, status:"active"})
      if(!wallet){
        return res.render("error", {message:"inactiveWallet"})
      }

      let amountInDollar = parseInt(transaction.amount) 

      wallet.balance = wallet.balance + (amountInDollar - (0.2 * amountInDollar))
      
      wallet.transactions.push(transaction._id)
      wallet.updatedAt = DateTime.now().toFormat('LLL d, yyyy \'at\' HH:mm')
      wallet.save()

      const exchangeRate = await this.currencyService.getExchangeRate(res)
      const amountPaidInNaira = Math.round(parseInt(transaction.amount)  * exchangeRate)

        const data = {
          name: `${eventee.first_name} ${eventee.last_name}`,
          event_title: event.title,
          amount: `NGN${amountPaidInNaira}`,
          ticketed_date: transaction.created_date,
          transactionId: transaction._id,
          eventId:event._id
        };

        const stData = JSON.stringify(data);

        const codeURL = await qrcode.toDataURL(stData);

        await this.mailservice.sendVerificationEmail({
          email: eventee.email,
          subject: 'Here is your Ticket',
          html: `<div>
        <p>Congratulation!!</p>
        <p>We are delighted to have you as an attendee for the event titled <b>"${event.title}"</b></p>
        <p>Below is your QR code.It is your Ticket to the event. Meaning this email must be presented at the venue for Verification.</p>
        <img src="${codeURL}" alt="Qr code" style="width: 200px; height: 200px"/>
        <p><strong>Note:</strong> A screenshot of the code is not verifiable.</p>
        <p>Your compliance will be appreciated. Thanks.</p>
        </div>`,
        });
      }

      if (body.event === 'charge.failed') {
        transaction.status = 'failed';
        transaction.save();
      }

      return res.send('call back received')
    } catch (err) {
      res.render('catchError', { catchError: err.message });
    }
  }

  //-------------------------------Paystack call for successful transaction page---------------------------------------
  async getPaymentSuccessPage(res:Response) {
    try{
      return res.render('paymentSuccess');
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }



// Bought events Page
async  getBoughtEventsPage(req:Request, res:Response) {
  try{
    await this.Authservice.ensureLogin(req,res)
    const eventee = await this.eventeeModel.findOne({_id:res.locals.user.id}).populate("bought_eventsId")
    let boughtEvents = []
    let count = 0
    for (const event of eventee.bought_eventsId){
      boughtEvents.push(event)
      count++
    }
    return res.render('boughtEvents', {boughtEvents, count});
  }catch(err){
    return res.render("catchError", {catchError:err.message});
  }
}

// Attended events Page
async  getAttendedEventsPage(req:Request, res:Response) {
  try{
    await this.Authservice.ensureLogin(req,res)
    const eventee = await this.eventeeModel.findOne({_id:res.locals.user.id}).populate("attended_eventsId")
    let attendedEvents = []
    let count = 0
    for (const event of eventee.attended_eventsId){
      attendedEvents.push(event)
      count++
    }
    return res.render('attendedEvents', {attendedEvents, count});
  }catch(err){
    return res.render("catchError", {catchError:err.message});
  }
}


  //--------------------------------Setting days to get reminded of coming events-----------------------------------
  async resetReminderDays(
    eventId: String,
    eventeeId: string,
    UpdateEventeeDto: UpdateEventeeDto,
    req: any,
    res: Response,
  ) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const event = await this.eventModel.findOne({ _id: eventId });
      if (!event) {
        return res.render('error', { message: 'eventNotfound' });
      }

      const eventee = await this.eventeeModel.findOne({ _id: eventeeId });
      if (!eventee) {
        return res.render('error', { message: 'eventeeNotfound' });
      }

      eventee.eventeeReminder_days = UpdateEventeeDto.eventeeReminder_days;
      eventee.save();

      req.flash("eventeeReminderUpdate", "Successful reminder day setting.")
      return res.redirect('/events/MyCheckList');
    } catch (err) {
      return res.render('catchError', { catchError: err.message });
    }
  }
}
