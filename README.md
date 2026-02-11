# Instagram Poster App 🚀

A NestJS application that allows you to publish posts to Instagram using the Instagram Graph API.

## Description

This application provides a REST API endpoint to publish image posts to Instagram. It handles the complete Instagram posting workflow:
1. Creates a media container with your image and caption
2. Waits for Instagram to process the media
3. Publishes the post to Instagram

Built with [NestJS](https://github.com/nestjs/nest) - A progressive Node.js framework for building efficient and scalable server-side applications.

## Features

✅ Publish image posts to Instagram  
✅ Automatic retry logic with delay  
✅ Comprehensive error handling  
✅ Input validation  
✅ Logging and monitoring  
✅ Clean architecture with modules  

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Instagram Business or Creator Account
- Facebook Page connected to your Instagram account
- Instagram Graph API access token

## Project Setup

```bash
# Install dependencies
$ npm install
```

## Configuration

The Instagram credentials are currently hardcoded in `src/instagram/instagram.service.ts`:

- `instagramAccountId`: Your Instagram Business Account ID
- `accessToken`: Your Instagram Graph API access token

**Note**: For production, move these to environment variables.

## Compile and Run the Project

```bash
# development
$ npm run start

# watch mode (auto-reload on changes)
$ npm run start:dev

# production mode
$ npm run start:prod
```

The server will start on `http://localhost:3000`

## API Documentation

### POST `/instagram/publish`

Publishes a post to Instagram with an image and caption.

**Request Body:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "caption": "Your post caption here 🚀"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "mediaId": "18012345678901234",
  "message": "Post published successfully on Instagram"
}
```

**Example with cURL:**
```bash
curl -X POST http://localhost:3000/instagram/publish \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://images.unsplash.com/photo-1683721003111-070bcc053d8b",
    "caption": "Hello from the API 🚀"
  }'
```

For complete API documentation, see [INSTAGRAM_API.md](./INSTAGRAM_API.md)

## Project Structure

```
src/
├── instagram/
│   ├── instagram.controller.ts   # HTTP request handling
│   ├── instagram.service.ts      # Business logic & Instagram API calls
│   ├── instagram.dto.ts          # Data transfer objects & validation
│   └── instagram.module.ts       # Module definition
├── app.module.ts                 # Root module
└── main.ts                       # Application entry point
```

## Run Tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Build

```bash
# Build the application
$ npm run build

# Run the built application
$ npm run start:prod
```

## Technologies Used

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **Axios** - HTTP client for Instagram API calls
- **class-validator** - Decorator-based validation
- **class-transformer** - Object transformation

## Error Handling

The application includes comprehensive error handling:
- Input validation for URLs and required fields
- Instagram API error responses with detailed messages
- Logging at each step of the process
- Graceful error responses to clients

## Logging

All operations are logged:
- Media container creation
- Wait time for processing
- Publishing status
- Errors and exceptions

Monitor logs in the console when running the application.

## Future Improvements

- [ ] Environment variables for configuration
- [ ] Support for video posts
- [ ] Support for carousel posts (multiple images)
- [ ] Rate limiting
- [ ] Post scheduling functionality
- [ ] Retry logic with exponential backoff
- [ ] Health check endpoint
- [ ] Metrics and monitoring
- [ ] Docker support

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Instagram Content Publishing API](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)

## License

This project is [MIT licensed](LICENSE).
