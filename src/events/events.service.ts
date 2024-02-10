import { Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Request, Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Event } from './events.model';
import { Model } from 'mongoose';
import { Creator } from '../creators/creators.model';
import { MailerService } from 'src/mailer/mailer.service';
import { AuthService } from 'src/auth/auth.service';
import { v2 } from 'cloudinary';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class EventsService {
  constructor(
    @InjectModel('Event') private eventModel: Model<Event>,
    @InjectModel('Creator') private readonly creatorModel: Model<Creator>,
    private readonly mailservice: MailerService,
    private readonly Authservice: AuthService,
  ) {
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async createEvent(
    createEventDto: CreateEventDto,
    filePath: string,
    req: Request,
    res: Response,
  ) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const user = await this.creatorModel.findOne({ _id: res.locals.user.id });
      //  const user:Creator = await this.creatorModel.findOne({email:res.locals.user.email})

      if (user.freePlan == false) {
        res.send(
          'You are not eligible to post event. Your free plan as expired. You can upgrade to the payment plan',
        );
      }

      const result = await v2.uploader.upload(filePath, {
        folder: 'eventful_event_image',
      });

      const newEvent: object = await this.eventModel.create({
        title: createEventDto.title,
        description: createEventDto.description,
        location: createEventDto.location,
        event_date: createEventDto.event_date,
        category: createEventDto.category,
        registration_deadline: createEventDto.registration_deadline,
        ticket_price: createEventDto.ticket_price,
        discount: createEventDto.discount,
        event_image: result,
        additional_info: createEventDto.additional_info,
        creatorId: res.locals.user.id,
      });

      return 'successfulEvent_creation';
    } catch (err) {
      console.log(err);
      res.send(err.message);
    }
  }

  async getEventCreationPage(req: Request, res: Response) {
    await this.Authservice.ensureLogin(req, res);
    return `eventCreationPage`;
  }

  async postEvent(id: string, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const event = await this.eventModel.findOne({ _id: id });
      if (!event) {
        return res.send('Event not found');
      }
      await this.eventModel.findByIdAndUpdate(id, {
        state: 'Posted',
        posted_date: Date.now(),
      });
      return res.redirect('/creators/creatorDashboard');
    } catch (err) {
      res.send(err.message);
    }
  }

  async chooseEvent(eventId: string, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const chosenEvent = await this.eventModel.findOne({ _id: eventId });
      if (chosenEvent.unticketedEventeesId.includes(res.locals.user.id)) {
        return res.send('You have selected this event already');
      }
      chosenEvent.unticketedEventeesId.push(res.locals.user.id);
      await chosenEvent.save();
      return res.redirect('/eventees/eventeeDashboard');
    } catch (err) {
      return res.send(err.message);
    }
  }

  async removeEvent(eventId: string, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const eventToRemove = await this.eventModel.findOne({ _id: eventId });
      if (!eventToRemove.unticketedEventeesId.includes(res.locals.user.id)) {
        return res.send('This event is not on your list before now');
      }
      const index = eventToRemove.unticketedEventeesId.indexOf(res.locals.user.id);
      eventToRemove.unticketedEventeesId.splice(index, 1);
      eventToRemove.save();
      return res.redirect('/eventees/eventeeDashboard');
    } catch (err) {
      res.send(err.message);
    }
  }

  async getMyCheckList(req: Request, res: Response) {
    try{
    await this.Authservice.ensureLogin(req, res);
    const events = await this.eventModel.find();
    let myCheckLists: object[] = [];
    
    for (const event of events) {
      if (event.unticketedEventeesId.includes(res.locals.user.id) || event.ticketedEventeesId.includes(res.locals.user.id)) {
        myCheckLists.push(event);
      }
    }
    let eventeeId = res.locals.user.id
    return [myCheckLists, eventeeId];
    }catch(err){
      return res.send(err.message)
    }
  }


}
