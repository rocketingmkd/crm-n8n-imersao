import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

/** Emojis comuns organizados por categoria */
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Sorrisos",
    emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪", "😎"],
  },
  {
    label: "Gestos",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "👋", "🤚", "✋", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️"],
  },
  {
    label: "Corações",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
  },
  {
    label: "Objetos",
    emojis: ["📱", "💻", "📧", "📅", "✅", "❌", "⚠️", "📌", "🔔", "💡", "🔒", "🔓", "📎", "✏️", "📝", "📋", "📂", "📁", "🗂️", "📊"],
  },
  {
    label: "Símbolos",
    emojis: ["⭐", "🌟", "✨", "🔥", "💯", "🎉", "🎊", "🏆", "🥇", "📌", "📍", "➡️", "⬅️", "✔️", "❓", "❗", "💬", "📢", "🔔", "⏰"],
  },
];

export interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function EmojiPicker({ onSelect, trigger, className }: EmojiPickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground", className)}
            aria-label="Inserir emoji"
          >
            <Smile className="h-5 w-5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-2" align="start" side="top">
        <div className="max-h-[280px] overflow-y-auto space-y-3">
          {EMOJI_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                {cat.label}
              </p>
              <div className="grid grid-cols-10 gap-0.5">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-lg hover:bg-muted transition-colors"
                    onClick={() => {
                      handleSelect(emoji);
                    }}
                    aria-label={`Emoji ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
