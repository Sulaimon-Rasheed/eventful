import { Injectable } from '@nestjs/common';
import axios, { AxiosError } from "axios"
import * as dotenv from "dotenv"
dotenv.config()

@Injectable()
export class SocialmediaService {
    async shareOnFacebook(content: { title: string; description: string; url: string }) {
        const accessToken =process.env.FB_ACCESS_TOKEN;
    
        try {

          
        //   Make a POST request to share the content on Facebook
          const response = await axios.post(
            `https://graph.facebook.com/feed`,
            {
              access_token: accessToken,
              message: `${content.title}: ${content.description}`,
              link: content.url,
            }
          );
    
          // Handle the response (e.g., check for success or errors)
          console.log(response.data);
        } catch (error) {
          console.error('Error sharing on Facebook:', error.response?.data || error.message);
          if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            console.error('Error message:', axiosError.message);
            console.error('Status code:', axiosError.response?.status);
        } else {
            console.error('Error message:', error.message);
        }
        }
      }
    
}
