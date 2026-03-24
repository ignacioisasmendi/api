import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface CanvaDesignResult {
  editUrl: string;
  designId: string;
}

export interface CanvaExportResult {
  url: string;
  width: number;
  height: number;
}

@Injectable()
export class CanvaService {
  private readonly logger = new Logger(CanvaService.name);

  /**
   * Creates a new 1080×1080 design in the user's Canva account and returns
   * the direct editor URL and the design ID.
   */
  async createDesign(accessToken: string): Promise<CanvaDesignResult> {
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
      return {
        editUrl: data.design.urls.edit_url,
        designId: data.design.id,
      };
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

  /**
   * Exports a design as PNG by creating an export job and polling until
   * complete (up to 30 seconds). Returns the first page's download URL and
   * dimensions.
   */
  async exportDesign(
    accessToken: string,
    designId: string,
  ): Promise<CanvaExportResult> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // 1. Create export job
    const { data: jobData } = await axios.post(
      'https://api.canva.com/rest/v1/exports',
      {
        design_id: designId,
        format: { type: 'PNG', export_quality: 'regular' },
      },
      { headers },
    );

    const exportId: string = jobData.job.id;
    this.logger.debug(`Canva export job created: ${exportId}`);

    // 2. Poll until complete (max 30 seconds, every 2 seconds)
    const maxAttempts = 15;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const { data: statusData } = await axios.get(
        `https://api.canva.com/rest/v1/exports/${exportId}`,
        { headers },
      );

      const { status, urls } = statusData.job;

      if (status === 'success' && urls?.[0]) {
        const { url, width, height } = urls[0];
        this.logger.debug(`Canva export complete: ${url}`);
        return { url, width: width ?? 1080, height: height ?? 1080 };
      }

      if (status === 'failed') {
        throw new Error(`Canva export job ${exportId} failed`);
      }

      this.logger.debug(
        `Canva export job ${exportId} still in progress (attempt ${i + 1})`,
      );
    }

    throw new Error('Canva export timed out after 30 seconds');
  }
}
