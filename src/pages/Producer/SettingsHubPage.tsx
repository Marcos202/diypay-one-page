import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { User, Webhook, Code } from 'lucide-react';
import { ProducerLayout } from '@/components/ProducerLayout';

export default function SettingsHubPage() {
  const settingsItems = [
    {
      icon: User,
      title: "Minha Conta",
      description: "Gerencie suas informações pessoais",
      link: "/settings/account"
    },
    {
      icon: Webhook,
      title: "Webhooks",
      description: "Configure notificações automáticas",
      link: "/settings/webhooks"
    },
    {
      icon: Code,
      title: "API",
      description: "Gerencie suas chaves de API",
      link: "/settings/api"
    }
  ];

  return (
    <ProducerLayout>
      <div className="mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {settingsItems.map((item) => (
          <Link key={item.title} to={item.link}>
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                    <item.icon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg text-slate-900">{item.title}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm">{item.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </ProducerLayout>
  );
}