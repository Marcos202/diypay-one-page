import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Gift, Medal, Trophy, Star } from "lucide-react";

interface AwardsModalProps {
  children: React.ReactNode;
  currentRevenue: number;
}

export function AwardsModal({ children, currentRevenue }: AwardsModalProps) {
  const [open, setOpen] = useState(false);

  // Define milestone achievements
  const achievements = [
    {
      name: "Medalha de Bronze",
      revenue: 1000000, // R$ 10K in cents
      icon: Medal,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200"
    },
    {
      name: "Medalha de Prata", 
      revenue: 10000000, // R$ 100K in cents
      icon: Trophy,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200"
    },
    {
      name: "Medalha de Ouro",
      revenue: 100000000, // R$ 1M in cents
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50", 
      borderColor: "border-yellow-200"
    }
  ];

  const formatRevenue = (cents: number) => {
    const reais = cents / 100;
    if (reais >= 1000000) return `R$ ${(reais / 1000000).toFixed(1)}M`;
    if (reais >= 1000) return `R$ ${(reais / 1000).toFixed(0)}K`;
    return `R$ ${reais.toFixed(0)}`;
  };

  const isAchieved = (targetRevenue: number) => currentRevenue >= targetRevenue;

  const getAchievedDate = (targetRevenue: number) => {
    if (isAchieved(targetRevenue)) {
      // In a real app, you'd track the actual achievement date
      return "15/11/2024";
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="h-6 w-6 text-[#4d0782]" />
            Premiações da DiyPay
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-gray-600">
            Alcance marcos de faturamento e ganhe medalhas especiais! 
            Cada conquista representa seu crescimento como produtor digital.
          </p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-gray-700 border-b pb-2">
              <div>PREMIAÇÃO</div>
              <div>META</div>
              <div>STATUS</div>
              <div>DATA</div>
            </div>
            
            {achievements.map((achievement, index) => {
              const achieved = isAchieved(achievement.revenue);
              const achievedDate = getAchievedDate(achievement.revenue);
              const IconComponent = achievement.icon;
              
              return (
                <div 
                  key={index}
                  className={`grid grid-cols-4 gap-4 items-center p-4 rounded-lg border transition-colors ${
                    achieved 
                      ? `${achievement.bgColor} ${achievement.borderColor}` 
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent 
                      className={`h-8 w-8 ${achieved ? achievement.color : "text-gray-400"}`}
                    />
                    <span className="font-medium">{achievement.name}</span>
                  </div>
                  
                  <div className="font-semibold text-gray-700">
                    {formatRevenue(achievement.revenue)}
                  </div>
                  
                  <div>
                    <Badge 
                      variant={achieved ? "default" : "secondary"}
                      className={achieved ? "bg-[#4d0782] text-white" : ""}
                    >
                      {achieved ? "Conquistado" : "Não conquistado"}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {achievedDate || "-"}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> Continue criando produtos incríveis e promovendo suas vendas para alcançar os próximos marcos!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}