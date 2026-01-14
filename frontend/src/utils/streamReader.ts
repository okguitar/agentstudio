// Utility for reading streaming responses
export async function readStreamingResponse(
  response: Response,
  onChunk: (chunk: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
) {
  if (!response.body) {
    throw new Error('Response body is not available');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete?.();
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  } catch (error) {
    onError?.(error as Error);
  } finally {
    reader.releaseLock();
  }
}