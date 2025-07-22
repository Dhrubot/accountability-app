# Voices of Uttara - Milestone Crash Registry

A secure memorial and accountability platform for victims of the July 21, 2025 Dhaka plane crash at Milestone School.

## Features

- **Secure Case Submission**: Rate-limited with CAPTCHA protection
- **Real-time Verification**: Admin moderation system
- **Public Directory**: Searchable case database
- **Statistics Dashboard**: Live counts and progress tracking
- **Built-in Security**: Application-level protection against attacks
- **Data Integrity**: Hash-based verification system

## Security Features

- Rate limiting and IP blocking
- Input sanitization and XSS protection
- CAPTCHA verification
- Threat detection and monitoring
- Data integrity hashing
- Security event logging
- Auto-scaling protection

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase database (see schema in lib/supabase.js)
4. Configure environment variables in .env.local
5. Get Google reCAPTCHA keys
6. Run development server: `npm run dev`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
DISCORD_WEBHOOK_URL=your_discord_webhook_url
ADMIN_EMAIL=your_admin_email
ADMIN_API_KEY=your_admin_api_key
```

## Deployment

Deploy to Vercel:
1. Connect your GitHub repository
2. Add environment variables
3. Deploy automatically

## Security Monitoring

The application includes built-in threat detection and monitoring:
- View metrics at `/api/admin/metrics` (requires API key)
- Security alerts sent to Discord webhook
- Automatic IP blocking for suspicious activity
- Rate limiting on all endpoints

## Contributing

This is a humanitarian project focused on accountability and transparency. Contributions welcome for security improvements and feature enhancements.

## License

Open source for humanitarian purposes.