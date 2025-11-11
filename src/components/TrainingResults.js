import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import GradCAMViewer from './GradCAMViewer';

const TrainingResults = ({ trainingConfig, uploadedData, isTraining, results, onTrainingComplete, onReset }) => {
  const [trainingData, setTrainingData] = useState([]);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('tensorflow');
  const [trainingStartTime, setTrainingStartTime] = useState(null);
  const [trainingDuration, setTrainingDuration] = useState(0);
  const [isStoppingTraining, setIsStoppingTraining] = useState(false);
  const [activeTab, setActiveTab] = useState('charts');
  const [showGradCAMTab, setShowGradCAMTab] = useState(false);
  const [gradcamLoading, setGradcamLoading] = useState(false);
  // إضافة state للـ iterations
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [batchLoss, setBatchLoss] = useState(0);
  const [batchAccuracy, setBatchAccuracy] = useState(0);
  const [iterationDetails, setIterationDetails] = useState([]);

  useEffect(() => {
    if (isTraining && !results) {
      startTraining();
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
      setTrainingDuration(Math.floor((Date.now() - trainingStartTime) / 1000));
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTraining, trainingStartTime]);

  // Auto-start Grad-CAM when training completes
  useEffect(() => {
    if (!isTraining && results && !showGradCAMTab && trainingConfig.modelType === 'efficientnetv2') {
      console.log('🔮 Starting Grad-CAM computation...');
      computeGradCAM();
    }
  }, [isTraining, results]);

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
      const endpoint = trainingConfig.modelType === 'efficientnetv2' 
        ? '/api/train-efficientnet' 
        : '/api/train';

      const payload = {
        config: trainingConfig,
        dataInfo: uploadedData
      };

      const response = await fetch(endpoint, {
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
        setCurrentPhase(data.current_phase || 1);
        setTrainingData(data.history || []);

        // تحديث معلومات الـ iterations
        setCurrentBatch(data.current_batch || 0);
        setTotalBatches(data.total_batches || 0);
        setBatchLoss(data.batch_loss || 0);
        setBatchAccuracy(data.batch_accuracy || 0);
        setIterationDetails(data.iteration_details || []);

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
      setTimeout(pollTrainingProgress, 2000);
    }
  };

  const computeGradCAM = async () => {
    try {
      setGradcamLoading(true);
      const sessionId = uploadedData?.preview?.session_id;
      
      if (!sessionId) {
        console.error('Session ID not found');
        setGradcamLoading(false);
        return;
      }

      const response = await fetch('/api/compute-gradcam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });

      if (response.ok) {
        console.log('✅ Grad-CAM computation started');
        setShowGradCAMTab(true);
        // Switch UI to the Grad-CAM tab so the viewer can poll and display results
        setActiveTab('gradcam');
      }
    } catch (error) {
      console.error('Error starting Grad-CAM:', error);
    } finally {
      setGradcamLoading(false);
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
        setTrainingData([]);
        setCurrentEpoch(0);
        setTrainingDuration(0);
        setTrainingStartTime(null);
        setShowGradCAMTab(false);
        setCurrentPhase(1);
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
    if (trainingConfig.modelType === 'efficientnetv2') {
      const totalEpochs = (trainingConfig.epochs || 30) + (trainingConfig.phase2_epochs || 25);
      if (results && !isTraining) return 100;
      return Math.min((currentEpoch / totalEpochs) * 100, 100);
    } else {
      if (!trainingConfig.epochs) return 0;
      if (results && !isTraining) return 100;
      return Math.min((currentEpoch / trainingConfig.epochs) * 100, 100);
    }
  };

  const getTotalEpochs = () => {
    if (trainingConfig.modelType === 'efficientnetv2') {
      return (trainingConfig.epochs || 30) + (trainingConfig.phase2_epochs || 25);
    }
    return trainingConfig.epochs || 100;
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
      case 'efficientnetv2':
        return 'EfficientNetV2 (Transfer Learning)';
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
            {isTraining && trainingConfig.modelType === 'efficientnetv2' && (
              <p className="text-sm text-blue-600 mt-1">
                Phase {currentPhase}/2: {currentPhase === 1 ? 'Training classification head' : 'Fine-tuning base model'}
              </p>
            )}
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
            <span>
              Epoch {currentEpoch} of {getTotalEpochs()}
              {isTraining && trainingConfig.modelType === 'efficientnetv2' && (
                <span> (Phase {currentPhase})</span>
              )}
            </span>
            <span>{Math.round(getTrainingProgress())}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${getTrainingProgress()}%` }}
            ></div>
          </div>

          {/* Iteration Progress - يظهر فقط أثناء التدريب */}
          {isTraining && totalBatches > 0 && (
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center text-sm mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-900">
                    Batch Progress: {currentBatch} / {totalBatches}
                  </span>
                  {trainingConfig.modelType === 'efficientnetv2' && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      currentPhase === 1
                        ? 'bg-blue-500 text-white'
                        : 'bg-purple-500 text-white'
                    }`}>
                      Phase {currentPhase}
                    </span>
                  )}
                </div>
                <span className="text-blue-700 font-semibold">
                  {totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0}%
                </span>
              </div>

              {/* شريط تقدم الـ batch */}
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-200 ${
                    trainingConfig.modelType === 'efficientnetv2' && currentPhase === 2
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                  }`}
                  style={{ width: `${totalBatches > 0 ? (currentBatch / totalBatches) * 100 : 0}%` }}
                ></div>
              </div>

              {/* معلومات الـ batch الحالي */}
              <div className="flex justify-between text-xs text-blue-700">
                <span>Loss: {batchLoss.toFixed(4)}</span>
                <span>Accuracy: {(batchAccuracy * 100).toFixed(2)}%</span>
                {trainingConfig.modelType === 'efficientnetv2' && (
                  <span className="text-purple-700 font-medium">
                    {currentPhase === 1 ? '🎯 Training Head' : '🔧 Fine-tuning'}
                  </span>
                )}
              </div>
            </div>
          )}
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

      {/* Tabs Navigation - Always show if training started or completed */}
      {(trainingData.length > 0 || !isTraining || results) && (
        <div className="bg-white rounded-t-xl shadow-lg border-b">
          <div className="flex overflow-x-auto">
            {trainingData.length > 0 && (
              <>
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'charts'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📈 Charts
                </button>

                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'metrics'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📊 Metrics
                </button>
              </>
            )}

            {/* Grad-CAM Tab - Always show for EfficientNetV2 */}
            {trainingConfig.modelType === 'efficientnetv2' && (
              <button
                onClick={() => setActiveTab('gradcam')}
                className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'gradcam'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔍 Grad-CAM
                {!showGradCAMTab && <span className="ml-2 text-xs">⏳</span>}
              </button>
            )}

          {trainingData.length > 0 && (
            <>
              <button
                onClick={() => setActiveTab('iterations')}
                className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'iterations'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔄 Iterations
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'export'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📦 Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {trainingData.length > 0 && (
        <div className={`bg-white rounded-b-xl shadow-lg p-8 ${activeTab === 'charts' || activeTab === 'metrics' || activeTab === 'export' ? '' : 'rounded-xl'}`}>
          
          {/* Charts Tab */}
          {activeTab === 'charts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Loss Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Training & Validation Loss</h3>
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
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Training & Validation Accuracy</h3>
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

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Detailed Training Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Summary Stats */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4">Training Summary</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Model Type:</span>
                      <span className="font-medium text-blue-900">{getModelTypeDisplayName()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total Epochs:</span>
                      <span className="font-medium text-blue-900">{currentEpoch} / {getTotalEpochs()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Training Time:</span>
                      <span className="font-medium text-blue-900">{formatDuration(trainingDuration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Final Loss:</span>
                      <span className="font-medium text-blue-900">{getCurrentMetrics()?.loss?.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Final Accuracy:</span>
                      <span className="font-medium text-blue-900">
                        {getCurrentMetrics()?.accuracy ? `${(getCurrentMetrics().accuracy * 100).toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Final Val Loss:</span>
                      <span className="font-medium text-blue-900">{getCurrentMetrics()?.val_loss?.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Final Val Accuracy:</span>
                      <span className="font-medium text-blue-900">
                        {getCurrentMetrics()?.val_accuracy ? `${(getCurrentMetrics().val_accuracy * 100).toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Configuration Info */}
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-4">Training Configuration</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Optimizer:</span>
                      <span className="font-medium text-green-900">{trainingConfig.optimizer?.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Learning Rate:</span>
                      <span className="font-medium text-green-900">{trainingConfig.learningRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Batch Size:</span>
                      <span className="font-medium text-green-900">{trainingConfig.batchSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Validation Split:</span>
                      <span className="font-medium text-green-900">{(trainingConfig.validationSplit * 100).toFixed(0)}%</span>
                    </div>
                    {trainingConfig.modelType === 'efficientnetv2' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-green-700">Phase 1 Epochs:</span>
                          <span className="font-medium text-green-900">{trainingConfig.epochs}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Phase 2 Epochs:</span>
                          <span className="font-medium text-green-900">{trainingConfig.phase2_epochs}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Phase 2 LR:</span>
                          <span className="font-medium text-green-900">{trainingConfig.phase2_learning_rate}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grad-CAM Tab */}
          {activeTab === 'gradcam' && trainingConfig.modelType === 'efficientnetv2' && (
            <div>
              {showGradCAMTab && !gradcamLoading ? (
                <GradCAMViewer
                  sessionId={uploadedData?.preview?.session_id}
                  modelId={results?.model_type}
                />
              ) : (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium text-lg">Computing Grad-CAM Visualization...</p>
                  <p className="text-gray-500 text-sm mt-3">This may take 30-60 seconds. Please be patient.</p>
                  <div className="mt-6">
                    <div className="w-80 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-purple-600 animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  <p className="text-purple-600 text-xs mt-4 italic">
                    Processing selected images from each class...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Iterations Tab */}
          {activeTab === 'iterations' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Training Iterations Details</h3>

              {/* Current Batch Info (أثناء التدريب) */}
              {isTraining && totalBatches > 0 && (
                <div className={`mb-6 p-6 rounded-lg border-2 ${
                  trainingConfig.modelType === 'efficientnetv2' && currentPhase === 2
                    ? 'bg-gradient-to-br from-purple-50 to-pink-100 border-purple-300'
                    : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`text-lg font-semibold ${
                      trainingConfig.modelType === 'efficientnetv2' && currentPhase === 2
                        ? 'text-purple-900'
                        : 'text-blue-900'
                    }`}>
                      🔄 Live Training Progress
                    </h4>
                    {trainingConfig.modelType === 'efficientnetv2' && (
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          currentPhase === 1
                            ? 'bg-blue-500 text-white'
                            : 'bg-purple-500 text-white'
                        }`}>
                          Phase {currentPhase}/2
                        </span>
                        <span className="text-sm text-gray-600">
                          {currentPhase === 1 ? '(Training Head)' : '(Fine-tuning)'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-600">Current Batch</div>
                      <div className="text-2xl font-bold text-blue-600">{currentBatch}</div>
                      <div className="text-xs text-gray-500">of {totalBatches}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-600">Batch Progress</div>
                      <div className={`text-2xl font-bold ${
                        trainingConfig.modelType === 'efficientnetv2' && currentPhase === 2
                          ? 'text-purple-600'
                          : 'text-indigo-600'
                      }`}>
                        {totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">in current epoch</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-600">Batch Loss</div>
                      <div className="text-2xl font-bold text-red-600">{batchLoss.toFixed(4)}</div>
                      <div className="text-xs text-gray-500">current iteration</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-600">Batch Accuracy</div>
                      <div className="text-2xl font-bold text-green-600">
                        {(batchAccuracy * 100).toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-500">current iteration</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Iterations Table */}
              {iterationDetails.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">📊 Recent Iterations (Last 100)</h4>
                  <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Epoch
                          </th>
                          {trainingConfig.modelType === 'efficientnetv2' && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phase
                            </th>
                          )}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Batch
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Loss
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Accuracy
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {iterationDetails.slice().reverse().map((iteration, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {iteration.epoch}
                            </td>
                            {trainingConfig.modelType === 'efficientnetv2' && (
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  iteration.phase === 1 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  Phase {iteration.phase}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {iteration.batch}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {iteration.loss.toFixed(4)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {(iteration.accuracy * 100).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-600 font-medium text-lg">No iteration data available yet</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Iteration details will appear here once training starts
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && !isTraining && results && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Export Trained Model</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Summary */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Training Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Model Type:</span>
                      <span className="font-medium">{getModelTypeDisplayName()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Epochs:</span>
                      <span className="font-medium">{currentEpoch} / {getTotalEpochs()}</span>
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Validation Accuracy:</span>
                      <span className="font-medium">
                        {getCurrentMetrics()?.val_accuracy ? `${(getCurrentMetrics().val_accuracy * 100).toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Export Options */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Export Options</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="tensorflow">TensorFlow SavedModel</option>
                        <option value="onnx">ONNX Format</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose the format that best suits your deployment needs
                      </p>
                    </div>
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
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
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Your trained model will be packaged with all necessary files for deployment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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