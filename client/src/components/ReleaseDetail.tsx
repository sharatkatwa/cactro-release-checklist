import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Trash2, Check, ChevronRight, RefreshCw } from 'lucide-react';
import { GET_RELEASE, GET_RELEASES, GET_STEPS } from '../graphql/queries';
import {
  CREATE_RELEASE,
  UPDATE_RELEASE,
  TOGGLE_STEP,
  DELETE_RELEASE,
} from '../graphql/mutations';
import type { Release, Step } from '../types';
import { DeleteModal } from './DeleteModal';
import { toInputDate } from '../utils/date';
import { StatusBadge } from './StatusBadge';

interface ReleaseDetailProps {
  releaseId?: string | null;
  onBack: () => void;
}

export const ReleaseDetail: React.FC<ReleaseDetailProps> = ({
  releaseId,
  onBack,
}) => {
  const isEditing = Boolean(releaseId);

  // Fetch standard checklist steps
  const { data: stepsData } = useQuery<{ steps: Step[] }>(GET_STEPS);
  const steps: Step[] = stepsData?.steps || [];

  // Fetch release data if editing
  const {
    data: releaseData,
    loading: isLoadingRelease,
    error: releaseError,
  } = useQuery<{ release: Release }>(GET_RELEASE, {
    variables: { id: releaseId! },
    skip: !isEditing,
    fetchPolicy: 'network-only',
  });

  // Mutations
  const [createRelease, { loading: isCreating }] = useMutation(CREATE_RELEASE, {
    refetchQueries: [{ query: GET_RELEASES }],
  });

  const [updateRelease, { loading: isUpdating }] = useMutation(UPDATE_RELEASE, {
    refetchQueries: [{ query: GET_RELEASES }],
  });

  const [toggleStepMutation] = useMutation(TOGGLE_STEP);

  const [deleteRelease, { loading: isDeleting }] = useMutation(DELETE_RELEASE, {
    refetchQueries: [{ query: GET_RELEASES }],
  });

  // Local Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => toInputDate(new Date()));
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize form when release data is fetched
  useEffect(() => {
    if (releaseData?.release) {
      const rel = releaseData.release;
      setName(rel.name);
      setDate(toInputDate(rel.date));
      setAdditionalInfo(rel.additionalInfo || '');
      setCompletedSteps(rel.completedSteps || []);
    }
  }, [releaseData]);

  // Compute live preview status
  const computeLiveStatus = (): 'PLANNED' | 'ONGOING' | 'DONE' => {
    if (completedSteps.length === 0) return 'PLANNED';
    if (steps.length > 0 && completedSteps.length >= steps.length) return 'DONE';
    return 'ONGOING';
  };

  const handleStepToggle = async (stepId: string) => {
    const isCompleted = completedSteps.includes(stepId);
    const updatedSteps = isCompleted
      ? completedSteps.filter((id) => id !== stepId)
      : [...completedSteps, stepId];

    // Optimistically update local checklist state
    setCompletedSteps(updatedSteps);

    // If already saved in DB, sync toggle directly via GraphQL mutation
    if (isEditing && releaseId) {
      try {
        await toggleStepMutation({
          variables: {
            id: releaseId,
            stepId,
            completed: !isCompleted,
          },
        });
      } catch (err) {
        console.error('Failed to toggle step on server:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Release name is required.');
      return;
    }

    if (!date) {
      setFormError('Release date is required.');
      return;
    }

    try {
      if (isEditing && releaseId) {
        await updateRelease({
          variables: {
            id: releaseId,
            input: {
              name: trimmedName,
              date: new Date(date).toISOString(),
              additionalInfo: additionalInfo.trim() || null,
              completedSteps,
            },
          },
        });
        setSuccessMessage('Release updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        await createRelease({
          variables: {
            input: {
              name: trimmedName,
              date: new Date(date).toISOString(),
              additionalInfo: additionalInfo.trim() || null,
              completedSteps,
            },
          },
        });
        onBack();
      }
    } catch (err: any) {
      console.error('Error saving release:', err);
      setFormError(err.message || 'Failed to save release. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!releaseId) return;
    try {
      await deleteRelease({ variables: { id: releaseId } });
      setIsDeleteModalOpen(false);
      onBack();
    } catch (err) {
      console.error('Failed to delete release:', err);
      alert('Failed to delete release.');
    }
  };

  if (isEditing && isLoadingRelease) {
    return (
      <div className="card-container card-loading">
        <RefreshCw className="animate-spin" size={24} />
        <span>Loading release details...</span>
      </div>
    );
  }

  if (isEditing && releaseError) {
    return (
      <div className="card-container card-error">
        <p>Failed to load release: {releaseError.message}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          Back to Releases
        </button>
      </div>
    );
  }

  const currentDisplayName = name || (isEditing ? 'Loading...' : 'New Release');

  return (
    <div className="card-container">
      {/* Top Breadcrumb & Action Bar */}
      <div className="card-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <button
            type="button"
            className="breadcrumb-link"
            onClick={onBack}
            id="breadcrumb-all-releases"
          >
            All releases
          </button>
          <ChevronRight size={16} className="breadcrumb-separator" />
          <span className="breadcrumb-current">{currentDisplayName}</span>
          <span className="breadcrumb-badge">
            <StatusBadge status={computeLiveStatus()} />
          </span>
        </nav>

        {isEditing && (
          <button
            type="button"
            className="btn btn-danger-outline"
            onClick={() => setIsDeleteModalOpen(true)}
            id="btn-delete-detail"
          >
            <span>Delete</span>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {formError && <div className="form-alert alert-error">{formError}</div>}
      {successMessage && (
        <div className="form-alert alert-success">{successMessage}</div>
      )}

      {/* Main Release Form */}
      <form onSubmit={handleSubmit} className="release-form">
        <div className="form-row">
          <div className="form-group form-group-half">
            <label htmlFor="release-name" className="form-label">
              Release
            </label>
            <input
              id="release-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Version 1.0.1"
              required
            />
          </div>

          <div className="form-group form-group-half">
            <label htmlFor="release-date" className="form-label">
              Date
            </label>
            <input
              id="release-date"
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* 7 Standard Checklist Steps */}
        <div className="checklist-section">
          <div className="checklist-items">
            {steps.map((step: Step) => {
              const isChecked = completedSteps.includes(step.id);
              return (
                <label key={step.id} className="checklist-item">
                  <input
                    type="checkbox"
                    className="checklist-checkbox"
                    checked={isChecked}
                    onChange={() => handleStepToggle(step.id)}
                    id={`checkbox-${step.id}`}
                  />
                  <span className="checklist-label">{step.title}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Additional Remarks */}
        <div className="form-group">
          <label htmlFor="release-notes" className="form-label">
            Additional remarks / tasks
          </label>
          <textarea
            id="release-notes"
            className="form-textarea"
            rows={5}
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Please enter any other important notes for the release"
          />
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary btn-save"
            disabled={isCreating || isUpdating}
            id="btn-save-release"
          >
            <span>{isCreating || isUpdating ? 'Saving...' : 'Save'}</span>
            <Check size={18} />
          </button>
        </div>
      </form>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        releaseName={name}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
