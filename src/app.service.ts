import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request, Response } from 'express';
import { Model } from 'mongoose';
import {Event} from "./events/events.model"
import { CacheService } from './cache/cache.service';

@Injectable()
export class AppService {
  constructor( @InjectModel('Event') private eventModel: Model<Event>,private readonly cacheService:CacheService,){}
  getError(): string {
    return "error";
  }

  async getHome(req:Request, res:Response){
    let events = await this.cacheService.get("homePage")
    if(!events){
      const events = await this.eventModel
      .find({state:"Posted"})
      .populate("creatorId")
      .sort({ created_date: 'desc' })
      .limit(6)

      this.cacheService.set(`homePage`, events)
      return res.render("index", {message:'Eventful', events})
    }
    return res.render("index", {message:'Eventful', events})
  }


  getHelpCenter(req:Request, res:Response){
    return res.render("helpCenter")
  }

  getChecklisiting(req:Request, res:Response){
    return res.render("eachHelp", {help:"checklisiting"})
  }

  getTicketPurchase(req:Request, res:Response){
    return res.render("eachHelp", {help:"ticketPurchase"})
  }

  getShare(req:Request, res:Response){
    return res.render("eachHelp", {help:"share"})
  }

  getEventeeAnalytics(req:Request, res:Response){
    return res.render("eachHelp", {help:"eventeeAnalytics"})
  }

  getTicketScanning(req:Request, res:Response){
    return res.render("eachHelp", {help:"ticketScanning"})
  }

  getUpdate(req:Request, res:Response){
    return res.render("eachHelp", {help:"update"})
  }

  getPayout(req:Request, res:Response){
    return res.render("eachHelp", {help:"payout"})
  }

  getCreatorAnalytics(req:Request, res:Response){
    return res.render("eachHelp", {help:"creatorAnalytics"})
  }

  getFaq(req:Request, res:Response){
    return res.render("faq")
  }

  getTermsPage(req:any, res:Response) {
    try{
      return res.render('terms_page')
      } catch (err) {
        return res.render('catchError', { catchError: err.message });
      }
    }

    getPolicyPage(req:any, res:Response) {
      try{
        return res.render('policy_page')
        } catch (err) {
          return res.render('catchError', { catchError: err.message });
        }
      }
  
}
