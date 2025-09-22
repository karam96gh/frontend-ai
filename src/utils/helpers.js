// Utility functions for data processing and validation
export const validateFile = (file, maxSize = 1024 * 1024 * 1024) => {
  const errors = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
  }

  // Check file type
  const allowedTypes = [
    "text/csv",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/zip",
  ];

  if (!allowedTypes.includes(file.type)) {
    const extension = file.name.split(".").pop().toLowerCase();
    const allowedExtensions = ["csv", "png", "jpg", "jpeg", "zip"];

    if (!allowedExtensions.includes(extension)) {
      errors.push(
        `File type not supported. Allowed: ${allowedExtensions.join(", ")}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const formatTrainingTime = (seconds) => {
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

export const validateTrainingConfig = (config) => {
  const errors = [];

  // Validate epochs
  if (!config.epochs || config.epochs < 1 || config.epochs > 1000) {
    errors.push("Epochs must be between 1 and 1000");
  }

  // Validate batch size
  if (!config.batchSize || config.batchSize < 1 || config.batchSize > 512) {
    errors.push("Batch size must be between 1 and 512");
  }

  // Validate learning rate
  if (
    !config.learningRate ||
    config.learningRate <= 0 ||
    config.learningRate > 1
  ) {
    errors.push("Learning rate must be between 0 and 1");
  }

  // Validate validation split
  if (
    !config.validationSplit ||
    config.validationSplit < 0.1 ||
    config.validationSplit > 0.5
  ) {
    errors.push("Validation split must be between 0.1 and 0.5");
  }

  // Validate layers
  if (!config.layers || config.layers.length < 1) {
    errors.push("At least one layer is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const generateModelSummary = (config) => {
  const summary = {
    totalLayers: config.layers?.length || 0,
    modelType: config.modelType || "unknown",
    estimatedParams: 0,
    complexity: "unknown",
  };

  // Estimate parameters (simplified calculation)
  let paramCount = 0;
  const layers = config.layers || [];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer.type === "dense" && layer.units) {
      if (i === 0) {
        // First layer - assume input size of 100 for estimation
        paramCount += 100 * layer.units + layer.units;
      } else {
        const prevLayer = layers[i - 1];
        if (prevLayer.units) {
          paramCount += prevLayer.units * layer.units + layer.units;
        }
      }
    } else if (layer.type === "conv2d" && layer.filters) {
      // Simplified conv2d parameter estimation
      const kernelSize = layer.kernelSize || 3;
      const inputChannels = 3; // Assume RGB for simplicity
      paramCount +=
        kernelSize * kernelSize * inputChannels * layer.filters + layer.filters;
    }
  }

  summary.estimatedParams = paramCount;

  // Determine complexity
  if (paramCount < 10000) {
    summary.complexity = "simple";
  } else if (paramCount < 100000) {
    summary.complexity = "moderate";
  } else {
    summary.complexity = "complex";
  }

  return summary;
};

export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
