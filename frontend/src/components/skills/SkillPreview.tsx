import React from 'react';
import { Eye, Tag, Wrench } from 'lucide-react';
import type { SkillListItem } from '../../types/skills';

interface SkillPreviewProps {
  skill: SkillListItem;
  showUsageStats?: boolean;
  onEdit?: (skill: SkillListItem) => void;
  onDelete?: (skillId: string) => void;
  onToggle?: (skillId: string, enabled: boolean) => void;
}

export const SkillPreview: React.FC<SkillPreviewProps> = ({
  skill,
  showUsageStats = false,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{skill.name}</h3>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                skill.scope === 'user'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {skill.scope === 'user' ? 'User' : 'Project'}
            </span>
            {!skill.enabled && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Disabled
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-3">{skill.description}</p>
        </div>
      </div>

      {/* Content Preview */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Skill Content</span>
        </div>
        <div className="text-sm text-gray-600">
          <p>This skill extends Claude's capabilities with specialized instructions and tools.</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <Tag className="w-3 h-3 text-gray-400" />
              <span className="text-xs">Custom instructions</span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-3 h-3 text-gray-400" />
              <span className="text-xs">Tool permissions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      {showUsageStats && skill.usageCount !== undefined && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Usage Statistics</p>
              <p className="text-xs text-blue-700">
                Used {skill.usageCount} time{skill.usageCount !== 1 ? 's' : ''}
              </p>
            </div>
            {skill.lastUsed && (
              <div className="text-right">
                <p className="text-xs text-blue-700">Last used</p>
                <p className="text-xs font-medium text-blue-900">
                  {formatDate(skill.lastUsed)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Created:</span>
          <span className="text-gray-700">{formatDate(skill.createdAt)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Updated:</span>
          <span className="text-gray-700">{formatDate(skill.updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Scope:</span>
          <span className="text-gray-700">
            {skill.scope === 'user' ? 'Personal (across all projects)' : `Project: ${skill.projectName || 'Current'}`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
        {onEdit && (
          <button
            onClick={() => onEdit(skill)}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Edit
          </button>
        )}
        {onToggle && (
          <button
            onClick={() => onToggle(skill.id, skill.enabled)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              skill.enabled
                ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                : 'text-green-600 bg-green-50 hover:bg-green-100'
            }`}
          >
            {skill.enabled ? 'Disable' : 'Enable'}
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(skill.id)}
            className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};