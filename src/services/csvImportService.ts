/**
 * CSV Import Service (Enterprise Version)
 * Purpose: Async CSV import with job queue and progress tracking
 * Features: Job creation, status polling, progress updates
 */

import { api } from './apiClient';
import { API_ENDPOINTS } from '../config/api.config';

export interface ImportJobStatus {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: {
    current: number;
    total: number;
    percentage: number;
    stage?: 'parsing' | 'preparing' | 'processing' | 'importing' | 'completed' | 'failed';
    imported?: number;
    skipped?: number;
    errors?: string[];
  };
  data?: {
    userId: string;
  };
  failedReason?: string;
  returnvalue?: {
    imported: number;
    skipped: number;
    errors: string[];
  };
}

/**
 * Start CSV import job
 * Returns job ID for status polling
 */
export const startCSVImport = async (
  csvContent: string
): Promise<{ jobId: string }> => {
  try {
    const response = await api.post(API_ENDPOINTS.IMPORT.CSV, {
      csvContent,
    });

    if (!response.success || !response.data?.jobId) {
      throw new Error(response.error?.message || 'Failed to start import');
    }

    return { jobId: response.data.jobId };
  } catch (error: any) {
    throw new Error(`Failed to start CSV import: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Get import job status
 */
export const getImportJobStatus = async (jobId: string): Promise<ImportJobStatus> => {
  try {
    // API client already has baseURL set, so just use the endpoint path
    const endpoint = API_ENDPOINTS.IMPORT.CSV_STATUS.replace(':jobId', jobId);
    const response = await api.get(endpoint);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get import status');
    }

    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to get import status: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Poll import job status until completion
 * Returns final result or throws error
 */
export const pollImportStatus = async (
  jobId: string,
  onProgress?: (status: ImportJobStatus) => void,
  pollInterval: number = 1000 // Poll every second
): Promise<{ imported: number; skipped: number; errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getImportJobStatus(jobId);

        // Call progress callback
        if (onProgress) {
          onProgress(status);
        }

        // Check if job is completed
        if (status.state === 'completed') {
          if (status.returnvalue) {
            resolve(status.returnvalue);
          } else {
            resolve({
              imported: status.progress.imported || 0,
              skipped: status.progress.skipped || 0,
              errors: status.progress.errors || [],
            });
          }
          return;
        }

        // Check if job failed
        if (status.state === 'failed') {
          reject(new Error(status.failedReason || 'Import job failed'));
          return;
        }

        // Continue polling
        setTimeout(poll, pollInterval);
      } catch (error: any) {
        reject(error);
      }
    };

    // Start polling
    poll();
  });
};

/**
 * Validate CSV format
 */
export const validateWalletCSV = (csvContent: string): { valid: boolean; error?: string } => {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return { valid: false, error: 'CSV file must have at least a header row and one data row' };
    }

    const headers = lines[0].split(';').map((h) => h.trim());
    const requiredHeaders = ['account', 'category', 'currency', 'amount', 'type', 'date'];

    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        return { valid: false, error: `Missing required column: ${required}` };
      }
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
};
