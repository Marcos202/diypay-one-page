import { Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyRouteProps {
  Component: ComponentType<any>;
  [key: string]: any;
}

const LazyRoute = ({ Component, ...props }: LazyRouteProps) => {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      }
    >
      <Component {...props} />
    </Suspense>
  );
};

export default LazyRoute;