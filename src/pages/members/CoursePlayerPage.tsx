import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import VideoPlayer from '@/components/core/VideoPlayer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CheckCircle2, PlayCircle, ArrowLeft, Menu } from 'lucide-react';
import { toast } from 'sonner';

// Define os tipos de dados para clareza
interface Lesson {
  id: string;
  title: string;
  content_type: 'video' | 'text';
  content_url: string;
  content_text: string;
  is_completed: boolean;
}
interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}
interface CourseData {
  id: string;
  name: string;
  modules: Module[];
}

const CoursePlayerPage = () => {
  console.log('CoursePlayerPage rendering');
  const { productId } = useParams<{ productId: string }>();
  console.log('ProductId from params:', productId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Query para buscar os dados do curso e progresso
  const { data: course, isLoading, error } = useQuery<CourseData>({
    queryKey: ['courseData', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-course-player-data', {
        body: { product_id: productId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!productId,
  });

  // Encontra a primeira aula não concluída para iniciar
  useEffect(() => {
    if (course && !activeLesson) {
      const firstUncompletedLesson = course.modules.flatMap(m => m.lessons).find(l => !l.is_completed);
      setActiveLesson(firstUncompletedLesson || course.modules[0]?.lessons[0] || null);
    }
  }, [course, activeLesson]);

  // Mutação para atualizar o progresso da aula
  const { mutate: updateProgress } = useMutation({
    mutationFn: async ({ lessonId, isCompleted }: { lessonId: string; isCompleted: boolean }) => {
      const { error } = await supabase.functions.invoke('update-lesson-progress', {
        body: { lesson_id: lessonId, product_id: productId, is_completed: isCompleted },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Progresso atualizado!');
      queryClient.invalidateQueries({ queryKey: ['courseData', productId] });
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar progresso: ${err.message}`);
    }
  });

  // Handler para selecionar aula e fechar sidebar no mobile
  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setSidebarOpen(false);
  };

  // Calcula o progresso das aulas
  const totalLessons = course?.modules.flatMap(m => m.lessons).length || 0;
  const completedLessons = course?.modules.flatMap(m => m.lessons).filter(l => l.is_completed).length || 0;
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Componente reutilizável para o menu de aulas
  const LessonMenu = () => (
    <Accordion type="single" collapsible defaultValue={`module-${course?.modules[0]?.id}`}>
      {course?.modules.map((module) => (
        <AccordionItem value={`module-${module.id}`} key={module.id} className="border-gray-800">
          <AccordionTrigger className="text-sm font-medium hover:no-underline text-white hover:text-gray-300 px-2">
            {module.title}
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1 mt-2">
              {module.lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson)}
                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all text-sm ${
                    activeLesson?.id === lesson.id 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                  }`}
                >
                  {lesson.is_completed ? 
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> : 
                    <PlayCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  }
                  <span className="truncate">{lesson.title}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111111]">
        <div className="text-gray-400">Carregando curso...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111111]">
        <div className="text-destructive">Erro ao carregar curso: {error.message}</div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111111]">
        <div className="text-gray-400">Curso não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="dark-theme-override">
      <div className="flex flex-col lg:flex-row min-h-screen bg-[#111111] overflow-x-hidden">
        {/* Main Content */}
        <main className="flex-1 bg-[#111111] w-full">
          {/* Header Responsivo */}
          <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-gray-800">
            {/* Linha 1: Voltar + Botão Marcar Concluída */}
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-300 hover:text-white border-0 bg-transparent hover:bg-gray-800 px-2 sm:px-3"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              
              {activeLesson && (
                <Button 
                  onClick={() => updateProgress({ lessonId: activeLesson.id, isCompleted: !activeLesson.is_completed })}
                  variant={activeLesson.is_completed ? "outline" : "default"}
                  size="sm"
                  className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                    activeLesson.is_completed 
                      ? 'bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground border-0'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{activeLesson.is_completed ? 'Concluída' : 'Marcar Concluída'}</span>
                  <span className="sm:hidden">{activeLesson.is_completed ? 'Feito' : 'Concluir'}</span>
                </Button>
              )}
            </div>
            
            {/* Linha 2: Título e Progresso */}
            <div className="text-center px-2">
              <h1 className="text-sm sm:text-base lg:text-xl font-bold text-white line-clamp-1">
                {course.name}
              </h1>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <Progress value={progressPercentage} className="w-20 sm:w-28 lg:w-32 h-1.5 sm:h-2" />
                <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                  {completedLessons}/{totalLessons} ({Math.round(progressPercentage)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Conteúdo da Aula */}
          <div className="p-3 sm:p-4 md:p-6 overflow-y-auto h-[calc(100vh-130px)] sm:h-[calc(100vh-120px)] lg:h-[calc(100vh-110px)]">
            <div className="bg-[#181818] rounded-lg p-3 sm:p-4 md:p-6 border border-gray-800">
              <h2 className="text-base sm:text-lg md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 text-white line-clamp-2">
                {activeLesson?.title || 'Selecione uma aula'}
              </h2>
              
              {activeLesson ? (
                <>
                  {activeLesson.content_type === 'video' && activeLesson.content_url && (
                    <div className="mb-4 sm:mb-6 rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                      <VideoPlayer 
                        url={activeLesson.content_url}
                        onEnded={() => updateProgress({ lessonId: activeLesson.id, isCompleted: true })}
                      />
                    </div>
                  )}
                  
                  {activeLesson.content_text && (
                    <div 
                      className="prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none mb-4 sm:mb-6 text-gray-300" 
                      dangerouslySetInnerHTML={{ __html: activeLesson.content_text }} 
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-8 sm:py-12 lg:py-16 text-gray-400">
                  <PlayCircle className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base lg:text-lg">Selecione uma aula na lista para começar.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* FAB Button para abrir menu no mobile */}
        <Button 
          variant="default"
          size="icon"
          className="lg:hidden fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground rounded-full shadow-lg h-12 w-12 sm:h-14 sm:w-14 hover:bg-primary/90"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>

        {/* Sheet para Mobile */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="right" className="bg-[#121212] border-gray-800 p-0 w-[280px] sm:w-80">
            <SheetHeader className="p-4 border-b border-gray-800">
              <SheetTitle className="text-white text-left">Conteúdo do Curso</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100vh-65px)] p-4">
              <LessonMenu />
            </div>
          </SheetContent>
        </Sheet>

        {/* Sidebar Desktop (apenas em lg+) */}
        <aside className="hidden lg:block w-80 bg-[#121212] border-l border-gray-800 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-bold text-lg text-white">Conteúdo do Curso</h3>
          </div>
          <div className="p-4">
            <LessonMenu />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CoursePlayerPage;
