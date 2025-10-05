import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';

const PublicPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, isError, error } = useQuery({
    queryKey: ['public-page', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase.functions.invoke('get-public-page-by-slug', {
        body: { slug },
      });
      if (error) throw new Error(data?.error || error.message);
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-muted-foreground">A página que você está procurando não existe ou não está mais disponível.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 md:py-16">
      <main className="max-w-4xl mx-auto bg-white p-6 sm:p-8 md:p-12 rounded-lg shadow-md">
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-8 md:mb-12">
          {page.title}
        </h1>
        <article className="prose lg:prose-xl max-w-none">
          {page.featured_image_url && (
            <img src={page.featured_image_url} alt={page.title} className="w-full rounded-lg mb-8" />
          )}
          <div dangerouslySetInnerHTML={{ __html: page.content || '' }} />
        </article>
      </main>
    </div>
  );
};

export default PublicPage;
