import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getError(): string {
    return "error";
  }
}
