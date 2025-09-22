// API utility functions for frontend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
};

export const startTraining = async (config, dataInfo) => {
  const response = await fetch(`${API_BASE_URL}/api/train`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config, dataInfo }),
  });

  if (!response.ok) {
    throw new Error('Training failed to start');
  }

  return response.json();
};

export const getTrainingProgress = async () => {
  const response = await fetch(`${API_BASE_URL}/api/training-progress`);

  if (!response.ok) {
    throw new Error('Failed to get training progress');
  }

  return response.json();
};

export const exportModel = async (format = 'tensorflow') => {
  const response = await fetch(`${API_BASE_URL}/api/export-model?format=${format}`);

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response.blob();
};

export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
};
