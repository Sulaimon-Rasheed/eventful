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
      .limit(5)

      this.cacheService.set(`homePage`, events)
      return res.render("index", {message:'Eventful', events})
    }
    return res.render("index", {message:'Eventful', events})
  }
}
