import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { Toaster } from '@/components/ui/toaster';
import { clerkPublishableKey } from './config';
import AppInner from './AppInner';
import SkipToContent from './components/SkipToContent';

const queryClient = new QueryClient();

export default function App() {
  if (!clerkPublishableKey) {
    throw new Error('Missing Clerk publishable key');
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground" lang="en">
          <SkipToContent />
          <Router>
            <main id="main-content">
              <AppInner />
            </main>
          </Router>
          <Toaster />
        </div>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
