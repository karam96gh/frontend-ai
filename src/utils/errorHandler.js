/**
 * Enhanced Error Handler for Neural Network Trainer
 * Handles API errors, validation errors, and provides user-friendly messages
 */
import React, { useState, useEffect } from 'react';


export class ErrorHandler {
  static errorMessages = {
    // Network Errors
    'NetworkError': 'Network connection failed. Please check your internet connection.',
    'TypeError: Failed to fetch': 'Unable to connect to the server. Please ensure the server is running.',
    
    // Model Loading Errors
    'Model.*not found': 'The selected model could not be found. It may have been deleted.',
    'Failed to load.*model': 'The model file appears to be corrupted or incompatible.',
    'No model loaded': 'Please load a model before attempting to test.',
    
    // Session Errors
    'Session not found': 'Your session has expired. Please reload the model.',
    'No session.*provided': 'Session error occurred. Please reload the page.',
    
    // Data Input Errors
    'No CSV data provided': 'Please enter some CSV data to test.',
    'Invalid numeric value': 'All input values must be numbers. Please check your data.',
    'Expected.*features.*got': 'The number of input values doesn\'t match the model\'s requirements.',
    'No image provided': 'Please select an image file to upload.',
    'File too large': 'The uploaded file is too large. Please choose a smaller file.',
    'Unsupported.*format': 'This file format is not supported. Please use a supported format.',
    
    // Processing Errors
    'Prediction failed': 'The model prediction failed. Please check your input data.',
    'Image preprocessing failed': 'Unable to process the uploaded image. Please try a different image.',
    'Failed to process.*image': 'The image could not be processed. Please ensure it\'s a valid image file.',
    
    // Validation Errors
    'Validation.*failed': 'Input validation failed. Please check your data format.',
    'All values must be numeric': 'Please ensure all input values are numbers.',
    
    // Server Errors
    'Internal server error': 'A server error occurred. Please try again later.',
    'Service unavailable': 'The service is temporarily unavailable. Please try again later.',
    'Upload failed': 'File upload failed. Please try uploading the file again.',
    
    // Training Errors (for context)
    'Training.*failed': 'Model training encountered an error.',
    'No trained models found': 'No models are available for testing. Please train a model first.'
  };

  static actionableAdvice = {
    'NetworkError': [
      'Check your internet connection',
      'Verify the server is running on http://localhost:5000',
      'Try refreshing the page'
    ],
    'Model.*not found': [
      'Refresh the models list',
      'Check if the model was deleted',
      'Try training a new model'
    ],
    'Session.*expired': [
      'Reload the model',
      'Refresh the page',
      'Clear browser cache if issues persist'
    ],
    'Invalid.*input': [
      'Check the input format requirements',
      'Use the provided examples as reference',
      'Ensure all values are properly formatted'
    ],
    'File.*too.*large': [
      'Reduce the file size',
      'Use image compression tools',
      'Try a different file format'
    ],
    'Prediction.*failed': [
      'Verify the input data format',
      'Check if the model is compatible with your data',
      'Try reloading the model'
    ]
  };

  /**
   * Get a user-friendly error message
   * @param {string} errorMessage - Original error message
   * @returns {string} User-friendly message
   */
  static getUserFriendlyMessage(errorMessage) {
    if (!errorMessage) return 'An unknown error occurred.';
    
    // Check for exact matches first
    for (const [pattern, message] of Object.entries(this.errorMessages)) {
      if (new RegExp(pattern, 'i').test(errorMessage)) {
        return message;
      }
    }
    
    // Return original message if no pattern matches, but clean it up
    return this.cleanErrorMessage(errorMessage);
  }

  /**
   * Clean up raw error messages
   * @param {string} message - Raw error message
   * @returns {string} Cleaned message
   */
  static cleanErrorMessage(message) {
    // Remove technical stack trace info
    message = message.split('\n')[0];
    
    // Remove API endpoint references
    message = message.replace(/\/api\/[^\s]+/g, '');
    
    // Remove HTTP status codes at the start
    message = message.replace(/^(Error )?\d{3}:?\s*/i, '');
    
    // Capitalize first letter
    message = message.charAt(0).toUpperCase() + message.slice(1);
    
    return message;
  }

