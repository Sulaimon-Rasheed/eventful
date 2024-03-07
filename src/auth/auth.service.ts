import { Injectable } from '@nestjs/common';
import * as jwt from "jsonwebtoken"
import * as dotenv from "dotenv"
import {Request, Response} from 'express';
dotenv.config()

@Injectable()
export class AuthService {
    private readonly jwtSecret: string = process.env.JWT_SECRET;

    generateJwtToken(id: object, email:string, name:string, image:object, res:Response): string {
        try{
            const tokenPayload = { id, email, name, image };
            return jwt.sign(tokenPayload, this.jwtSecret, { expiresIn: '2h' }); 
        }catch(err){
            res.render("catchError", {catchError:err.message})
        }
    
    }

    async ensureLogin(req:Request, res:Response){
        try{
            const token:string = req.cookies.jwt
            if(!token){
               return res.redirect("/")
            }
    
            const decoded = await jwt.verify(token, this.jwtSecret)
    
            res.locals.user = decoded
        }catch(err){
            res.render("catchError", {catchError:err.message})
        }
       
    }

}
