import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { skillsAPI } from '../api/skills';
import type { 
  CreateSkillRequest,
  UpdateSkillRequest
} from '../types/skills';

// Query keys
export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: (filters: { scope?: 'user' | 'project'; includeDisabled?: boolean }) => 
    [...skillKeys.lists(), filters] as const,
  details: () => [...skillKeys.all, 'detail'] as const,
  detail: (id: string) => [...skillKeys.details(), id] as const,
  directory: (id: string) => [...skillKeys.all, 'directory', id] as const,
};

// Hooks for getting skills
export const useSkills = (options?: {
  scope?: 'user' | 'project';
  includeDisabled?: boolean;
}) => {
  return useQuery({
    queryKey: skillKeys.list(options || {}),
    queryFn: () => skillsAPI.getAllSkills(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserSkills = (includeDisabled = false) => {
  return useQuery({
    queryKey: skillKeys.list({ scope: 'user', includeDisabled }),
    queryFn: () => skillsAPI.getAllSkills({ scope: 'user', includeDisabled }),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProjectSkills = (includeDisabled = false) => {
  return useQuery({
    queryKey: skillKeys.list({ scope: 'project', includeDisabled }),
    queryFn: () => skillsAPI.getAllSkills({ scope: 'project', includeDisabled }),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSkill = (skillId: string, scope?: 'user' | 'project') => {
  return useQuery({
    queryKey: skillKeys.detail(skillId),
    queryFn: () => skillsAPI.getSkill(skillId, scope),
    enabled: !!skillId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSkillDirectoryInfo = (skillId: string) => {
  return useQuery({
    queryKey: skillKeys.directory(skillId),
    queryFn: () => skillsAPI.getSkillDirectoryInfo(skillId),
    enabled: !!skillId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Mutations for CRUD operations
export const useCreateSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillData: CreateSkillRequest) => skillsAPI.createSkill(skillData),
    onSuccess: (newSkill) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() });
      
      // Add the new skill to the cache
      queryClient.setQueryData(
        skillKeys.detail(newSkill.id),
        newSkill
      );
    },
    onError: (error) => {
      console.error('Failed to create skill:', error);
    },
  });
};

export const useUpdateSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      skillId, 
      updates 
    }: { 
      skillId: string; 
      updates: UpdateSkillRequest; 
    }) => skillsAPI.updateSkill(skillId, updates),
    onSuccess: (updatedSkill) => {
      // Update the skill in the cache
      queryClient.setQueryData(
        skillKeys.detail(updatedSkill.id),
        updatedSkill
      );
      
      // Invalidate lists to refresh the data
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update skill:', error);
    },
  });
};

export const useDeleteSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      skillId, 
      scope 
    }: { 
      skillId: string; 
      scope?: 'user' | 'project'; 
    }) => skillsAPI.deleteSkill(skillId, scope),
    onSuccess: (_, { skillId }) => {
      // Remove the skill from the cache
      queryClient.removeQueries({ queryKey: skillKeys.detail(skillId) });
      
      // Invalidate lists to refresh the data
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to delete skill:', error);
    },
  });
};

// File operations
export const useSkillFile = (skillId: string, filePath: string) => {
  return useQuery({
    queryKey: [...skillKeys.detail(skillId), 'file', filePath],
    queryFn: () => skillsAPI.getSkillFile(skillId, filePath),
    enabled: !!skillId && !!filePath,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUpdateSkillFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      skillId, 
      filePath, 
      content 
    }: { 
      skillId: string; 
      filePath: string; 
      content: string; 
    }) => skillsAPI.updateSkillFile(skillId, filePath, content),
    onSuccess: (_, { skillId }) => {
      // Invalidate skill detail and directory info
      queryClient.invalidateQueries({ queryKey: skillKeys.detail(skillId) });
      queryClient.invalidateQueries({ queryKey: skillKeys.directory(skillId) });
    },
    onError: (error) => {
      console.error('Failed to update skill file:', error);
    },
  });
};

// Validation
export const useValidateSkillManifest = () => {
  return useMutation({
    mutationFn: (content: string) => skillsAPI.validateSkillManifest(content),
    onError: (error) => {
      console.error('Failed to validate skill manifest:', error);
    },
  });
};

// Utility functions
export const prefetchSkill = async (
  queryClient: QueryClient, 
  skillId: string, 
  scope?: 'user' | 'project'
) => {
  await queryClient.prefetchQuery({
    queryKey: skillKeys.detail(skillId),
    queryFn: () => skillsAPI.getSkill(skillId, scope),
    staleTime: 5 * 60 * 1000,
  });
};

export const invalidateSkillsCache = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: skillKeys.all });
};