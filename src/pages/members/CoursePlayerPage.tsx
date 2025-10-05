import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import VideoPlayer from '@/components/core/VideoPlayer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, PlayCircle, ArrowLeft } from 'lucide-react';
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
      queryClient.invalidateQueries({ queryKey: ['courseData', productId] }); // Revalida os dados para atualizar a UI
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar progresso: ${err.message}`);
    }
  });

  // Calcula o progresso das aulas
  const totalLessons = course?.modules.flatMap(m => m.lessons).length || 0;
  const completedLessons = course?.modules.flatMap(m => m.lessons).filter(l => l.is_completed).length || 0;
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  if (isLoading) return <div className="p-8">Carregando curso...</div>;
  if (error) return <div className="p-8 text-destructive">Erro ao carregar curso: {error.message}</div>;
  if (!course) return <div className="p-8">Curso não encontrado.</div>;

  return (
    <div className="dark-theme-override">
      <div className="flex h-screen bg-[#111111]">
        {/* Coluna Esquerda: Player e Informações */}
        <main className="flex-1 bg-[#111111]">
          {/* Header com botão voltar, título e botão de completar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-300 hover:text-white border-0 bg-transparent hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <h1 className="text-xl font-bold text-white">{course.name}</h1>
                <div className="text-sm text-gray-400">
                  Progresso: {completedLessons} de {totalLessons} ({Math.round(progressPercentage)}%)
                </div>
              </div>
            </div>

            {/* Botão de completar no header */}
            <div className="flex items-center gap-2">
              {activeLesson && (
                <Button 
                  onClick={() => updateProgress({ lessonId: activeLesson.id, isCompleted: !activeLesson.is_completed })}
                  variant={activeLesson.is_completed ? "outline" : "default"}
                  size="sm"
                  className={`flex items-center gap-2 ${
                    activeLesson.is_completed 
                      ? 'bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground border-0'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {activeLesson.is_completed ? 'Concluída' : 'Marcar Concluída'}
                </Button>
              )}
            </div>
          </div>

          <div className="p-6 overflow-y-auto h-[calc(100vh-89px)]">
            {/* Conteúdo da Aula */}
            <div className="bg-[#181818] rounded-lg p-6 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6 text-white">
                {activeLesson?.title || 'Selecione uma aula'}
              </h2>
              {activeLesson ? (
                <>
                  {activeLesson.content_type === 'video' && activeLesson.content_url && (
                    <div className="mb-6 rounded-lg overflow-hidden border border-black">
                      <VideoPlayer 
                        url={activeLesson.content_url}
                        onEnded={() => updateProgress({ lessonId: activeLesson.id, isCompleted: true })}
                      />
                    </div>
                  )}
                  
                  {activeLesson.content_text && (
                    <div className="prose prose-invert prose-lg max-w-none mb-6 text-gray-300" 
                         dangerouslySetInnerHTML={{ __html: activeLesson.content_text }} />
                  )}
                </>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecione uma aula na lista ao lado para começar.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Coluna Direita: Lista de Módulos e Aulas */}
        <aside className="w-80 bg-[#121212] border-l border-gray-800 overflow-y-auto">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-bold text-lg text-white">Conteúdo do Curso</h3>
          </div>
          
          <div className="p-4">
            <Accordion type="single" collapsible defaultValue={`module-${course.modules[0]?.id}`}>
              {course.modules.map((module) => (
                <AccordionItem value={`module-${module.id}`} key={module.id} className="border-gray-800">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline text-white hover:text-gray-300">
                    {module.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1 mt-2">
                      {module.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson)}
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
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CoursePlayerPage;