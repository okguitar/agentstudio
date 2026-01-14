/**
 * 格式化日期为相对时间显示
 * @param dateString 日期字符串或日期对象
 * @returns 格式化后的相对时间字符串
 */
export const formatRelativeTime = (dateString: string | Date): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return '刚刚';
  if (diffInHours < 24) return `${diffInHours}小时前`;
  if (diffInHours < 48) return '昨天';
  if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}天前`;
  
  return date.toLocaleDateString('zh-CN');
};

/**
 * 格式化日期为标准格式
 * @param dateString 日期字符串或日期对象
 * @returns 格式化后的日期字符串
 */
export const formatDate = (dateString: string | Date): string => {
  return new Date(dateString).toLocaleDateString('zh-CN');
};

/**
 * 格式化日期时间为标准格式
 * @param dateString 日期字符串或日期对象
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTime = (dateString: string | Date): string => {
  return new Date(dateString).toLocaleString('zh-CN');
};
