import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newTitle: string) => void;
  currentTitle: string;
}

export const RenameModuleModal = ({ isOpen, onClose, onConfirm, currentTitle }: RenameModuleModalProps) => {
  const [newTitle, setNewTitle] = useState(currentTitle);
  
  const handleConfirm = () => {
    if (newTitle.trim()) {
      onConfirm(newTitle.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear Módulo</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="module-name">Novo nome do módulo</Label>
          <Input 
            id="module-name" 
            value={newTitle} 
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};