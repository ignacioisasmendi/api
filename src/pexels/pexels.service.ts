import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  PexelsPhotoSearchResponse,
  PexelsVideoSearchResponse,
  StockPhoto,
  StockVideo,
  StockVideoFile,
  StockSearchResult,
} from './pexels.types';

@Injectable()
export class PexelsService {
  private readonly logger = new Logger(PexelsService.name);
  private readonly client: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('pexels.apiKey');

    this.client = axios.create({
      baseURL: 'https://api.pexels.com',
      headers: {
        Authorization: apiKey,
      },
      timeout: 10000,
    });
  }

  async searchPhotos(
    query: string,
    page = 1,
    perPage = 20,
  ): Promise<StockSearchResult> {
    const response = await this.requestWithRetry<PexelsPhotoSearchResponse>(
      '/v1/search',
      { query, page, per_page: perPage },
    );

    const results: StockPhoto[] = response.photos.map((photo) => ({
      id: String(photo.id),
      url: photo.url,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      imageUrl: photo.src.large,
      previewUrl: photo.src.medium,
      width: photo.width,
      height: photo.height,
      attribution: `Photo by ${photo.photographer} on Pexels`,
    }));

    return {
      results,
      total_results: response.total_results,
      page: response.page,
      per_page: response.per_page,
    };
  }

  async searchVideos(
    query: string,
    page = 1,
    perPage = 20,
  ): Promise<StockSearchResult> {
    const response = await this.requestWithRetry<PexelsVideoSearchResponse>(
      '/videos/search',
      { query, page, per_page: perPage },
    );

    const results: StockVideo[] = response.videos.map((video) => {
      // Pick the best video files (HD preferred, then SD)
      const files: StockVideoFile[] = video.video_files
        .filter((f) => f.link && f.width)
        .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
        .map((f) => ({
          url: f.link,
          quality: f.quality,
          width: f.width,
          height: f.height,
        }));

      return {
        id: String(video.id),
        url: video.url,
        duration: video.duration,
        preview: video.image,
        photographer: video.user.name,
        photographerUrl: video.user.url,
        videoFiles: files,
        attribution: `Video by ${video.user.name} on Pexels`,
      };
    });

    return {
      results,
      total_results: response.total_results,
      page: response.page,
      per_page: response.per_page,
    };
  }

  private async requestWithRetry<T>(
    path: string,
    params: Record<string, unknown>,
    attempt = 1,
  ): Promise<T> {
    try {
      const response = await this.client.get<T>(path, { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Rate limit — retry after suggested delay
        if (axiosError.response?.status === 429 && attempt <= this.maxRetries) {
          const retryAfter =
            Number(axiosError.response.headers['retry-after'] ?? 1) * 1000;
          const delay = Math.max(retryAfter, this.retryDelay * attempt);

          this.logger.warn(
            `Pexels rate limit hit. Retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`,
          );

          await this.sleep(delay);
          return this.requestWithRetry<T>(path, params, attempt + 1);
        }

        // Propagate Pexels HTTP errors
        throw new HttpException(
          `Pexels API error: ${axiosError.response?.statusText ?? axiosError.message}`,
          axiosError.response?.status ?? HttpStatus.BAD_GATEWAY,
        );
      }

      throw new ServiceUnavailableException('Stock media service unavailable');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
