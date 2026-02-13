import React, { useState } from 'react';
import { 
  Layers, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  LogIn,
  AlertTriangle,
  Armchair,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Section } from '@/types';

interface SectionPanelProps {
  sections: Section[];
  selectedSectionId: string | null;
  onEnterSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onUpdateSection: (sectionId: string, updates: Partial<Section>) => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#6366f1', '#84cc16', '#f97316',
];

export const SectionPanel: React.FC<SectionPanelProps> = ({
  sections,
  selectedSectionId,
  onEnterSection,
  onDeleteSection,
  onUpdateSection,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (section: Section) => {
    setEditingId(section.id);
    setEditName(section.name);
  };

  const saveEditing = (sectionId: string) => {
    onUpdateSection(sectionId, { name: editName });
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  // Check for validation issues
  const getValidationIssues = (section: Section) => {
    const issues: string[] = [];
    if (section.seats.length === 0) {
      issues.push('No seats');
    }
    // Check for duplicate seat labels
    const labels = section.seats.map(s => `${s.row}-${s.number}`);
    const duplicates = labels.filter((item, index) => labels.indexOf(item) !== index);
    if (duplicates.length > 0) {
      issues.push('Duplicate labels');
    }
    return issues;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-72 bg-white border-l flex flex-col h-full">
        <div className="p-4 border-b flex-shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold">Sections</h3>
            <Badge variant="secondary" className="ml-auto">
              {sections.length}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Double-click section on canvas to edit
          </p>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-2">
            {sections.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No sections yet</p>
                <p className="text-xs mt-1">Draw a section on the canvas</p>
              </div>
            )}

            {sections.map((section) => {
              const issues = getValidationIssues(section);
              const hasIssues = issues.length > 0;
              
              return (
                <div
                  key={section.id}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    selectedSectionId === section.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {editingId === section.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        className="h-8"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveEditing(section.id)}
                          className="flex-1 h-7"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                          className="h-7"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded flex-shrink-0"
                          style={{ backgroundColor: section.color }}
                        />
                        <span className="font-medium flex-1 truncate" title={section.name}>
                          {section.name}
                        </span>
                        {hasIssues && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{issues.join(', ')}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <Armchair className="w-3 h-3" />
                        <span>{section.seats.length} seats</span>
                      </div>

                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onEnterSection(section.id)}
                              className="flex-1 h-7 text-xs"
                            >
                              <LogIn className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enter section to edit seats</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(section)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit name</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteSection(section.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete section</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {selectedSectionId === section.id && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1">
                              <Palette className="w-3 h-3" />
                              Opacity
                            </Label>
                            <Slider
                              value={[section.opacity * 100]}
                              onValueChange={([v]) => 
                                onUpdateSection(section.id, { opacity: v / 100 })
                              }
                              min={0}
                              max={100}
                              step={5}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-2">
                              <Palette className="w-3 h-3" />
                              Color
                            </Label>
                            <div className="flex gap-1 flex-wrap">
                              {PRESET_COLORS.map(color => (
                                <button
                                  key={color}
                                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                                    section.color === color ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => onUpdateSection(section.id, { color })}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};
