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
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">
          Configurações
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsItems.map((item) => (
          <Link key={item.title} to={item.link}>
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <item.icon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{item.title}</h3>
                    <p className="text-slate-600 text-sm">{item.description}</p>
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