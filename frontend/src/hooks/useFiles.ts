import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

export interface FileData {
  path: string;
  content: string | null;
  exists: boolean;
  error?: string;
}

export interface FilesResponse {
  files: FileData[];
}

// Read a single file
export const useReadFile = (path: string) => {
  return useQuery<FileData>({
    queryKey: ['file', path],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error('Failed to read file');
      }
      return response.json();
    },
    enabled: !!path, // Only fetch if path is provided
  });
};

// Read multiple files
export const useReadFiles = (paths: string[]) => {
  return useQuery<FilesResponse>({
    queryKey: ['files', paths],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/files/read-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to read files');
      }
      
      return response.json();
    },
    enabled: paths.length > 0, // Only fetch if paths are provided
  });
};

// Write a file
export const useWriteFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      const response = await fetch(`${API_BASE}/files/write`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to write file');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['file', variables.path] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};
