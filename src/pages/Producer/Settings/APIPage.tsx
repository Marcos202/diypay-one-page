import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Search, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProducerLayout } from '@/components/ProducerLayout';

export default function APIPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const apiEndpoints = [
    'GET /api/products',
    'POST /api/products',
    'GET /api/sales',
    'GET /api/sales/{id}',
    'GET /api/customers',
    'POST /api/webhooks'
  ];

  return (
    <ProducerLayout>
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-semibold text-slate-900">
          API
        </h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Chaves de API</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Buscar chaves..." className="pl-10 w-full sm:w-60" />
              </div>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar API Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova API Key</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="api-name">Nome</Label>
                      <Input id="api-name" placeholder="Nome da API Key" />
                    </div>
                    <div>
                      <Label>Endpoints Permitidos</Label>
                      <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                        {apiEndpoints.map((endpoint) => (
                          <div key={endpoint} className="flex items-center space-x-2">
                            <Checkbox id={endpoint} />
                            <Label htmlFor={endpoint} className="text-sm font-mono">{endpoint}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => setIsCreateModalOpen(false)}>
                        Criar API Key
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NOME</TableHead>
                <TableHead>API KEY</TableHead>
                <TableHead>CRIADA EM</TableHead>
                <TableHead>ÚLTIMO USO</TableHead>
                <TableHead>AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma API Key criada ainda.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ProducerLayout>
  );
}