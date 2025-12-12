import { useMemo } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

interface Requirement {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) => {
  const requirements = useMemo((): Requirement[] => {
    return [
      { label: "Pelo menos 1 caractere minúsculo", met: /[a-z]/.test(password) },
      { label: "Pelo menos 1 caractere MAIÚSCULO", met: /[A-Z]/.test(password) },
      { label: "Pelo menos 1 símbolo", met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\';/`~]/.test(password) },
      { label: "Pelo menos 1 número", met: /[0-9]/.test(password) },
      { label: "Pelo menos 6 caracteres", met: password.length >= 6 },
    ];
  }, [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    
    if (metCount === 0) return { level: 0, label: "", color: "bg-muted" };
    if (metCount <= 1) return { level: 1, label: "Fraca", color: "bg-red-500" };
    if (metCount <= 3) return { level: 2, label: "Média", color: "bg-yellow-500" };
    if (metCount === 4) return { level: 3, label: "Boa", color: "bg-blue-500" };
    return { level: 4, label: "Forte", color: "bg-green-500" };
  }, [requirements]);

  const progressWidth = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    return (metCount / requirements.length) * 100;
  }, [requirements]);

  // Don't show anything if password is empty
  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300 rounded-full", strength.color)}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
        {strength.label && (
          <p className={cn(
            "text-xs font-medium",
            strength.level === 1 && "text-red-500",
            strength.level === 2 && "text-yellow-600",
            strength.level === 3 && "text-blue-500",
            strength.level === 4 && "text-green-500"
          )}>
            Força: {strength.label}
          </p>
        )}
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Sua senha deve ter:</p>
          <ul className="space-y-1">
            {requirements.map((req, index) => (
              <li 
                key={index} 
                className={cn(
                  "flex items-center gap-2 text-xs transition-colors duration-200",
                  req.met ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {req.met ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                {req.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