  /**
   * Get actionable advice for error resolution
   * @param {string} errorMessage - Error message
   * @returns {string[]} Array of actionable advice
   */
  static getActionableAdvice(errorMessage) {
    for (const [pattern, advice] of Object.entries(this.actionableAdvice)) {
      if (new RegExp(pattern, 'i').test(errorMessage)) {
        return advice;
      }
    }
    
    return [
      'Try refreshing the page',
      'Check your input data',
      'Contact support if the issue persists'
    ];
  }

  /**
   * Handle API errors with enhanced messaging
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Formatted error information
   */
  static handleApiError(error, context = '') {
    let message = error.message || 'An unknown error occurred';
    
    // Handle fetch-specific errors
    if (error.name === 'TypeError' && message.includes('fetch')) {
      message = 'Unable to connect to the server. Please ensure the server is running.';
    }
    
    const userMessage = this.getUserFriendlyMessage(message);
    const advice = this.getActionableAdvice(message);
    
    const errorInfo = {
      userMessage,
      originalMessage: message,
      context,
      advice,
      timestamp: new Date().toISOString(),
      isNetworkError: error.name === 'TypeError' || message.includes('fetch'),
      isServerError: message.includes('Internal server error') || message.includes('500'),
      isValidationError: message.includes('validation') || message.includes('invalid'),
      severity: this.getErrorSeverity(message)
    };
    
    // Log detailed error info for debugging
    console.error('Error Details:', errorInfo);
    
    return errorInfo;
  }

  /**
   * Determine error severity
   * @param {string} message - Error message
   * @returns {string} Severity level
   */
  static getErrorSeverity(message) {
    const criticalPatterns = [
      'server error', 'network error', 'failed to fetch', 'service unavailable'
    ];
    
    const warningPatterns = [
      'validation', 'invalid input', 'not found', 'expired'
    ];
    
    const lowercaseMessage = message.toLowerCase();
    
    if (criticalPatterns.some(pattern => lowercaseMessage.includes(pattern))) {
      return 'critical';
    }
    
    if (warningPatterns.some(pattern => lowercaseMessage.includes(pattern))) {
      return 'warning';
    }
    
    return 'info';
  }

  /**
   * Create a formatted error object for display
   * @param {string} message - Error message
   * @param {string} context - Context
   * @returns {Object} Display-ready error object
   */
  static createDisplayError(message, context = '') {
    const errorInfo = this.handleApiError(new Error(message), context);
    
    return {
      title: this.getErrorTitle(errorInfo.severity),
      message: errorInfo.userMessage,
      advice: errorInfo.advice,
      canRetry: !errorInfo.isServerError,
      severity: errorInfo.severity,
      context: context
    };
  }

  /**
   * Get appropriate error title based on severity
   * @param {string} severity - Error severity
   * @returns {string} Error title
   */
  static getErrorTitle(severity) {
    switch (severity) {
      case 'critical':
        return 'Critical Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Error';
    }
  }

  /**
   * Validate CSV input format
   * @param {string} csvData - CSV input string
   * @returns {Object} Validation result
   */
  static validateCsvInput(csvData) {
    if (!csvData || !csvData.trim()) {
      return {
        valid: false,
        error: 'Please enter some data to test',
        advice: ['Enter comma-separated numeric values', 'Use the provided examples as reference']
      };
    }

    const values = csvData.trim().split(',').map(v => v.trim());
    
    // Check for empty values
    if (values.some(v => v === '')) {
      return {
        valid: false,
        error: 'Empty values found in input',
        advice: ['Remove empty values', 'Ensure all fields have data']
      };
    }

    // Check for non-numeric values
    const nonNumericValues = values.filter(v => isNaN(parseFloat(v)));
    if (nonNumericValues.length > 0) {
      return {
        valid: false,
        error: `Non-numeric values found: ${nonNumericValues.join(', ')}`,
        advice: ['All values must be numbers', 'Remove any text or special characters']
      };
    }

    return {
      valid: true,
      values: values.map(v => parseFloat(v)),
      count: values.length
    };
  }

