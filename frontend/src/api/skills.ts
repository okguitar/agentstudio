import { getApiBase } from '../lib/config';
import { authFetch } from '../lib/authFetch';
import type { 
  SkillConfig,
  SkillListItem,
  CreateSkillRequest,
  UpdateSkillRequest,
  SkillValidationResult,
  SkillDirectoryInfo
} from '../types/skills';

class SkillsAPI {
  private baseURL = `${getApiBase()}/skills`;

  async getAllSkills(options?: {
    scope?: 'user' | 'project';
    includeDisabled?: boolean;
  }): Promise<SkillListItem[]> {
    const params = new URLSearchParams();
    if (options?.scope) params.append('scope', options.scope);
    if (options?.includeDisabled) params.append('includeDisabled', 'true');

    const response = await authFetch(`${this.baseURL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch skills: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformToSkillListItems(data.skills);
  }

  async getSkill(skillId: string, scope?: 'user' | 'project'): Promise<SkillConfig | null> {
    const params = scope ? `?scope=${scope}` : '';
    const response = await authFetch(`${this.baseURL}/${skillId}${params}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch skill: ${response.statusText}`);
    }

    const data = await response.json();
    return data.skill;
  }

  async createSkill(skillData: CreateSkillRequest): Promise<SkillConfig> {
    const response = await authFetch(`${this.baseURL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(skillData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create skill');
    }

    const data = await response.json();
    return data.skill;
  }

  async updateSkill(
    skillId: string, 
    updates: UpdateSkillRequest
  ): Promise<SkillConfig> {
    const response = await authFetch(`${this.baseURL}/${skillId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update skill');
    }

    const data = await response.json();
    return data.skill;
  }

  async deleteSkill(skillId: string, scope?: 'user' | 'project'): Promise<boolean> {
    const params = scope ? `?scope=${scope}` : '';
    const response = await authFetch(`${this.baseURL}/${skillId}${params}`, {
      method: 'DELETE',
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw new Error(`Failed to delete skill: ${response.statusText}`);
    }

    return true;
  }

  async getSkillDirectoryInfo(skillId: string): Promise<SkillDirectoryInfo | null> {
    const response = await authFetch(`${this.baseURL}/${skillId}/directory`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch skill directory info: ${response.statusText}`);
    }

    const data = await response.json();
    return data.directoryInfo;
  }

  async validateSkillManifest(content: string): Promise<SkillValidationResult> {
    const response = await authFetch(`${this.baseURL}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to validate skill manifest: ${response.statusText}`);
    }

    return await response.json();
  }

  async getSkillFile(skillId: string, filePath: string): Promise<string> {
    const response = await authFetch(`${this.baseURL}/${skillId}/files/${filePath}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch skill file: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content;
  }

  async updateSkillFile(
    skillId: string, 
    filePath: string, 
    content: string
  ): Promise<void> {
    const response = await authFetch(`${this.baseURL}/${skillId}/files/${filePath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update skill file: ${response.statusText}`);
    }
  }

  private transformToSkillListItems(skills: SkillConfig[]): SkillListItem[] {
    return skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      scope: skill.scope,
      projectName: skill.scope === 'project' ? 'Current Project' : undefined,
      enabled: skill.enabled,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
      allowedTools: skill.allowedTools,
      toolCount: skill.allowedTools?.length || 0,
      // TODO: Add usage stats when implemented
      usageCount: 0,
      lastUsed: undefined,
    }));
  }
}

export const skillsAPI = new SkillsAPI();