import { PartialType } from '@nestjs/mapped-types';
import { CreateEventeeDto } from './create-eventee.dto';

export class UpdateEventeeDto extends PartialType(CreateEventeeDto) {}
