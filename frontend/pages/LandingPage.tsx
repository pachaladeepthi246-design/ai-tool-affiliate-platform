import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Header from '../components/Header';
import CardGrid from '../components/CardGrid';
import { Sparkles, Zap, Shield, Star } from 'lucide-react';

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const categories = [
    { name: 'AI Tools', slug: 'ai-tools', count: 150 },
    { name: 'Machine Learning', slug: 'machine-learning', count: 89 },
    { name: 'Tutorials', slug: 'tutorials', count: 67 },
    { name: 'Articles', slug: 'articles', count: 45 },
    { name: 'Templates', slug: 'templates', count: 32 },
  ];

  const features = [
    {
      icon: Sparkles,
      title: 'Curated AI Tools',
      description: 'Hand-picked collection of the best AI tools and resources for professionals.',
    },
    {
      icon: Zap,
      title: 'Instant Access',
      description: 'Get immediate access to premium content and downloadable resources.',
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'Safe and secure payment processing with industry-standard encryption.',
    },
    {
      icon: Star,
      title: 'Premium Content',
      description: 'Exclusive tutorials, guides, and resources from industry experts.',
    },
  ];

  return (
    <div className="min-h-screen">
      <Header onSearch={setSearchQuery} />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Discover the Best{' '}
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              AI Tools
            </span>{' '}
            & Resources
          </h1>
          <p className="text-xl text-muted-foreground">
            Your ultimate destination for AI tools, tutorials, and resources. 
            Find everything you need to supercharge your productivity with artificial intelligence.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-8">Explore Categories</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {categories.map((category) => (
            <Badge key={category.slug} variant="secondary" className="p-3 text-sm">
              {category.name} ({category.count})
            </Badge>
          ))}
        </div>
      </section>

      {/* Featured Cards */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-8">Featured AI Tools</h2>
        <CardGrid searchQuery={searchQuery} />
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Choose Our Platform?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We provide the most comprehensive and curated collection of AI tools and resources.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-xl text-muted-foreground">
            Choose the plan that works best for you
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="border rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Monthly</h3>
            <div className="text-4xl font-bold mb-4">$9.99<span className="text-lg text-muted-foreground">/month</span></div>
            <ul className="space-y-2 mb-6">
              <li>Access to all premium content</li>
              <li>Download unlimited resources</li>
              <li>Priority support</li>
              <li>Cancel anytime</li>
            </ul>
            <Button className="w-full">Get Started</Button>
          </div>
          
          <div className="border rounded-lg p-8 text-center bg-primary/5">
            <div className="inline-block px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full mb-4">
              Best Value
            </div>
            <h3 className="text-2xl font-bold mb-4">Yearly</h3>
            <div className="text-4xl font-bold mb-4">$99.99<span className="text-lg text-muted-foreground">/year</span></div>
            <ul className="space-y-2 mb-6">
              <li>Everything in Monthly</li>
              <li>Save $20 per year</li>
              <li>Early access to new tools</li>
              <li>Exclusive content</li>
            </ul>
            <Button className="w-full">Get Started</Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">AI Tools Hub</h4>
              <p className="text-sm text-muted-foreground">
                Your ultimate destination for AI tools and resources.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Info: info@guideitsol.com</p>
                <p>Sales: sales@guideitsol.com</p>
                <p>Demo: demo@guideitsol.com</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <div className="space-y-2 text-sm">
                <Link to="/about" className="block text-muted-foreground hover:text-foreground">About</Link>
                <Link to="/pricing" className="block text-muted-foreground hover:text-foreground">Pricing</Link>
                <Link to="/contact" className="block text-muted-foreground hover:text-foreground">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-2 text-sm">
                <Link to="/privacy" className="block text-muted-foreground hover:text-foreground">Privacy Policy</Link>
                <Link to="/terms" className="block text-muted-foreground hover:text-foreground">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2024 AI Tools Hub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