  /**
   * Validate image file
   * @param {File} file - Image file
   * @returns {Object} Validation result
   */
  static validateImageFile(file) {
    if (!file) {
      return {
        valid: false,
        error: 'No file selected',
        advice: ['Please select an image file']
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit`,
        advice: ['Reduce image file size', 'Use image compression tools', 'Try a different image']
      };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}`,
        advice: ['Use PNG, JPG, JPEG, BMP, TIFF, or GIF format', 'Convert your image to a supported format']
      };
    }

    return {
      valid: true,
      size: file.size,
      type: file.type,
      name: file.name
    };
  }

  /**
   * Create retry handler
   * @param {Function} operation - Operation to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} delay - Delay between retries (ms)
   * @returns {Function} Retry function
   */
  static createRetryHandler(operation, maxRetries = 3, delay = 1000) {
    return async (...args) => {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation(...args);
        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${attempt} failed:`, error.message);
          
          // Don't retry for certain types of errors
          if (this.shouldNotRetry(error)) {
            break;
          }
          
          // Wait before retrying (except on last attempt)
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
          }
        }
      }
      
      throw lastError;
    };
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error object
   * @returns {boolean} Whether to skip retry
   */
  static shouldNotRetry(error) {
    const noRetryPatterns = [
      'validation',
      'invalid input',
      'not found',
      'unauthorized',
      'forbidden',
      'bad request'
    ];
    
    const message = error.message.toLowerCase();
    return noRetryPatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Format error for toast display
   * @param {string} message - Error message
   * @param {string} context - Context
   * @returns {string} Formatted message for toast
   */
  static formatForToast(message, context = '') {
    const userMessage = this.getUserFriendlyMessage(message);
    
    if (context) {
      return `${context}: ${userMessage}`;
    }
    
    return userMessage;
  }

  /**
   * Handle session errors specifically
   * @param {string} sessionId - Session ID
   * @param {Error} error - Error object
   * @returns {Object} Session error info
   */
  static handleSessionError(sessionId, error) {
    const isSessionError = error.message.includes('session') || 
                          error.message.includes('Session') ||
                          error.message.includes('expired');
    
    if (isSessionError) {
      return {
        type: 'session_error',
        shouldReloadModel: true,
        message: 'Your session has expired. Please reload the model.',
        action: 'reload_model'
      };
    }
    
    return {
      type: 'general_error',
      shouldReloadModel: false,
      message: this.getUserFriendlyMessage(error.message),
      action: 'retry'
    };
  }
}

/**
 * React Hook for error handling
 */
export const useErrorHandler = () => {
  const [lastError, setLastError] = React.useState(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const handleError = React.useCallback((error, context = '') => {
    const errorInfo = ErrorHandler.handleApiError(error, context);
    setLastError(errorInfo);
    return errorInfo;
  }, []);

  const clearError = React.useCallback(() => {
    setLastError(null);
    setRetryCount(0);
  }, []);

  const retry = React.useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  return {
    lastError,
    retryCount,
    handleError,
    clearError,
    retry,
    hasError: !!lastError
  };
};

/**
 * Enhanced API utility with error handling
 */
export class ApiClient {
  static baseURL = process.env.REACT_APP_API_URL || '';

  static async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Enhance error with context
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the server is running.');
      }
      
      throw error;
    }
  }

  static async get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  static async post(endpoint, data = null, headers = {}) {
    const options = { method: 'POST', headers };
    
    if (data instanceof FormData) {
      // Don't set Content-Type for FormData, let browser set it
      delete options.headers['Content-Type'];
      options.body = data;
    } else if (data) {
      options.body = JSON.stringify(data);
    }
    
    return this.request(endpoint, options);
  }

  static async delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  static validateModelId(modelId) {
    if (!modelId || !modelId.trim()) {
      throw new Error('Model ID is required');
    }
    
    // Basic sanitization
    const sanitized = modelId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitized !== modelId.trim()) {
      throw new Error('Model ID contains invalid characters');
    }
    
    return sanitized;
  }

  static validateSessionId(sessionId) {
    if (!sessionId || !sessionId.trim()) {
      return null; // Session ID is optional in some cases
    }
    
    return sessionId.trim();
  }

  static validateFileUpload(file, maxSize = 10 * 1024 * 1024, allowedTypes = []) {
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed`);
    }
    
    return true;
  }
}

export default ErrorHandler;