import { Request } from 'express';

interface RequestWithFlash extends Request {
  flash(type: string, message: string): void;
}

export default RequestWithFlash;
