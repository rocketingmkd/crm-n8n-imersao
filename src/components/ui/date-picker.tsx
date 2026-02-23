import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, placeholder = "Selecionar data", className, id, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const date = value ? new Date(value + "T12:00:00") : undefined;

  const handleSelect = (d: Date | undefined) => {
    if (d) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      onChange?.(`${yyyy}-${mm}-${dd}`);
    } else {
      onChange?.("");
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10 rounded-xl border-input bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 liquid-glass border-white/10" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={ptBR}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateTimePickerProps {
  value?: string; // ISO datetime-local format: YYYY-MM-DDTHH:mm
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function DateTimePicker({ value, onChange, placeholder = "Selecionar data e hora", className, id, disabled }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const dateStr = value ? value.slice(0, 10) : "";
  const timeStr = value ? value.slice(11, 16) : "09:00";

  const date = dateStr ? new Date(dateStr + "T12:00:00") : undefined;

  const handleDateSelect = (d: Date | undefined) => {
    if (d) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      onChange?.(`${yyyy}-${mm}-${dd}T${timeStr}`);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    if (dateStr) {
      onChange?.(`${dateStr}T${newTime}`);
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      onChange?.(`${yyyy}-${mm}-${dd}T${newTime}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10 rounded-xl border-input bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {date ? (
            <span>
              {format(date, "dd/MM/yyyy", { locale: ptBR })} às {timeStr}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 liquid-glass border-white/10" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          locale={ptBR}
          initialFocus
          className="pointer-events-auto"
        />
        <div className="border-t border-white/10 p-3 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Horário:</span>
          <Input
            type="time"
            value={timeStr}
            onChange={handleTimeChange}
            className="w-auto h-8 text-sm"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
