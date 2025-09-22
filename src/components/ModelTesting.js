import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const ModelTesting = () => {
  // State management
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [loadedModel, setLoadedModel] = useState(null);
  const [trainingDataInfo, setTrainingDataInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  
  // Input states
  const [csvInput, setCsvInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  
  // Validation states
  const [csvValidation, setCsvValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // Enhanced error handling
  const [lastError, setLastError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadAvailableModels();
    // Cleanup session on unmount
    return () => {
      if (sessionId) {
        closeSession();
      }
    };
  }, []);

  const loadAvailableModels = async () => {
    setIsLoadingModels(true);
    setLastError(null);
    
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      
      if (response.ok) {
        setAvailableModels(data.models || []);
        if (data.models.length === 0) {
          toast.error('No trained models found. Train a model first!');
        } else {
          toast.success(`Found ${data.models.length} available models`);
        }
      } else {
        throw new Error(data.error || 'Failed to load models');
      }
    } catch (error) {
      const errorMsg = `Error loading models: ${error.message}`;
      setLastError(errorMsg);
      toast.error(errorMsg);
      
      // Retry logic
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadAvailableModels();
        }, 2000);
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelSelect = async (modelId) => {
    if (!modelId) {
      setSelectedModel(null);
      setLoadedModel(null);
      setSessionId(null);
      return;
    }

    setIsLoadingModel(true);
    setLastError(null);
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add session ID if we have one
      if (sessionId) {
        headers['X-Session-ID'] = sessionId;
      }
      
      const response = await fetch(`/api/load-model/${modelId}`, {
        method: 'POST',
        headers
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSelectedModel(modelId);
        setLoadedModel(data.model_info);
        setSessionId(data.session_id);
        setTestResults(null);
        setCsvValidation(null);
        
        toast.success(`Model ${modelId} loaded successfully!`);
        
        // Load training data info for CSV guidance
        loadTrainingDataInfo(modelId);
      } else {
        throw new Error(data.error || 'Failed to load model');
      }
    } catch (error) {
      const errorMsg = `Error loading model: ${error.message}`;
      setLastError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingModel(false);
    }
  };

  const loadTrainingDataInfo = async (modelId) => {
    try {
      const headers = {};
      if (sessionId) {
        headers['X-Session-ID'] = sessionId;
      }
      
      const response = await fetch(`/api/training-data-info/${modelId}`, {
        headers
      });
      const data = await response.json();
      
      if (response.ok) {
        setTrainingDataInfo(data.training_info);
      } else {
        console.log('Training data info not available:', data.error);
        setTrainingDataInfo(null);
      }
    } catch (error) {
      console.log('Error loading training data info:', error);
      setTrainingDataInfo(null);
    }
  };

const validateCsvInput = useCallback(async (csvData) => {
    // ✅ تحقق بسيط جداً محلياً
    if (!csvData.trim() || !sessionId) {
        setCsvValidation(null);
        return;
    }

    const values = csvData.trim().split(',');
    if (values.length === 3) {
        setCsvValidation({
            valid: true,
            num_features: 3,
            preprocessing_available: true
        });
    } else {
        setCsvValidation({
            valid: false,
            error: `Expected 3 values, got ${values.length}`
        });
    }
}, [sessionId]);
  // Debounce CSV validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (csvInput && sessionId) {
        validateCsvInput(csvInput);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [csvInput, sessionId, validateCsvInput]);

  const handleCsvTest = async () => {
    if (!csvInput.trim()) {
      toast.error('Please enter CSV data');
      return;
    }

    if (!sessionId) {
      toast.error('No active session. Please reload the model.');
      return;
    }

    if (csvValidation && !csvValidation.valid) {
      toast.error('Please fix validation errors before testing');
      return;
    }

    setIsTesting(true);
    setLastError(null);
    
    try {
      const response = await fetch('/api/test-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ csvData: csvInput.trim() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResults(data.result);
        toast.success('CSV prediction completed!');
      } else {
        throw new Error(data.error || 'Prediction failed');
      }
    } catch (error) {
      const errorMsg = `CSV Test Error: ${error.message}`;
      setLastError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsTesting(false);
    }
  };

  const onImageDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file too large. Maximum size is 10MB.');
      return;
    }

    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onImageDrop,
    accept: { 
      'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.gif'] 
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024
  });

  const handleImageTest = async () => {
    if (!uploadedImage) {
      toast.error('Please upload an image');
      return;
    }

    if (!sessionId) {
      toast.error('No active session. Please reload the model.');
      return;
    }

    setIsTesting(true);
    setLastError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', uploadedImage);
      formData.append('session_id', sessionId);

      const response = await fetch('/api/test-image', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResults(data.result);
        toast.success('Image prediction completed!');
      } else {
        throw new Error(data.error || 'Prediction failed');
      }
    } catch (error) {
      const errorMsg = `Image Test Error: ${error.message}`;
      setLastError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsTesting(false);
    }
  };

  const clearImageUpload = () => {
    setUploadedImage(null);
    setImagePreview(null);
  };

  const closeSession = async () => {
    if (!sessionId) return;
    
    try {
      await fetch('/api/close-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        }
      });
    } catch (error) {
      console.error('Error closing session:', error);
    }
  };

  const renderModelStatus = (model) => {
    const statusConfig = {
      healthy: { color: 'text-green-600', bg: 'bg-green-100', text: '✅ Healthy' },
      corrupted: { color: 'text-red-600', bg: 'bg-red-100', text: '❌ Corrupted' },
      unknown: { color: 'text-gray-600', bg: 'bg-gray-100', text: '❓ Unknown' }
    };
    
    const status = statusConfig[model.health_status] || statusConfig.unknown;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${status.bg} ${status.color}`}>
        {status.text}
      </span>
    );
  };

  const renderValidationStatus = () => {
    if (isValidating) {
      return (
        <div className="flex items-center text-blue-600 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
          Validating...
        </div>
      );
    }

    if (!csvValidation) return null;

    if (csvValidation.valid) {
      return (
        <div className="text-green-600 text-sm flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Valid input ({csvValidation.num_features} features)
          {csvValidation.preprocessing_available && (
            <span className="ml-2 text-blue-600">• Preprocessing available</span>
          )}
        </div>
      );
    } else {
      return (
        <div className="text-red-600 text-sm flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {csvValidation.error}
        </div>
      );
    }
  };

  const renderErrorAlert = () => {
    if (!lastError) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-red-900">Error Occurred</h4>
            <p className="text-red-700 text-sm mt-1">{lastError}</p>
            {retryCount > 0 && (
              <p className="text-red-600 text-xs mt-1">Retry attempt: {retryCount}/3</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Test Your Models</h1>
          <p className="text-gray-600 text-lg">
            Test your trained models with CSV data or image uploads
          </p>
          {sessionId && (
            <p className="text-blue-600 text-sm mt-2">
              Session ID: {sessionId}
            </p>
          )}
        </div>

        {renderErrorAlert()}

        {/* Model Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Model</h2>
          
          {isLoadingModels ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <span className="ml-3 text-gray-600">Loading models...</span>
            </div>
          ) : availableModels.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Models Available</h3>
              <p className="text-gray-600 mb-4">Train a model first to test it here.</p>
              <button
                onClick={loadAvailableModels}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Models
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <select
                value={selectedModel || ''}
                onChange={(e) => handleModelSelect(e.target.value)}
                disabled={isLoadingModel}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a model to test...</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.display_name || model.name}
                    {model.final_accuracy && ` (${(model.final_accuracy * 100).toFixed(1)}% accuracy)`}
                    {model.size_mb && ` - ${model.size_mb}MB`}
                  </option>
                ))}
              </select>
              
              {isLoadingModel && (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent"></div>
                  <span className="ml-2 text-gray-600">Loading model...</span>
                </div>
              )}
              
              {loadedModel && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-semibold text-green-900">Model Loaded Successfully</h4>
                        <p className="text-green-700 text-sm">
                          Type: {loadedModel.data_type} | Task: {loadedModel.task_type} | Architecture: {loadedModel.model_type}
                          {loadedModel.num_classes && ` | Classes: ${loadedModel.num_classes}`}
                        </p>
                        {loadedModel.class_names && loadedModel.class_names.length > 0 && (
                          <p className="text-green-700 text-sm">
                            Class Names: {loadedModel.class_names.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {renderModelStatus(loadedModel)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Testing Interface */}
        {loadedModel && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CSV Testing */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">CSV Input Testing</h3>
              
              {trainingDataInfo ? (
                <div className="mb-4">
                  <p className="text-gray-600 mb-2">
                    This model expects <strong>{trainingDataInfo.num_features}</strong> input features:
                  </p>
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">Feature names:</p>
                    <p className="text-sm text-blue-800">
                      {trainingDataInfo.feature_names.join(', ')}
                    </p>
                  </div>
                  
                  {trainingDataInfo.examples && trainingDataInfo.examples.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Example inputs from training data:</p>
                      <div className="space-y-1">
                        {trainingDataInfo.examples.map((example, idx) => (
                          <div key={idx} className="bg-gray-50 rounded px-3 py-2 text-sm font-mono text-gray-700">
                            <button
                              onClick={() => setCsvInput(example)}
                              className="text-left w-full hover:text-blue-600 transition-colors"
                              title="Click to use this example"
                            >
                              {example}
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Click any example to use it</p>
                    </div>
                  )}

                  {trainingDataInfo.guidance_note && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> {trainingDataInfo.guidance_note}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 mb-4">
                  Enter comma-separated values matching your training data format
                </p>
              )}
              
              <div className="space-y-4">
                <div>
                  <textarea
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    placeholder="Example: 1.5, 2.3, 4.1, 0.8, 1.2"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                  {renderValidationStatus()}
                </div>
                
                <button
                  onClick={handleCsvTest}
                  disabled={!csvInput.trim() || isTesting || (csvValidation && !csvValidation.valid)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Test CSV Input
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Image Testing */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Image Input Testing</h3>
              <p className="text-gray-600 mb-4">
                Upload an image to test your image classification model
              </p>
              
              {!uploadedImage ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-2">
                    <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600">
                      {isDragActive ? 'Drop image here' : 'Drag & drop an image, or click to browse'}
                    </p>
                    <p className="text-sm text-gray-400">PNG, JPG, JPEG, BMP, TIFF up to 10MB</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Upload preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={clearImageUpload}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      title="Remove image"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>File:</strong> {uploadedImage.name}</p>
                    <p><strong>Size:</strong> {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  
                  <button
                    onClick={handleImageTest}
                    disabled={isTesting}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isTesting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Test Image
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Results Display */}
        {testResults && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Prediction Results</h3>
              <span className="text-sm text-gray-500">
                Model: {testResults.model_type?.toUpperCase()}
              </span>
            </div>
            
            {testResults.task_type === 'classification' ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-blue-900">
                        Predicted Class: <span className="text-blue-700">{testResults.predicted_class}</span>
                      </h4>
                      <p className="text-blue-700">
                        Confidence: {testResults.confidence_percentage?.toFixed(1)}%
                      </p>
                      {testResults.model_insights && (
                        <p className="text-blue-600 text-sm mt-2 italic">
                          {testResults.model_insights}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        {testResults.confidence_percentage?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
                
                {testResults.all_probabilities && testResults.all_probabilities.length > 1 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">
                      All Class Probabilities ({testResults.all_probabilities.length} classes):
                    </h5>
                    <div className="space-y-2">
                      {testResults.all_probabilities.map((prob, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{prob.class}</span>
                          <div className="flex items-center space-x-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  idx === 0 ? 'bg-blue-600' : 'bg-gray-400'
                                }`}
                                style={{ width: `${prob.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">
                              {prob.percentage?.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-green-900 mb-2">
                  Predicted Value: <span className="text-green-700">{testResults.predicted_value?.toFixed(4)}</span>
                </h4>
                {testResults.model_insights && (
                  <p className="text-green-600 text-sm italic">
                    {testResults.model_insights}
                  </p>
                )}
                {trainingDataInfo?.target_name && (
                  <p className="text-green-700 text-sm">
                    Target: {trainingDataInfo.target_name}
                  </p>
                )}
              </div>
            )}

            {/* Debug Information */}
            {testResults.raw_prediction && (
              <details className="mt-4">
                <summary className="cursor-pointer text-gray-600 text-sm font-medium">
                  Show Raw Prediction Data
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
                  <pre>{JSON.stringify(testResults.raw_prediction, null, 2)}</pre>
                </div>
              </details>
            )}
          </div>
        )}

        {/* Session Management */}
        {sessionId && (
          <div className="mt-6 text-center">
            <button
              onClick={closeSession}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Close Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelTesting;