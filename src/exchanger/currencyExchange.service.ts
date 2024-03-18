import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from "dotenv"
import { Response } from 'express';
dotenv.config()


@Injectable()
export class CurrencyService {
  private readonly apiKey = process.env.EXCHANGE_KEY;

  async getExchangeRate(res:Response): Promise<number> {
    try {
      const response = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${this.apiKey}`);
      const exchangeRates = response.data.rates;
      return exchangeRates['NGN']; 
    } catch (err) {
      res.render("catchError", {message:err.message})
    }
  }

  convertDollarToNaira(amountInDollar: number, exchangeRate: number): number {
    return amountInDollar * exchangeRate;
  }
}