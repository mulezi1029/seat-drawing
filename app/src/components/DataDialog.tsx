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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface DataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportData: string;
  onImport: (data: string) => boolean;
}

export const DataDialog: React.FC<DataDialogProps> = ({
  isOpen,
  onClose,
  exportData,
  onImport,
}) => {
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState('export');
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData);
    toast({
      title: 'Copied!',
      description: 'Data copied to clipboard',
    });
  };

  const handleImport = () => {
    if (!importText.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste data to import',
        variant: 'destructive',
      });
      return;
    }

    const success = onImport(importText);
    if (success) {
      toast({
        title: 'Success',
        description: 'Data imported successfully',
      });
      setImportText('');
      onClose();
    } else {
      toast({
        title: 'Error',
        description: 'Invalid data format',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setImportText('');
    setActiveTab('export');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Data Management</DialogTitle>
          <DialogDescription>
            Export or import your venue configuration
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <Textarea
              value={exportData}
              readOnly
              className="min-h-[300px] font-mono text-xs"
            />
            <Button onClick={handleCopy} className="w-full">
              Copy to Clipboard
            </Button>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste your venue data here..."
              className="min-h-[300px] font-mono text-xs"
            />
            <Button onClick={handleImport} className="w-full">
              Import Data
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
