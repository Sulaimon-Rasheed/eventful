import * as mongoose from "mongoose"

const Schema = mongoose.Schema

export const creatorVerificationSchema = new Schema({
    creatorId: { type: String},
    uniqueString:{type: String},
    creation_date: { type: Date},
    expiring_date:{type:Date},
})

export interface CreatorVerification{
    creatorId:string
    uniqueString:string
    creation_date:Date
    expiring_date:Date
    
}