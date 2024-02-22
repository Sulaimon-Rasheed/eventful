import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
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
import { UpdateEventDto } from 'src/events/dto/update-event.dto';
import { CacheService } from 'src/cache/cache.service';
import { emailVerifyDto } from './dto/email-verify.dto';
import { newPasswordDto } from './dto/newPassword.dto';
// import RequestWithFlash from "../requestWithFlash"
import { DateTime } from 'luxon';

@Injectable()
export class CreatorsService {
  constructor(
    @InjectModel('Creator') private readonly creatorModel: Model<Creator>,
    @InjectModel('CreatorVerification')
    private readonly creatorVerificationModel: Model<CreatorVerification>,
    @InjectModel('Event') private readonly eventModel: Model<Event>,
    @InjectModel('Eventee') private readonly eventeeModel: Model<Eventee>,
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
        profileImage: result,
        password: password,
      });

      fs.unlink(filePath, (err) => {
        if (err) {
          throw new Error('file unlink failed');
        }
      });

      const currUrl = 'http://localhost:8000';
      let uniqueString = newCreator._id + uuidv4();

      const hashedUniqueString = await encoding.encodePassword(uniqueString);

      await this.creatorVerificationModel.create({
        creatorId: newCreator._id,
        uniqueString: hashedUniqueString,
        creation_date: Date.now(),
        expiring_date: Date.now() + 21600000,
      });

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

      return res.render('successfulCreator_creation', {
        message: 'You are created successfully',
        createCreatorDto,
      });
    } catch (err) {
      return res.render('error', { catchError: err.message });
    }
  }

  getSignupPage() {
    return 'creator_signup_page';
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
      return res.render('error', { catchError: err.message });
    }
  }

  getLoginPage() {
    return `creatorLogin_page`;
  }

  getPasswordResetPagePage(res: Response) {
    return res.render('passwordReset', { user: 'creator' });
  }

  // Verifying the email for password reset.
  async verifyEmailForPasswordReset(
    emailVerifyDto: emailVerifyDto,
    req: Request,
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
      const currUrl = 'http://localhost:8000';
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
      return res.render('successfulResetRequest');
    } catch (err) {
      return res.render('error', { catchError: err.message });
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
      const valid = await encoding.validateEncodedString(
        resetToken,
        user.passwordResetToken,
      );
      if (!valid) {
        res.render('error', { message: 'invalidResetToken' });
      }

      user.passwordResetToken = undefined;
      user.save();

      return res.render('newPasswordPage', {
        userId: user._id,
        user: 'creator',
      });
    } catch (err) {
      return res.render('error', { catchError: err.message });
    }
  }

  async setNewPassword(
    newPasswordDto: newPasswordDto,
    userId: string,
    res: Response,
  ) {
    const user = await this.creatorModel.findOne({ _id: userId });
    if (!user) {
      return res.render('error', { message: 'creatorNotFound' });
    }

    const newPassword = newPasswordDto.newPassword;
    console.log(newPassword);
    const hashedPassword = await encoding.encodePassword(newPassword);
    console.log(hashedPassword);
    user.password = hashedPassword;
    user.save();

    return res.render('successfulNewPassword', { user: 'creator' });
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

      res.cookie('jwt', token, { maxAge: 60 * 60 * 1000 });

      return res.redirect(`/creators/creatorDashboard`);
    } catch (err) {
      return res.render('error', { catchError: err.message });
    }
  }

  async getDashboard(req: Request, res: Response, page: any) {
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
        const eventPerPage: number = 1;

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

      const eventPerPage: number = 1;
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
          const eventPerPage: number = 1;

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
          const eventPerPage: number = 1;

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

      const eventPerPage: number = 1;
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
      // const unticketedEventees = await this.cacheService.get(`unticketedEventees_${res.locals.user.id}`)
      // const count = await this.cacheService.get(`unticketedCount_${res.locals.user.id}`)
      // await this.cacheService.remove(`unticketedEventees_${res.locals.user.id}`)
      // await this.cacheService.remove(`unticketedCount_${res.locals.user.id}`)
      // if(!unticketedEventees && !count){
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
      //   await this.cacheService.set(`unticketedEventees_${res.locals.user.id}`, unticketedEventees)
      //   await this.cacheService.set(`unticketedCount_${res.locals.user.id}`, count)
      //   return [unticketedEventees,count]
      // }

      return [unticketedEventees, count];
    } catch (err) {
      return res.render('error', { catchError: err.message });
    }
  }

  async getTicketedEventees(eventId: string, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      // const ticketedEventees = await this.cacheService.get(`ticketedEventees_${res.locals.user.id}`)
      // const count = await this.cacheService.get(`ticketedCount_${res.locals.user.id}`)
      // await this.cacheService.remove(`ticketedEventees_${res.locals.user.id}`)
      // await this.cacheService.remove(`ticketedCount_${res.locals.user.id}`)
      // if(!ticketedEventees && !count){
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
      // await this.cacheService.set(`ticketedEventees_${res.locals.user.id}`, ticketedEventees)
      // await this.cacheService.set(`ticketedCount_${res.locals.user.id}`, count)

      // return [ticketedEventees,count]
      // }

      return [ticketedEventees, count];
    } catch (err) {
      res.send(err.message);
    }
  }

  async resetReminderDays(
    eventId: String,
    UpdateEventDto: UpdateEventDto,
    req: Request,
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

      return res.redirect('/creators/creatorDashboard');
    } catch (err) {
      console.log(err);
    }
  }
}
