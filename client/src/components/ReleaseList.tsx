import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Eye, Trash2, PlusCircle, RefreshCw } from 'lucide-react';
import { GET_RELEASES } from '../graphql/queries';
import { DELETE_RELEASE } from '../graphql/mutations';
import type { Release } from '../types';
import { StatusBadge } from './StatusBadge';
import { DeleteModal } from './DeleteModal';
import { formatDisplayDate } from '../utils/date';

interface ReleaseListProps {
  onSelectRelease: (id: string) => void;
  onCreateNew: () => void;
}

export const ReleaseList: React.FC<ReleaseListProps> = ({
  onSelectRelease,
  onCreateNew,
}) => {
  const { data, loading, error, refetch } = useQuery<{ releases: Release[] }>(
    GET_RELEASES,
    {
      fetchPolicy: 'cache-and-network',
    }
  );

  const [deleteRelease, { loading: isDeleting }] = useMutation(DELETE_RELEASE, {
    refetchQueries: [{ query: GET_RELEASES }],
  });

  const [releaseToDelete, setReleaseToDelete] = useState<Release | null>(null);

  const handleDeleteConfirm = async () => {
    if (!releaseToDelete) return;
    try {
      await deleteRelease({ variables: { id: releaseToDelete.id } });
      setReleaseToDelete(null);
    } catch (err) {
      console.error('Error deleting release:', err);
      alert('Failed to delete release. Please try again.');
    }
  };

  const releases: Release[] = data?.releases || [];

  return (
    <div className="card-container">
      {/* Card Header */}
      <div className="card-header">
        <span className="card-title-link">All releases</span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onCreateNew}
          id="btn-new-release"
        >
          <span>New release</span>
          <PlusCircle size={18} />
        </button>
      </div>

      {/* Content Body */}
      {loading && releases.length === 0 ? (
        <div className="card-loading">
          <RefreshCw className="animate-spin" size={24} />
          <span>Loading releases...</span>
        </div>
      ) : error ? (
        <div className="card-error">
          <p>Error loading releases: {error.message}</p>
          <button className="btn btn-secondary" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : releases.length === 0 ? (
        <div className="card-empty">
          <p>No releases found. Get started by creating your first release!</p>
          <button className="btn btn-primary" onClick={onCreateNew}>
            <PlusCircle size={16} />
            <span>Create Release</span>
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="releases-table">
            <thead>
              <tr>
                <th className="col-release">Release</th>
                <th className="col-date">Date</th>
                <th className="col-status">Status</th>
                <th className="col-action"></th>
                <th className="col-action"></th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release: Release) => (
                <tr key={release.id} className="release-row">
                  <td className="cell-name font-medium">{release.name}</td>
                  <td className="cell-date text-muted">
                    {formatDisplayDate(release.date)}
                  </td>
                  <td className="cell-status">
                    <StatusBadge status={release.status} />
                  </td>
                  <td className="cell-action text-right">
                    <button
                      type="button"
                      className="action-btn action-view"
                      onClick={() => onSelectRelease(release.id)}
                      title="View release"
                      id={`view-${release.id}`}
                    >
                      <span>View</span>
                      <Eye size={16} />
                    </button>
                  </td>
                  <td className="cell-action text-right">
                    <button
                      type="button"
                      className="action-btn action-delete"
                      onClick={() => setReleaseToDelete(release)}
                      title="Delete release"
                      id={`delete-${release.id}`}
                    >
                      <span>Delete</span>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={Boolean(releaseToDelete)}
        releaseName={releaseToDelete?.name || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setReleaseToDelete(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
