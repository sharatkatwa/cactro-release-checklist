import React from 'react';
import type { ReleaseStatus } from '../types';

interface StatusBadgeProps {
  status: ReleaseStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getLabel = () => {
    switch (status) {
      case 'DONE':
        return 'Done';
      case 'ONGOING':
        return 'Ongoing';
      case 'PLANNED':
      default:
        return 'Planned';
    }
  };

  const getClassName = () => {
    switch (status) {
      case 'DONE':
        return 'status-badge status-done';
      case 'ONGOING':
        return 'status-badge status-ongoing';
      case 'PLANNED':
      default:
        return 'status-badge status-planned';
    }
  };

  return <span className={getClassName()}>{getLabel()}</span>;
};
