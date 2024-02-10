import mongoose, {Schema} from "mongoose"

export const eventSchema = new Schema({
    title: { type: String, required:true},
    description: { type: String,required:true},
    location:{type:String,required:true},
    event_date:{type:Date, required:true},
    category:{type:String, required:true, enum:[" Concert", "Sport", "Theater", "Conference", "Trade Show", "Networking", "Workshop", "Product Launch", "Charity", "Seminar", "Exhibition", "Webinar", "Symposium", "Film Show"]},
    registration_deadline:{type:Date, required:true},
    ticket_price:{type:String, required:true},
    discount:{type:String},
    event_image:{type:Object, required:true},
    state:{type:String,default:"Draft"},
    additional_info:{type:String},
    created_date:{type:Date, default:new Date()},
    posted_date:{type:Date, default:null},
    creatorId:{type:Schema.Types.ObjectId, ref:"Creator"},
    unticketedEventeesId:[{type:Schema.Types.ObjectId, ref:"Eventee"}],
    ticketedEventeesId:[{type:Schema.Types.ObjectId, ref:"Eventee"}]
})


export interface Event extends mongoose.Document{
    id:string
    title:string
    description:string
    location:string
    event_date:Date
    category:string
    registration_deadline:Date
    ticket_price:string
    discount:string
    event_image:object
    state:string
    additional_info:string
    created_date:Date
    posted_date:Date
    creatorId:string
    unticketedEventeesId:string[]
    ticketedEventeesId:string[]
    
}

