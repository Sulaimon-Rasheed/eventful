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
import { SocialmediaService } from 'src/socialmedia/socialmedia.service';
dotenv.config();
import {DateTime} from "luxon"
import { Auth0Service } from 'src/auth/auth0.service';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel('Event') private eventModel: Model<Event>,
    @InjectModel('Creator') private readonly creatorModel: Model<Creator>,
    private readonly mailservice: MailerService,
    private readonly Authservice: AuthService,
    private readonly socialmediaService:SocialmediaService,
    private readonly Auth0servce:Auth0Service,
    private readonly cacheService:CacheService
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

      const result = await v2.uploader.upload(filePath, {
        folder: 'eventful_event_image',
      });

      const luxonDeadlineDateTime = DateTime.fromISO(createEventDto.registration_deadline);
      const formattedDeadlineDate = luxonDeadlineDateTime.toFormat('LLL d, yyyy');

      const luxonEventDateTime = DateTime.fromISO(createEventDto.event_date);
      const formattedEventDate = luxonEventDateTime.toFormat('LLL d, yyyy');

      const upperCaseTittle = createEventDto.title.toUpperCase()

      const newEvent: object = await this.eventModel.create({
        title: upperCaseTittle,
        description: createEventDto.description,
        location: createEventDto.venue,
        event_date:formattedEventDate ,
        starting_time:createEventDto.starting_time,
        ending_time:createEventDto.ending_time,
        reminder_days:createEventDto.reminder_days,
        category:createEventDto.category,
        registration_deadline:formattedDeadlineDate,
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
    const user = await this.creatorModel.findOne({ _id: res.locals.user.id });
    if (user.freePlan == false) {
      res.render("error", {message:"planError"})
    }
    return `eventCreationPage`;
  }


  async getEventUpdatePage(req:Request, res:Response, eventId:string){
    try{
      await this.Authservice.ensureLogin(req,res)

      let event = await this.cacheService.get(`eventUpdate_${res.locals.user.id}_${eventId}`)
      
      if(!event){
        let event = await this.eventModel.findOne({_id:eventId})
        
        if(!event){
          return res.render("error", {message:"eventNotFound"})
        }

        await this.cacheService.set(`eventUpdate_${res.locals.user.id}_${eventId}`, event)
        
        return res.render("eventUpdatePage", {event, user:res.locals.user.id})
      }

      return res.render("eventUpdatePage", {event, user:res.locals.user.id})
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }

  async updateEvent(req:Request, res:Response, eventId:string, UpdateEventDto:UpdateEventDto){
    try{
      await this.Authservice.ensureLogin(req,res)
  
        const event = await this.eventModel.findByIdAndUpdate(eventId, {description:UpdateEventDto.description})
        if(!event){
          return res.render("error", {message:"eventNotFound"})
        }
       
        return res.redirect(`/events/eventUpdatePage/${event._id}`)
      
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }

  async deleteEvent(req:Request, res:Response, eventId:string){
    try{
      await this.Authservice.ensureLogin(req,res)
      const event = await this.eventModel.findByIdAndDelete(eventId)
      if(!event){
        return res.render("error", {message:"eventNotFound"})
      }

      return res.send("Event successfully deleted")
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
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
        posted_date:DateTime.now().toFormat('LLL d, yyyy'),
      });
      return res.redirect('/creators/creatorDashboard');
    } catch (err) {
      return res.render("catchError", {catchError:err.message});
    }
  }

  async chooseEvent(eventId: string, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const chosenEvent = await this.eventModel.findOne({ _id: eventId });
      if (chosenEvent.unticketedEventeesId.includes(res.locals.user.id)) {
        return res.render("error", {message:"eventListedBefore"});
      }
      if (chosenEvent.ticketedEventeesId.includes(res.locals.user.id)) {
        return res.render("error", {message:"ticketBoughtBefore"});
      }


      let regDeadline = DateTime.fromFormat(chosenEvent.registration_deadline, "LLL d, yyyy")
      let currentDate = DateTime.now();
      let difference = currentDate.diff(regDeadline, 'days').toObject().days
      
      if(difference > 0){
        return res.render("error", {message:"expired registration"})
      }

      chosenEvent.unticketedEventeesId.push(res.locals.user.id);
      await chosenEvent.save();
      return res.redirect('/eventees/eventeeDashboard');
    } catch (err) {
      return res.render("catchError", {catchError:err.message});
    }
  }

  async removeEvent(eventId: string, req: Request, res: Response) {
    try {
      await this.Authservice.ensureLogin(req, res);
      const eventToRemove = await this.eventModel.findOne({ _id: eventId });
      if (!eventToRemove.unticketedEventeesId.includes(res.locals.user.id) && !eventToRemove.ticketedEventeesId.includes(res.locals.user.id)) {
        return res.render("error", {message:"eventNotOnListBefore"});
      }

      if (eventToRemove.ticketedEventeesId.includes(res.locals.user.id) && !eventToRemove.unticketedEventeesId.includes(res.locals.user.id)) {
        return res.render("error", {message:"eventNotRemovable"});
      }

      const index = eventToRemove.unticketedEventeesId.indexOf(res.locals.user.id);
      eventToRemove.unticketedEventeesId.splice(index, 1);
      eventToRemove.save();
      return res.redirect('/eventees/eventeeDashboard');
    } catch (err) {
      return res.render("catchError", {catchError:err.message});
    }
  }

  async getMyCheckList(req: Request, res: Response) {
    try{
    await this.Authservice.ensureLogin(req, res);
    // const myCheckLists = await this.cacheService.get(`event_${res.locals.user.id}`)
    // if(!myCheckLists){
      const events = await this.eventModel.find().sort({created_time:"desc"});
      let myCheckLists: object[] = [];
      
      for (const event of events) {
        if (event.unticketedEventeesId.includes(res.locals.user.id) || event.ticketedEventeesId.includes(res.locals.user.id)) {
          myCheckLists.push(event);
        }
      }
      await this.cacheService.set(`event_${res.locals.user.id}`, myCheckLists)
      let eventeeId = res.locals.user.id
      return [myCheckLists, eventeeId];
    // }
    
    // let eventeeId = res.locals.user.id
    // return [myCheckLists, eventeeId];
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }

  async shareEvent(eventId:string, res:Response){
    try{
      const event = await this.eventModel.findOne({_id:eventId})
      if(!event){
        return res.render("error", {message:"eventNotFound"})
      }

      const shareContent = {
        title: event.title,
        description: event.description,
        url: `https://628e-102-89-23-107.ngrok-free.app/events/${eventId}`,
      };

      await this.Auth0servce.login()

      await this.socialmediaService.shareOnFacebook(shareContent)
      
      return res.send ('Event shared successfully')
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }

}
