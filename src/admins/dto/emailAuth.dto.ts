import { IsEmail, IsNotEmpty,IsString } from "class-validator";

export class EmailAuthDto {
    @IsEmail()
    @IsNotEmpty()
    email:string
}