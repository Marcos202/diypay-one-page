// File: src/pages/Index.tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { ArrowRight, ShoppingCart, Tv, Store, BarChart, Shield, Repeat, Facebook, Instagram, Youtube } from "lucide-react";

// Componente para Card de Benefício (para reutilização e clareza)
const BenefitCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl text-center transition-transform duration-300 hover:-translate-y-2">
    <div className="inline-block p-4 bg-violet-600/20 rounded-xl mb-4 border border-violet-500/30">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-slate-400">{children}</p>
  </div>
);

const Index = () => {
  return (
    <div className="bg-slate-900 text-white">
      {/* O Header precisa ser adaptado para um fundo escuro, ou usamos uma versão específica aqui */}
      <Header />

      <main>
        {/* === Seção Hero === */}
        <section 
          className="relative min-h-screen flex items-center bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1974&auto=format&fit=crop')" }}
        >
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>
          <div className="relative container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
                Sua plataforma para <span className="text-violet-400">criar, vender e crescer.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">
                Menos burocracia, mais vendas. Acelere seu negócio digital com as ferramentas que você realmente precisa.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="bg-white/90 backdrop-blur-lg text-slate-900 p-8 rounded-2xl shadow-2xl text-center max-w-sm">
                <h2 className="text-2xl font-bold mb-4">Venda tudo na internet com a DiyPay.</h2>
                <Button asChild size="lg" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 text-base">
                  <Link to="/register">Comece agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* === Seção "Liberdade para Criar" === */}
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-violet-900/30 p-6 rounded-2xl text-center border border-violet-700"><ShoppingCart className="h-10 w-10 mx-auto mb-4 text-violet-400" /><h3 className="font-bold text-lg">Produtos Físicos</h3></div>
                <div className="bg-violet-900/30 p-6 rounded-2xl text-center border border-violet-700"><Tv className="h-10 w-10 mx-auto mb-4 text-violet-400" /><h3 className="font-bold text-lg">Produtos Digitais</h3></div>
                <div className="bg-violet-900/30 p-6 rounded-2xl text-center col-span-2 border border-violet-700"><Store className="h-10 w-10 mx-auto mb-4 text-violet-400" /><h3 className="font-bold text-lg">Eventos e Assinaturas</h3></div>
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Liberdade para criar. Poder para vender.</h2>
              <p className="text-slate-300 text-lg">
                De cursos online a eventos presenciais, nossa plataforma oferece as ferramentas para você monetizar qualquer tipo de produto ou serviço, sem limites.
              </p>
            </div>
          </div>
        </section>

        {/* === Seção "Tecnologia Confiável" === */}
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Tecnologia Confiável.</h2>
            <p className="text-xl text-slate-300 mb-16 max-w-3xl mx-auto">Do checkout à gestão financeira, nossa infraestrutura trabalha para que você nunca perca uma venda.</p>
            <div className="grid md:grid-cols-3 gap-8">
                <BenefitCard icon={<BarChart className="h-8 w-8 text-violet-400" />} title="Checkout de Alta Conversão">
                    Recursos como compra com 1 clique, recuperação de carrinho e order bump para maximizar seu faturamento.
                </BenefitCard>
                <BenefitCard icon={<Shield className="h-8 w-8 text-violet-400" />} title="Segurança de Ponta">
                    Sistema antifraude robusto e integração com os maiores gateways para garantir transações seguras.
                </BenefitCard>
                <BenefitCard icon={<Repeat className="h-8 w-8 text-violet-400" />} title="Gestão de Assinaturas">
                    Controle total sobre sua receita recorrente com dashboards inteligentes e gerenciamento de inadimplência.
                </BenefitCard>
            </div>
          </div>
        </section>

        {/* === Seção Depoimentos === */}
        <section className="py-20 lg:py-28">
            <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                <div className="order-2 lg:order-1">
                    <h2 className="text-3xl lg:text-4xl font-bold mb-4">Vibramos com as suas conquistas.</h2>
                    <p className="text-slate-300 text-lg mb-8">
                        Seu sucesso é o nosso sucesso. Estamos ao seu lado para apoiar sua jornada com tecnologia e suporte de verdade.
                    </p>
                    <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
                        <p className="text-lg italic text-slate-300 mb-6">"O checkout de alta conversão da DiyPay foi um divisor de águas. Aumentei minha taxa de conversão em 20% no primeiro mês, sem precisar de um time de tecnologia."</p>
                        <p className="font-bold">Ana Júlia S.</p>
                        <p className="text-violet-400">Produtora de Infoprodutos</p>
                    </div>
                </div>
                <div className="order-1 lg:order-2">
                    <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1974&auto=format&fit=crop" alt="Produtora de sucesso" className="rounded-2xl shadow-2xl object-cover h-full w-full" />
                </div>
            </div>
        </section>

      </main>

      {/* === Rodapé Profissional === */}
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="container mx-auto px-6 pt-16 pb-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
                <div className="lg:col-span-2">
                    <img src="/logo-diypay.png" alt="Logo DiyPay" className="h-10 mb-4" />
                    <p className="text-slate-400 max-w-sm mb-6">
                        A plataforma completa para criadores de conteúdo e empreendedores digitais.
                    </p>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-4 text-white">Soluções</h3>
                     <ul className="space-y-3 text-slate-400">
                        <li><Link to="/features/digital-products" className="hover:text-violet-400">Produto Digital</Link></li>
                        <li><Link to="/features/subscriptions" className="hover:text-violet-400">Assinaturas</Link></li>
                        <li><Link to="/features/events" className="hover:text-violet-400">Eventos</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-4 text-white">Institucional</h3>
                    <ul className="space-y-3 text-slate-400">
                        <li><a href="https://diypay.com.br/p/politicas-de-privacidade" className="hover:text-violet-400">Política de privacidade</a></li>
                        <li><a href="https://diypay.com.br/p/termos-de-uso" className="hover:text-violet-400">Termos de uso</a></li>
                        <li><a href="https://diypay.com.br/p/contato" className="hover:text-violet-400">Contato</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-4 text-white">Acompanhe</h3>
                    <div className="flex space-x-4">
                        <a href="#" className="text-slate-400 hover:text-violet-400"><Instagram /></a>
                        <a href="#" className="text-slate-400 hover:text-violet-400"><Facebook /></a>
                        <a href="#" className="text-slate-400 hover:text-violet-400"><Youtube /></a>
                    </div>
                </div>
            </div>
            <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
                <p>Copyright © DiyPay 2025. Todos os direitos reservados.</p>
                <p className="mt-1">DiyPay Pagamentos Online LTDA - 23.055.665/0001-06</p>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
