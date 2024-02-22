import {IsNotEmpty, IsString } from "class-validator";

export class newEpasswordDto {
    @IsString()
    @IsNotEmpty()
    newPassword:string   
}