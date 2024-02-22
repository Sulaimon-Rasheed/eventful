import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class emailVerifyDto {
    @IsEmail()
    @IsNotEmpty()
    email:string   
}