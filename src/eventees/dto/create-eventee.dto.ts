import { Prop } from "@nestjs/mongoose"
import { IsNotEmpty, IsObject, IsString, IsNumber, IsBoolean } from "class-validator"

export class CreateEventeeDto {
    @IsString()
    @IsNotEmpty()
    first_name:string

    @IsString()
    @IsNotEmpty()
    last_name:string

    @IsString()
    @IsNotEmpty()
    password:string

    @IsString()
    @IsNotEmpty()
    email:string

    @IsString()
    eventeeReminder_days:string

    @IsString()
    @IsNotEmpty()
    sex:string

    @IsString()
    @IsNotEmpty()
    country:string

    @IsString()
    @IsNotEmpty()
    state:string

    @IsString()
    @IsNotEmpty()
    phoneNum:string

    @IsString()
    agreement:string

    profileImage: any;
}
