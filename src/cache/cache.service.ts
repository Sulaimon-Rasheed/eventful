import { Injectable } from '@nestjs/common';
import {caching} from "cache-manager"



@Injectable()
export class CacheService {
    private memoryCache = caching('memory', {max: 100, ttl: 5 *60 * 1000 });
    constructor( ) {}
    
      async get(key: string): Promise<any> {
        return (await this.memoryCache).get(key);
      }
    
      async set(key: string, value: any): Promise<void> {
        await (await this.memoryCache).set(key, value);
      }

      async remove(key: string): Promise<void> {
        await (await this.memoryCache).del(key);
      }
}
