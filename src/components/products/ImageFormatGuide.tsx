import { Monitor, Smartphone } from 'lucide-react';

export const ImageFormatGuide = () => {
  return (
    <div className="flex items-center justify-center gap-8 p-6 bg-muted/30 rounded-lg border">
      {/* Formato Horizontal 16:9 */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-24 h-[54px] bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg border-2 border-primary/20 flex items-center justify-center">
            <Monitor className="h-6 w-6 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
            16:9
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Horizontal</p>
        </div>
      </div>

      {/* Separador */}
      <div className="h-16 w-px bg-border"></div>

      {/* Formato Vertical 9:16 */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-[54px] h-24 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg border-2 border-primary/20 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
            9:16
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Vertical</p>
        </div>
      </div>
    </div>
  );
};