import { toast } from '@/hooks/use-toast';

/**
 * Display a success toast notification
 */
export function showSuccess(message: string, description?: string) {
  toast({
    title: message,
    description,
    variant: 'default',
  });
}

/**
 * Display an error toast notification
 */
export function showError(message: string, description?: string) {
  toast({
    title: message,
    description,
    variant: 'destructive',
  });
}

/**
 * Display an info toast notification
 */
export function showInfo(message: string, description?: string) {
  toast({
    title: message,
    description,
    variant: 'default',
  });
}

/**
 * Generic toast replacement for alert()
 * Automatically determines variant based on message content
 */
export function showToast(message: string, description?: string) {
  // Check if message contains error keywords
  const isError = /error|fail|failed|unable|cannot|invalid/i.test(message);

  toast({
    title: message,
    description,
    variant: isError ? 'destructive' : 'default',
  });
}
