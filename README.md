# Pinterest-style AI Tools Learning Platform

A comprehensive Pinterest-style platform for discovering, learning, and accessing AI tools with affiliate management, payment processing, and cashback system.

## Features

### Core Functionality
- **Pinterest-style Card Grid**: Browse AI tools, tutorials, and resources in an intuitive card layout
- **Authentication**: Secure user registration and login with Clerk integration
- **Premium Content**: Tiered access with free previews and paid full content
- **Payment Processing**: Stripe integration for one-time purchases and subscriptions
- **Coupon System**: Discount codes with cashback functionality
- **User Dashboard**: Bookmarks, purchase history, and wallet management
- **Admin Dashboard**: Content management, analytics, and user administration

### Technical Features
- **Multi-language Support**: English, Telugu, and Hindi localization
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Analytics**: Click tracking, conversion analytics, and performance metrics
- **File Storage**: Secure storage for images and downloadable resources
- **SEO Optimized**: Clean URLs, meta tags, and structured data

## Tech Stack

### Backend (Encore.ts)
- **Framework**: Encore.ts with TypeScript
- **Database**: PostgreSQL with migrations
- **Authentication**: Clerk integration
- **Payments**: Stripe for processing payments and webhooks
- **Storage**: Built-in object storage for files
- **Analytics**: Custom tracking and reporting

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui component library
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with validation
- **Internationalization**: react-i18next

## Project Structure

```
backend/
├── auth/              # Authentication service
├── cards/             # Card management service
├── users/             # User management service
├── payments/          # Payment processing service
├── coupons/           # Coupon management service
├── analytics/         # Analytics and tracking service
├── storage/           # File storage service
└── db/                # Database and migrations

frontend/
├── components/        # Reusable UI components
├── pages/            # Page components
├── hooks/            # Custom React hooks
├── i18n/             # Internationalization files
└── config.ts         # Configuration settings
```

## Database Schema

### Core Tables
- **users**: User accounts, roles, and wallet balances
- **cards**: AI tools, tutorials, and content
- **categories**: Content categorization
- **purchases**: Transaction records
- **subscriptions**: Subscription management
- **coupons**: Discount codes and cashback rules
- **clicks**: Analytics and tracking data
- **cashbacks**: Cashback transactions
- **bookmarks**: User saved items

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Stripe account for payments
- Clerk account for authentication

### Environment Variables
Create the following secrets in your Encore dashboard:

```env
# Authentication
ClerkSecretKey=your_clerk_secret_key
JWTSecret=your_jwt_secret_key

# Payments
StripeSecretKey=your_stripe_secret_key
StripeWebhookSecret=your_stripe_webhook_secret
```

### Frontend Configuration
Update `frontend/config.ts` with your keys:

```typescript
export const clerkPublishableKey = "your_clerk_publishable_key";
export const stripePublishableKey = "your_stripe_publishable_key";
```

### Installation & Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   encore run
   ```

3. **Database Setup**
   The database will be automatically created and migrated when you first run the application.

4. **Seed Data**
   Sample data including categories, admin user, and demo cards will be automatically inserted.

### Admin Access
- **Default Admin Email**: admin@guideitsol.com
- **Default Password**: admin123

## API Endpoints

### Public Endpoints
- `GET /cards` - List cards with filtering and pagination
- `GET /cards/:slug` - Get card details
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /coupons/validate` - Validate coupon codes

### Authenticated Endpoints
- `GET /user/profile` - Get user profile
- `POST /user/bookmark/:cardId` - Bookmark/unbookmark cards
- `GET /user/bookmarks` - Get user bookmarks
- `POST /cards/:cardId/like` - Like/unlike cards
- `POST /payments/checkout` - Create payment intent
- `POST /analytics/track-click` - Track clicks

### Admin Endpoints
- `POST /admin/cards` - Create new cards
- `GET /analytics/dashboard` - Admin analytics
- `POST /storage/upload-url` - Generate upload URLs

## Payment Flow

1. **Product Selection**: User selects card or subscription
2. **Coupon Application**: Optional coupon code validation
3. **Payment Processing**: Stripe payment intent creation
4. **Webhook Handling**: Payment confirmation via webhooks
5. **Access Granting**: Content access or subscription activation
6. **Cashback Processing**: Automatic cashback calculation and wallet credit

## Affiliate System

The platform includes a comprehensive affiliate tracking system:

- **Click Tracking**: Monitor affiliate link clicks with analytics
- **Preview Frames**: Secure preview before redirecting to affiliate sites
- **Commission Tracking**: Track affiliate performance and payouts
- **Analytics Dashboard**: Comprehensive reporting for administrators

## Multi-language Support

The platform supports three languages:
- **English** (default)
- **Telugu** (regional)
- **Hindi** (regional)

Language files are located in `frontend/i18n/locales/` and can be extended easily.

## Deployment

The application is designed to be deployed on Encore's cloud platform:

1. **Push to Repository**
   ```bash
   git push
   ```

2. **Environment Setup**
   Configure secrets in the Encore dashboard

3. **Domain Configuration**
   Set up custom domain and SSL certificates

4. **Monitoring**
   Use built-in monitoring and logging features

## Security Features

- **Authentication**: Secure JWT-based authentication with Clerk
- **Authorization**: Role-based access control (user/admin)
- **Payment Security**: PCI-compliant Stripe integration
- **Data Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for production domains
- **Rate Limiting**: Built-in protection against abuse

## Performance Optimizations

- **Database Indexing**: Optimized queries with proper indexes
- **Image Optimization**: Lazy loading and responsive images
- **Caching**: Query caching with TanStack Query
- **Code Splitting**: React lazy loading for optimal bundle sizes
- **CDN Integration**: Static asset delivery optimization

## Contact Information

For support and inquiries:
- **Info**: info@guideitsol.com
- **Sales**: sales@guideitsol.com
- **Demo**: demo@guideitsol.com

## License

This project is proprietary software. All rights reserved.
