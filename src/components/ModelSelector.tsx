
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fetchOpenRouterModels, OpenRouterModel } from "@/services/openRouterService";

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const ModelSelector = ({ value, onValueChange, placeholder = "Select model..." }: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      try {
        const fetchedModels = await fetchOpenRouterModels();
        setModels(fetchedModels);
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  const selectedModel = models.find(model => model.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          {selectedModel ? selectedModel.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading models..." : "No models found."}
            </CommandEmpty>
            <CommandGroup>
              {models.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === model.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.id}</span>
                    {model.description && (
                      <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {model.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ModelSelector;
