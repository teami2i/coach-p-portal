import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  type?: "text" | "phone";
}

const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters
  const phoneNumber = value.replace(/\D/g, "");
  
  // Format as (XXX) XXX-XXXX
  if (phoneNumber.length <= 3) {
    return phoneNumber;
  } else if (phoneNumber.length <= 6) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  } else {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }
};

const validatePhoneNumber = (value: string): boolean => {
  const phoneNumber = value.replace(/\D/g, "");
  return phoneNumber.length === 10;
};

export const EditableCell = ({ 
  value, 
  onSave, 
  placeholder = "-",
  maxLength,
  className,
  type = "text"
}: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    // Validate phone number if type is phone
    if (type === "phone" && editValue && !validatePhoneNumber(editValue)) {
      setError("Please enter a valid 10-digit US phone number");
      return;
    }
    
    setError(null);
    setIsSaving(true);
    try {
      // Save the raw phone number without formatting
      const valueToSave = type === "phone" ? editValue.replace(/\D/g, "") : editValue;
      await onSave(valueToSave);
      setIsEditing(false);
    } catch (error) {
      // Error handling is done in the parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setError(null);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (type === "phone") {
      // Only allow numbers and formatting characters
      const formatted = formatPhoneNumber(newValue);
      setEditValue(formatted);
      setError(null);
    } else {
      setEditValue(newValue);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Input
            value={type === "phone" && editValue ? formatPhoneNumber(editValue) : editValue}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            maxLength={type === "phone" ? 14 : maxLength}
            className={cn("h-8 w-40", error && "border-destructive")}
            autoFocus
            disabled={isSaving}
            placeholder={type === "phone" ? "(555) 123-4567" : undefined}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
    );
  }

  // Format display value for phone numbers
  const displayValue = type === "phone" && value 
    ? formatPhoneNumber(value) 
    : value;

  return (
    <div 
      className={cn(
        "group flex items-center gap-2 cursor-pointer hover:text-primary transition-colors",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      <span>{displayValue || placeholder}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};
