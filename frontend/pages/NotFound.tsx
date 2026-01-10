import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <span className="text-5xl font-bold text-muted-foreground">404</span>
          </div>
          <CardTitle className="text-3xl">Page Not Found</CardTitle>
          <CardDescription className="text-base">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/">
              <Button className="w-full sm:w-auto flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </Link>
            <Link to="/search">
              <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Cards
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>

          <div className="pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              If you believe this is a mistake, please{' '}
              <Link to="/support" className="text-primary hover:underline">
                contact support
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
