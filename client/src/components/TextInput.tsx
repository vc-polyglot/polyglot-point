import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface TextInputProps {
  onTextSubmitted: (text: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function TextInput({ 
  onTextSubmitted, 
  isProcessing = false, 
  disabled = false,
  placeholder = "Type your message here..." 
}: TextInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isProcessing && !disabled) {
      onTextSubmitted(text.trim());
      setText('');
    }
  }, [text, onTextSubmitted, isProcessing, disabled]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 w-full max-w-md">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled || isProcessing}
        className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-400"
      />
      <Button
        type="submit"
        disabled={!text.trim() || disabled || isProcessing}
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
