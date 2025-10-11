import React from 'react';
import { useBreakpoints } from '../hooks/useMobile';

interface Column {
  key: string;
  label: string;
  required?: boolean; // 是否在移动端必须显示
  className?: string;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  className?: string;
  mobileColumns?: string[]; // 移动端显示的列keys
  tabletColumns?: string[]; // 平板端显示的列keys
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  columns,
  data,
  onRowClick,
  className = '',
  mobileColumns,
  tabletColumns,
}) => {
  const { sm, md, lg } = useBreakpoints();

  // 根据屏幕尺寸确定要显示的列
  const getVisibleColumns = (): Column[] => {
    if (!sm) {
      // 超小屏幕 - 只显示必须的列或指定列
      if (mobileColumns && mobileColumns.length > 0) {
        return columns.filter(col => mobileColumns.includes(col.key));
      }
      return columns.filter(col => col.required);
    } else if (!md) {
      // 小屏幕 - 显示指定列或前3列
      if (tabletColumns && tabletColumns.length > 0) {
        return columns.filter(col => tabletColumns.includes(col.key));
      }
      return columns.slice(0, 3);
    } else if (!lg) {
      // 中等屏幕 - 显示前5列
      return columns.slice(0, 5);
    } else {
      // 大屏幕 - 显示所有列
      return columns;
    }
  };

  const visibleColumns = getVisibleColumns();

  // 移动端卡片视图
  if (!sm) {
    return (
      <div className={`space-y-4 ${className}`}>
        {data.map((row, index) => (
          <div
            key={index}
            onClick={() => onRowClick?.(row)}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* 主标题行 */}
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-gray-900 dark:text-white truncate flex-1">
                {row[visibleColumns[0]?.key] || 'N/A'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {visibleColumns[1] && (
                  <span className="truncate ml-2">
                    {row[visibleColumns[1].key] || 'N/A'}
                  </span>
                )}
              </div>
            </div>

            {/* 详细信息行 */}
            <div className="grid grid-cols-1 gap-2 text-sm">
              {visibleColumns.slice(2).map((column) => (
                <div key={column.key} className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {column.label}:
                  </span>
                  <span className="text-gray-900 dark:text-white text-right truncate ml-2">
                    {row[column.key] || 'N/A'}
                  </span>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end mt-3 space-x-2">
              {columns
                .filter(col => col.key === 'actions')
                .map((col) => (
                  <div key={col.key} className={col.className}>
                    {row[col.key]}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 平板和桌面端表格视图
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                  column.className || ''
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(row)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              {visibleColumns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap ${
                    column.className || ''
                  }`}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// 为项目表格预定义的配置
export const PROJECT_TABLE_CONFIG = {
  columns: [
    { key: 'name', label: '项目', required: true },
    { key: 'assistant', label: '助手', required: false },
    { key: 'path', label: '路径', required: false },
    { key: 'createdAt', label: '创建时间', required: false },
    { key: 'lastActive', label: '最后活跃', required: false },
    { key: 'actions', label: '操作', required: true },
  ],
  mobileColumns: ['name', 'actions'],
  tabletColumns: ['name', 'assistant', 'lastActive', 'actions'],
};