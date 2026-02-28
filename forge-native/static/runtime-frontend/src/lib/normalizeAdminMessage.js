/**
 * Normalize an admin/MOTD message into a consistent shape.
 * Shared between App.jsx and AdminPanel.jsx.
 */
export const normalizeAdminMessage = (value, fallbackMessage = '') => {
  const baseMessage = typeof fallbackMessage === 'string' ? fallbackMessage.trim() : '';

  if (value && typeof value === 'object') {
    return {
      title: typeof value.title === 'string' ? value.title.trim() : '',
      message: typeof value.message === 'string' ? value.message.trim() : baseMessage,
      priority: ['info', 'warning', 'urgent'].includes(value.priority) ? value.priority : 'info',
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
      updatedBy: typeof value.updatedBy === 'string' ? value.updatedBy : null,
    };
  }

  return {
    title: '',
    message: baseMessage,
    priority: 'info',
    updatedAt: null,
    updatedBy: null,
  };
};
