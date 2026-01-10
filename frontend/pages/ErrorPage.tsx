import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, RefreshCcw, AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  title?: string;
  description?: string;
  errorCode?: string;
}

export default function ErrorPage({
  title = 'Something Went Wrong',
  description = 'An unexpected error occurred. Please try again later.',
  errorCode = '500',
}: ErrorPageProps) {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Error {errorCode}
            </p>
            <CardTitle className="text-3xl">{title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRefresh} className="w-full sm:w-auto flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Link to="/">
              <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>

          <div className="pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              If this problem persists, please{' '}
              <Link to="/support" className="text-primary hover:underline">
                contact our support team
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
