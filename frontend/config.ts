// The Clerk publishable key, to initialize Clerk.
// TODO: Set this to your Clerk publishable key, which can be found in the Clerk dashboard.
export const clerkPublishableKey = "";

// Stripe publishable key for payment processing
// TODO: Set this to your Stripe publishable key
export const stripePublishableKey = "";

// Application configuration
export const config = {
  // Company contact information
  contacts: {
    info: "info@guideitsol.com",
    sales: "sales@guideitsol.com",
    demo: "demo@guideitsol.com",
  },
  
  // Pricing configuration
  pricing: {
    monthly: 9.99,
    yearly: 99.99,
  },
  
  // Supported languages
  languages: [
    { code: 'en', name: 'English' },
    { code: 'te', name: 'Telugu' },
    { code: 'hi', name: 'Hindi' },
  ],
};
