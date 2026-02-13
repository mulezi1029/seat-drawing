import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SectionNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  pointCount: number;
}

export const SectionNameDialog: React.FC<SectionNameDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  pointCount,
}) => {
  const [name, setName] = useState('');

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      setName('');
    }
  };

  const handleClose = () => {
    onClose();
    setName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Section</DialogTitle>
          <DialogDescription>
            You have drawn a section with {pointCount} points. 
            Give it a name to save it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label htmlFor="section-name">Section Name</Label>
          <Input
            id="section-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Main Floor, Balcony Left"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            Create Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
