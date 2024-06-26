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
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();
import {DateTime} from "luxon"
import { CacheService } from 'src/cache/cache.service';
import  * as sanitizeHtml from "sanitize-html"

@Injectable()
export class EventsService {
  constructor(
    @InjectModel('Event') private eventModel: Model<Event>,
    @InjectModel('Creator') private readonly creatorModel: Model<Creator>,
    private readonly Authservice: AuthService,
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
    event_image:Express.Multer.File,
    req: any,
    res: Response,
  ) {
    try {
      await this.Authservice.ensureLogin(req, res);

      const result = await v2.uploader.upload(event_image.path, {
        folder: 'eventful_event_image',
      });

      if (!result) {
        return res.render('error', { message: 'fileUploadError' });
      }

      const luxonDeadlineDateTime = DateTime.fromISO(createEventDto.registration_deadline);
      const formattedDeadlineDate = luxonDeadlineDateTime.toFormat('LLL d, yyyy');

      const luxonEventDateTime = DateTime.fromISO(createEventDto.event_date);
      const formattedEventDate = luxonEventDateTime.toFormat('LLL d, yyyy');

      const upperCaseTittle = createEventDto.title.toUpperCase()
      const upperCaseLocation = createEventDto.hosting_state.toUpperCase()
      
      const sanitizedContent = sanitizeHtml(createEventDto.description);
      const sanitizedAddContent = sanitizeHtml(createEventDto.additional_info);
      const newEvent = await this.eventModel.create({
        title: upperCaseTittle,
        description: sanitizedContent,
        location: createEventDto.venue,
        event_date:formattedEventDate ,
        starting_time:createEventDto.starting_time,
        ending_time:createEventDto.ending_time,
        venue:createEventDto.venue,
        hosting_state:upperCaseLocation,
        hosting_country:createEventDto.hosting_country,
        reminder_days:createEventDto.reminder_days,
        category:createEventDto.category,
        registration_deadline:formattedDeadlineDate,
        ticket_price: createEventDto.ticket_price,
        event_image: result,
        additional_info:sanitizedAddContent,
        creatorId: res.locals.user.id,
      });

      fs.unlink(event_image.path, (err) => {
        if (err) {
          console.log(err.message)
        }
      });

      const creator = await this.creatorModel.findOne({_id:res.locals.user.id})
      if(!creator){
        return res.render("error", {message:"creatorNotFound"})
      }


      creator.eventsId.push(newEvent._id)
      
      req.flash("eventCreationSuccessful", "Successful event creation")
      
      return res.redirect("/events/createEvent");
    
    } catch (err) {
      return res.render("catchError", {catchError:err.message});
    }
  }

  async getEventCreationPage(req:any, res: Response) {
    try{
      await this.Authservice.ensureLogin(req, res);
      const user = await this.creatorModel.findOne({ _id: res.locals.user.id });
     
      if (user.freePlan == false) {
        res.render("error", {message:"planError"})
      }
        const eventDelMessage = req.flash("eventDel")
        const successfulCreation = req.flash("eventCreationSuccessful")
        return res.render(`eventCreationPage`,{successfulCreation, eventDelMessage} );
    } catch (err) {
      return res.render("catchError", {catchError:err.message});
    }
  }


