import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search, Ellipsis, PlayCircle, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StudentLayout } from '@/components/StudentLayout';

// Mock data now includes progress and type for demonstration
const fetchMyCourses = async () => {
  const { data, error } = await supabase.functions.invoke('get-my-courses');
  if (error) throw new Error(error.message);
  // Simulating progress and type data which should come from the backend
  return data.map((course: any, index: number) => ({
    ...course,
    progress: (index % 3) * 35, // Example progress
    type: index === 2 ? 'external' : 'standard', // Example type
  }));
};

export default function MyCoursesPage() {
  const { data: courses, isLoading, isError, error } = useQuery({
    queryKey: ['my-courses'],
    queryFn: fetchMyCourses,
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="p-8 w-full max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (isError) {
    return (
      <StudentLayout>
        <div className="p-8 text-destructive w-full max-w-screen-2xl mx-auto">
          Erro: {error?.message || 'Erro desconhecido'}
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-4 md:p-8">
        <div className="w-full max-w-screen-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Meus Cursos</h1>
            <div className="flex items-center gap-4">
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input type="text" placeholder="Buscar..." />
                <Button type="submit" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: any) => (
                <Card key={course.id} className="w-full flex flex-col overflow-hidden">
                  <div className="relative aspect-[16/9] bg-muted flex-shrink-0">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt={course.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-semibold leading-tight line-clamp-2">{course.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 -mr-2">
                            <Ellipsis className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem>Suporte</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">{course.producer_name}</p>
                    
                    <div className="flex-grow" />
                    
                    <div className="mt-4">
                      {course.progress > 0 && (
                         <Progress value={course.progress} className="h-2 mb-2" />
                      )}
                      <Button asChild className="w-full" variant={course.type === 'external' ? 'secondary' : 'default'}>
                        <Link to={course.space_id ? `/members/spaces/${course.space_id}` : '/members/courses/' + course.id}>
                          {course.type === 'external' ? 'Acessar' : 'Começar'}
                          {course.type === 'external' && <PlayCircle className="ml-2 h-4 w-4" />}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-2xl font-semibold mb-2">Você ainda não possui cursos</h2>
              <p className="text-muted-foreground">
                Explore os cursos disponíveis e comece a aprender!
              </p>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
