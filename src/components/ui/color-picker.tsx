import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  className?: string;
  placeholder?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value = '#F3F4F6',
  onChange,
  className,
  placeholder = '#F3F4F6',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = (color: string) => {
    onChange(color);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Validate hex color format and update immediately
    if (/^#([0-9A-F]{3}){1,2}$/i.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If input is not a valid hex color, reset to current value
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(e.target.value)) {
      e.target.value = value;
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-16 h-10 p-1 border rounded-md"
            style={{ backgroundColor: value }}
            aria-label="Selecionar cor"
          >
            <div 
              className="w-full h-full rounded border border-white/20"
              style={{ backgroundColor: value }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" side="bottom" align="start">
          <div className="space-y-4">
            <HexColorPicker 
              color={value} 
              onChange={handleColorChange}
              className="!w-48 !h-32"
            />
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded border border-border flex-shrink-0"
                style={{ backgroundColor: value }}
              />
              <Input
                value={value}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder={placeholder}
                className="flex-1 text-sm"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <Input
        value={value}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="flex-1"
      />
    </div>
  );
};