  async getEventUpdatePage(req:any, res:Response, eventId:string){
    try{
      await this.Authservice.ensureLogin(req,res)

      let event = await this.cacheService.get(`eventUpdate_${res.locals.user.id}_${eventId}`)
      
      if(!event){
        let event = await this.eventModel.findOne({_id:eventId})
        
        if(!event){
          return res.render("error", {message:"eventNotFound"})
        }

        await this.cacheService.set(`eventUpdate_${res.locals.user.id}_${eventId}`, event)
        
        const updateSuccessMessage = req.flash('updateSuccess')
        const reminderSuccessMessage = req.flash('reminderUpdate')
        const priceChangeMessage = req.flash("priceChange")
        
        return res.render("eventUpdatePage", {event, user:res.locals.user.id, updateSuccessMessage, reminderSuccessMessage, priceChangeMessage })
      }

      const updateSuccessMessage = req.flash('updateSuccess')
      const reminderSuccessMessage = req.flash('reminderUpdate')
      const priceChangeMessage = req.flash("priceChange")
      return res.render("eventUpdatePage", {event, user:res.locals.user.id, updateSuccessMessage, reminderSuccessMessage, priceChangeMessage})
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }

  async updateEvent(req:any, res:Response, eventId:string, UpdateEventDto:UpdateEventDto){
    try{
      await this.Authservice.ensureLogin(req,res)
      const sanitizedContent = sanitizeHtml(UpdateEventDto.description);
        const event = await this.eventModel.findByIdAndUpdate(eventId, {description:sanitizedContent})
        if(!event){
          return res.render("error", {message:"eventNotFound"})
        }

        await this.cacheService.remove(`eventUpdate_${res.locals.user.id}_${eventId}`)
  
      for(let page = 0; page<100; page++){
        await this.cacheService.remove(`creatorDashBoard_${res.locals.user.id}_${page}`)
      }

        req.flash('updateSuccess', 'Successful description update')
        return res.redirect(`/events/eventUpdatePage/${event._id}`)
      
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }

  async deleteEvent(req:any, res:Response, eventId:string){
    try{
      await this.Authservice.ensureLogin(req,res)
      const event = await this.eventModel.findByIdAndDelete(eventId)
      if(!event){
        return res.render("error", {message:"eventNotFound"})
      }

      await this.cacheService.remove(`eventUpdate_${res.locals.user.id}_${eventId}`)
      
      req.flash("eventDel", "Event deleted successfully. Create another event from here.")
      return res.redirect(`/events/createEvent`)
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }



  async postEvent(id: string, req: any, res: Response) {
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

      for(let page = 0; page<100; page++){
        await this.cacheService.remove(`creatorDashBoard_${res.locals.user.id}_${page}`)
      }
      
      req.flash("successfulPosting", "Event posted successfully")
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

  async getMyCheckList(req:any, res: Response) {
    try{
    await this.Authservice.ensureLogin(req, res);
   
      const events = await this.eventModel.find().sort({created_time:"desc"});
      let myCheckLists: object[] = [];
      
      for (const event of events) {
        if (event.unticketedEventeesId.includes(res.locals.user.id) || event.ticketedEventeesId.includes(res.locals.user.id)) {
          myCheckLists.push(event);
        }
      }
      await this.cacheService.set(`event_${res.locals.user.id}`, myCheckLists)
      
      const reminderDaySuccess = req.flash("eventeeReminderUpdate")
      return res.render("myCheckList", {lists:myCheckLists, user:res.locals.user, reminderDaySuccess})
   
    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }

  async getThisEvent(eventId:string, res:Response){
    try{
      let event = await this.cacheService.get(`thisEvent_${eventId}`)
      if(!event){
        const event = await this.eventModel.findOne({_id:eventId}).populate("creatorId")
        if(!event){
          return res.render("error", {message:"eventNotFound"})
        }

        await this.cacheService.set(`thisEvent_${eventId}`, event)
  
        return res.render("thisEvent", {event})
      }

      return res.render("thisEvent", {event})
    }catch(err){
        return res.render("catchError", {catchError:err.message});
      }
  }


  async changePrice(eventId:string, req: any, res:Response, UpdateEventDto:UpdateEventDto){
    try{
      await this.Authservice.ensureLogin(req, res);
      let newPrice = UpdateEventDto.ticket_price
      const event = await this.eventModel.findByIdAndUpdate(eventId, {ticket_price:newPrice})
      if(!event){
        return res.render("error", {message:"eventNotFound"})
      }

      await this.cacheService.remove(`eventUpdate_${res.locals.user.id}_${eventId}`)

    for(let page = 0; page<100; page++){
      await this.cacheService.remove(`creatorDashBoard_${res.locals.user.id}_${page}`)
    }

      req.flash('priceChange', 'Successful price change')
      return res.redirect(`/events/eventUpdatePage/${event._id}`)


    }catch(err){
      return res.render("catchError", {catchError:err.message});
    }
  }

}
