import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const TrainingResults = ({ trainingConfig, uploadedData, isTraining, results, onTrainingComplete, onReset }) => {
  const [trainingData, setTrainingData] = useState([]);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('tensorflow');
  const [trainingStartTime, setTrainingStartTime] = useState(null);
  const [trainingDuration, setTrainingDuration] = useState(0);
  const [isStoppingTraining, setIsStoppingTraining] = useState(false);

  useEffect(() => {
    if (isTraining && !results) {
      startTraining();
      // Start the timer when training begins
      setTrainingStartTime(Date.now());
    }
  }, [isTraining]);

  // Timer effect - updates every second while training
  useEffect(() => {
    let interval = null;
    
    if (isTraining && trainingStartTime) {
      interval = setInterval(() => {
        setTrainingDuration(Math.floor((Date.now() - trainingStartTime) / 1000));
      }, 1000);
    } else if (!isTraining && trainingStartTime) {
      // Training stopped, calculate final duration
      setTrainingDuration(Math.floor((Date.now() - trainingStartTime) / 1000));
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTraining, trainingStartTime]);

  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const startTraining = async () => {
    try {
      const payload = {
        config: trainingConfig,
        dataInfo: uploadedData
      };

      const response = await fetch('/api/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Training failed to start');
      }

      // Start polling for training progress
      pollTrainingProgress();
    } catch (error) {
      toast.error(error.message);
      onTrainingComplete(null);
    }
  };

  const pollTrainingProgress = async () => {
    try {
      const response = await fetch('/api/training-progress');
      const data = await response.json();

      if (data.status === 'training') {
        setCurrentEpoch(data.epoch);
        setTrainingData(data.history || []);
        
        // Continue polling
        setTimeout(pollTrainingProgress, 1000);
      } else if (data.status === 'completed') {
        setCurrentEpoch(data.epoch || trainingConfig.epochs);
        setTrainingData(data.history || []);
        onTrainingComplete({
          ...data,
          results: data.results || {},
          final_epoch: data.epoch || trainingConfig.epochs
        });
        toast.success('Training completed successfully!');
      } else if (data.status === 'error') {
        toast.error(data.error_message || 'Training failed');
        onTrainingComplete(null);
      } else if (data.status === 'stopped') {
        toast.info('Training was stopped');
        onTrainingComplete(null);
      }
    } catch (error) {
      console.error('Error polling training progress:', error);
      setTimeout(pollTrainingProgress, 2000); // Retry with longer delay
    }
  };

  const handleStopTraining = async () => {
    if (isStoppingTraining) return;
    
    setIsStoppingTraining(true);
    try {
      const response = await fetch('/api/stop-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast.success('Training stopped successfully');
        onTrainingComplete(null);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to stop training');
      }
    } catch (error) {
      toast.error('Error stopping training: ' + error.message);
    } finally {
      setIsStoppingTraining(false);
    }
  };

  const handleResetTrainingState = async () => {
    try {
      const response = await fetch('/api/reset-training-state', {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success('Training state reset successfully');
        // Reset local state
        setTrainingData([]);
        setCurrentEpoch(0);
        setTrainingDuration(0);
        setTrainingStartTime(null);
        onReset();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to reset training state');
      }
    } catch (error) {
      toast.error('Error resetting training state: ' + error.message);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export-model?format=${exportFormat}`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `trained_model.${exportFormat === 'tensorflow' ? 'zip' : 'onnx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Model exported successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const getTrainingProgress = () => {
    if (!trainingConfig.epochs) return 0;
    if (results && !isTraining) return 100; // Force 100% when completed
    return Math.min((currentEpoch / trainingConfig.epochs) * 100, 100);
  };

  const getCurrentMetrics = () => {
    if (trainingData.length === 0) return null;
    return trainingData[trainingData.length - 1];
  };

  const getModelTypeDisplayName = () => {
    const modelType = trainingConfig.modelType;
    switch (modelType) {
      case 'perceptron':
        return 'Single Layer Perceptron';
      case 'mlp':
        return 'Multi-Layer Perceptron (MLP)';
      case 'cnn':
        return 'Convolutional Neural Network (CNN)';
      default:
        return 'Neural Network';
    }
  };

  const getTrainingStatus = () => {
    if (isTraining) {
      return {
        text: 'Training in progress...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        icon: '🔄'
      };
    } else if (results) {
      return {
        text: 'Training completed',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: '✅'
      };
    } else {
      return {
        text: 'Training stopped',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        icon: '⏹️'
      };
    }
  };

  const status = getTrainingStatus();

  return (
    <div className="space-y-6">
      {/* Training Status */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Training Results</h2>
            <div className={`mt-2 px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${status.bgColor} ${status.color}`}>
              <span className="mr-2">{status.icon}</span>
              {status.text}
            </div>
            <p className="text-gray-600 mt-2">
              Model: {getModelTypeDisplayName()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Progress</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(getTrainingProgress())}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Time: {formatDuration(trainingDuration)}
            </div>
            {/* Control Buttons */}
            <div className="mt-4 space-y-2">
              {isTraining && (
                <button
                  onClick={handleStopTraining}
                  disabled={isStoppingTraining}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center"
                >
                  {isStoppingTraining ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Stopping...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">⏹️</span>
                      Stop Training
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleResetTrainingState}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center justify-center"
              >
                <span className="mr-2">🔄</span>
                Reset State
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Epoch {currentEpoch} of {trainingConfig.epochs}</span>
            <span>{Math.round(getTrainingProgress())}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${getTrainingProgress()}%` }}
            ></div>
          </div>
        </div>

        {/* Current Metrics */}
        {getCurrentMetrics() && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">Loss</div>
              <div className="text-xl font-bold text-gray-900">
                {getCurrentMetrics().loss?.toFixed(4) || 'N/A'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">Accuracy</div>
              <div className="text-xl font-bold text-gray-900">
                {getCurrentMetrics().accuracy ? `${(getCurrentMetrics().accuracy * 100).toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">Val Loss</div>
              <div className="text-xl font-bold text-gray-900">
                {getCurrentMetrics().val_loss?.toFixed(4) || 'N/A'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">Val Accuracy</div>
              <div className="text-xl font-bold text-gray-900">
                {getCurrentMetrics().val_accuracy ? `${(getCurrentMetrics().val_accuracy * 100).toFixed(2)}%` : 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Training Animation */}
        {isTraining && (
          <div className="flex items-center justify-center py-8">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}

        {/* Training Insights */}
        {getCurrentMetrics() && !isTraining && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Training Analysis</h4>
            <div className="text-sm text-blue-800">
              {getCurrentMetrics().val_accuracy && getCurrentMetrics().accuracy && (
                <div className="mb-2">
                  {getCurrentMetrics().val_accuracy < getCurrentMetrics().accuracy - 0.1 ? (
                    <span className="text-orange-600">⚠️ Possible overfitting detected. Consider adding dropout or more data.</span>
                  ) : getCurrentMetrics().val_accuracy > 0.9 ? (
                    <span className="text-green-600">✅ Excellent performance! Model is generalizing well.</span>
                  ) : getCurrentMetrics().val_accuracy > 0.7 ? (
                    <span className="text-blue-600">👍 Good performance. Model is learning effectively.</span>
                  ) : (
                    <span className="text-red-600">❌ Low accuracy. Consider adjusting model architecture or parameters.</span>
                  )}
                </div>
              )}
              <div>
                <strong>Model Type:</strong> {getModelTypeDisplayName()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Training Charts */}
      {trainingData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loss Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Training & Validation Loss</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trainingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="loss" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Training Loss"
                />
                <Line 
                  type="monotone" 
                  dataKey="val_loss" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  name="Validation Loss"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Training & Validation Accuracy</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trainingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" />
                <YAxis />
                <Tooltip formatter={(value) => [`${(value * 100).toFixed(2)}%`, '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Training Accuracy"
                />
                <Line 
                  type="monotone" 
                  dataKey="val_accuracy" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Validation Accuracy"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Export Section - Only show when training is complete */}
      {!isTraining && trainingData.length > 0 && results && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Export Trained Model</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Training Summary */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Training Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Model Type:</span>
                  <span className="font-medium">{getModelTypeDisplayName()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Epochs:</span>
                  <span className="font-medium">{currentEpoch} / {trainingConfig.epochs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Training Time:</span>
                  <span className="font-medium">{formatDuration(trainingDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Final Loss:</span>
                  <span className="font-medium">{getCurrentMetrics()?.loss?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Final Accuracy:</span>
                  <span className="font-medium">
                    {getCurrentMetrics()?.accuracy ? `${(getCurrentMetrics().accuracy * 100).toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                {results?.results?.total_params && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Parameters:</span>
                    <span className="font-medium">{results.results.total_params.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Export Options */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Export Options</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="tensorflow">TensorFlow SavedModel</option>
                    <option value="onnx">ONNX Format</option>
                  </select>
                </div>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📦</span>
                      Export Model
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-500">
                  Export your trained model for use in other applications
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={onReset}
          disabled={isTraining}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <span className="mr-2">🆕</span>
          Train New Model
        </button>
        
        {!isTraining && trainingData.length > 0 && (
          <button
            onClick={() => window.location.href = '#test'}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center"
          >
            <span className="mr-2">🧪</span>
            Test Model
          </button>
        )}
      </div>
    </div>
  );
};

export default TrainingResults;