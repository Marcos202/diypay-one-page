// src/pages/members/CoursePlayerPage.tsx

import { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, CheckCircle, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StudentLayout } from '@/components/StudentLayout';

const VideoPlayer = lazy(() => import('@/components/core/VideoPlayer'));

interface Lesson { id: string; title: string; content_type: 'video' | 'text'; content_url: string; content_text: string; is_completed: boolean; }
interface Module { id: string; title: string; lessons: Lesson[]; }
interface CourseData { id: string; name: string; modules: Module[]; }

export default function MembersCoursePlayerPage() {
  const { productId } = useParams<{ productId: string }>(); 
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const { data: course, isLoading, isError, error } = useQuery<CourseData>({
    queryKey: ['coursePlayerData', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase.functions.invoke('get-course-player-data', { body: { product_id: productId } });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!productId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ lessonId, isCompleted }: { lessonId: string; isCompleted: boolean }) => {
      const { error } = await supabase.functions.invoke('update-lesson-progress', {
        body: { lesson_id: lessonId, product_id: productId, is_completed: isCompleted }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Progresso atualizado!" });
      queryClient.invalidateQueries({ queryKey: ['coursePlayerData', productId] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar progresso", description: error.message, variant: "destructive" });
    },
  });
  
  useEffect(() => {
    if (course && !activeLesson) {
      const firstUncompletedLesson = course.modules.flatMap(m => m.lessons).find(l => !l.is_completed);
      setActiveLesson(firstUncompletedLesson || course.modules[0]?.lessons[0] || null);
    }
  }, [course, activeLesson]);

  const handleToggleCompletion = () => {
    if (!activeLesson) return;
    updateProgressMutation.mutate({ lessonId: activeLesson.id, isCompleted: !activeLesson.is_completed });
  };
  
  const totalLessons = course?.modules.reduce((acc, module) => acc + module.lessons.length, 0) || 0;
  const completedLessons = course?.modules.reduce((acc, module) => acc + module.lessons.filter(l => l.is_completed).length, 0) || 0;
  const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const completedLessonsInModule = (module: Module) => module.lessons.filter(l => l.is_completed).length;

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex h-[calc(100vh-112px)] -m-8 bg-[#111111]">
          <div className="flex-1 p-8"><Skeleton className="h-full w-full rounded-lg bg-gray-800" /></div>
          <Skeleton className="h-full w-96 bg-gray-900" />
        </div>
      </StudentLayout>
    );
  }
  if (isError) return <StudentLayout><div className="p-8 bg-[#111111] h-screen flex items-center justify-center text-red-400">Erro: {error.message}</div></StudentLayout>;
  if (!course) return <StudentLayout><div className="p-8 bg-[#111111] h-screen flex items-center justify-center text-white">Curso não encontrado.</div></StudentLayout>;

  return (
    <StudentLayout>
      <div className="flex h-[calc(100vh-112px)] -m-8 bg-[#111111] text-gray-300 font-sans">
        <main className="flex-1 flex flex-col">
          <header className="flex-shrink-0 bg-[#111111] border-b border-gray-800 p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <Link to="/members" className="p-2 rounded-full hover:bg-gray-800">
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">{activeLesson?.title || course.name}</h1>
                <span className="text-xs text-gray-400">Seu Progresso: {completedLessons} de {totalLessons} ({Math.round(courseProgress)}%)</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleToggleCompletion} disabled={!activeLesson || updateProgressMutation.isPending} size="sm" variant="outline" className="text-white border-gray-700 bg-gray-800 hover:bg-gray-700 hover:text-white">
                <CheckCircle className="mr-2 h-4 w-4" />
                {activeLesson?.is_completed ? 'Desmarcar' : 'Marcar como concluído'}
              </Button>
            </div>
          </header>

          <div className="flex-grow p-8 overflow-y-auto">
            {activeLesson ? (
              <div>
                {activeLesson.content_type === 'video' && activeLesson.content_url && (
                  <Suspense fallback={<Skeleton className="aspect-video w-full rounded-lg bg-gray-800" />}>
                    <VideoPlayer
                      url={activeLesson.content_url}
                      onEnded={() => updateProgressMutation.mutate({ lessonId: activeLesson.id, isCompleted: true })}
                    />
                  </Suspense>
                )}
                {activeLesson.content_text && (
                  <div className="prose prose-invert max-w-none mt-8 p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <h3 className="text-xl font-bold mb-4 text-white">Sobre a Aula</h3>
                    <div dangerouslySetInnerHTML={{ __html: activeLesson.content_text }} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                <p>Selecione uma aula no menu para começar.</p>
              </div>
            )}
          </div>
        </main>

        <aside className="w-96 bg-[#181818] h-full overflow-y-auto p-4 flex flex-col border-l border-gray-800">
          <div className="p-4 mb-4 flex-shrink-0">
            <h2 className="text-lg font-bold text-white mb-2">Conteúdo do curso</h2>
            <Progress value={courseProgress} className="h-2 bg-gray-700" />
          </div>
          <div className="flex-grow">
            <Accordion type="multiple" defaultValue={course.modules.map(m => `module-${m.id}`)} className="w-full">
              {course.modules.map((module: Module) => (
                <AccordionItem key={module.id} value={`module-${module.id}`} className="border-b-0">
                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-700/70 rounded-lg bg-gray-800 mb-2">
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-white">{module.title}</span>
                      <span className="text-xs text-gray-400">{completedLessonsInModule(module)}/{module.lessons.length} aulas</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <ul className="space-y-1">
                      {module.lessons.map((lesson: Lesson) => (
                        <li key={lesson.id} onClick={() => setActiveLesson(lesson)}
                          className={`mx-2 px-3 py-2.5 rounded-md cursor-pointer flex items-center justify-between text-sm transition-colors ${
                            activeLesson?.id === lesson.id ? 'bg-primary text-white font-semibold' : 'hover:bg-gray-700/50'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <PlayCircle className="h-4 w-4 text-gray-500" />
                            <span className="flex-1">{lesson.title}</span>
                          </span>
                          {lesson.is_completed && <CheckCircle className="h-4 w-4 text-green-400" />}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </aside>
      </div>
    </StudentLayout>
  );
}
