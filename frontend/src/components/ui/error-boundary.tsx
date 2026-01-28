'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React rendering errors.
 * Use this to wrap sections of your app that might fail.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="mx-auto max-w-md my-8">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Etwas ist schief gelaufen</CardTitle>
            <CardDescription>
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={this.handleReset} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for error boundary with reset key
 */
export function ErrorBoundaryWithReset({
  children,
  resetKey,
  ...props
}: ErrorBoundaryProps & { resetKey?: string | number }) {
  return (
    <ErrorBoundary key={resetKey} {...props}>
      {children}
    </ErrorBoundary>
  );
}
