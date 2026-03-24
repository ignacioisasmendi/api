import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CanvaService {
  private readonly logger = new Logger(CanvaService.name);

  /**
   * Creates a new blank design in the user's Canva account and returns
   * the direct editor URL.
   */
  async createDesign(accessToken: string): Promise<string> {
    try {
      const { data } = await axios.post(
        'https://api.canva.com/rest/v1/designs',
        {
          design_type: {
            type: 'custom',
            width: 1080,
            height: 1080,
            units: 'px',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return data.design.urls.edit_url;
    } catch (error) {
      this.logger.error('Canva create design failed');
      if (axios.isAxiosError(error)) {
        this.logger.error(`Status: ${error.response?.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response?.data)}`);
      } else {
        this.logger.error(error);
      }
      throw error;
    }
  }
}
