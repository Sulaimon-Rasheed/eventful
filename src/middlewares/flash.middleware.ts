import * as flash from "connect-flash"
import{Response, Request, NextFunction} from "express"
import {NestMiddleware, Injectable} from "@nestjs/common"

@Injectable()
export class FlashMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    flash()(req, res, next);
  }
}