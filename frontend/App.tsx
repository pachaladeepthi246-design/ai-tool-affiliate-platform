import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { Toaster } from '@/components/ui/toaster';
import { clerkPublishableKey } from './config';
import AppInner from './AppInner';

const queryClient = new QueryClient();

export default function App() {
  if (!clerkPublishableKey) {
    throw new Error('Missing Clerk publishable key');
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground">
          <Router>
            <AppInner />
          </Router>
          <Toaster />
        </div>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
