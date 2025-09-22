import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import DataUpload from './components/DataUpload';
import TrainingConfig from './components/TrainingConfig';
import TrainingResults from './components/TrainingResults';
import ModelTesting from './components/ModelTesting';
import Header from './components/Header';
import ErrorHandler from './utils/errorHandler';

function App() {
  const [currentView, setCurrentView] = useState('train');
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedData, setUploadedData] = useState(null);
  const [trainingConfig, setTrainingConfig] = useState({});
  const [trainingResults, setTrainingResults] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  
  // Enhanced error handling
  const [systemHealth, setSystemHealth] = useState({ status: 'unknown', checking: true });
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [lastError, setLastError] = useState(null);

  // Check system health on mount
  useEffect(() => {
    checkSystemHealth();
    const healthInterval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds
    
    return () => clearInterval(healthInterval);
  }, []);

  const checkSystemHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (response.ok) {
        setSystemHealth({
          status: 'healthy',
          checking: false,
          info: data
        });
        setConnectionStatus('connected');
        
        // Clear any previous connection errors
        if (lastError?.type === 'connection') {
          setLastError(null);
        }
      } else {
        throw new Error(data.error || 'Health check failed');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth({
        status: 'unhealthy',
        checking: false,
        error: error.message
      });
      setConnectionStatus('disconnected');
      
      // Only show error if it's a new connection issue
      if (connectionStatus === 'connected') {
        const errorInfo = ErrorHandler.handleApiError(error, 'System Health Check');
        setLastError({ ...errorInfo, type: 'connection' });
        toast.error('Lost connection to server');
      }
    }
  };

  const handleDataUpload = (data) => {
    try {
      setUploadedData(data);
      setCurrentStep(2);
      setLastError(null);
      toast.success('Data uploaded successfully!');
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error, 'Data Upload');
      setLastError(errorInfo);
      toast.error(errorInfo.userMessage);
    }
  };

  const handleTrainingStart = (config) => {
    try {
      // Validate configuration before starting
      if (!config || !uploadedData) {
        throw new Error('Invalid training configuration or missing data');
      }

      setTrainingConfig(config);
      setCurrentStep(3);
      setIsTraining(true);
      setLastError(null);
      
      toast.success(`Starting ${config.modelType?.toUpperCase()} training...`);
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error, 'Training Start');
      setLastError(errorInfo);
      toast.error(errorInfo.userMessage);
    }
  };

  const handleTrainingComplete = (results) => {
    try {
      setTrainingResults(results);
      setIsTraining(false);
      setLastError(null);
      
      if (results) {
        toast.success('Training completed successfully!');
      } else {
        toast.error('Training was stopped or failed');
      }
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error, 'Training Complete');
      setLastError(errorInfo);
      toast.error(errorInfo.userMessage);
    }
  };

  const resetApp = () => {
    try {
      setCurrentStep(1);
      setUploadedData(null);
      setTrainingConfig({});
      setTrainingResults(null);
      setIsTraining(false);
      setLastError(null);
      toast.success('Application reset successfully');
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error, 'App Reset');
      setLastError(errorInfo);
      toast.error(errorInfo.userMessage);
    }
  };

  const dismissError = () => {
    setLastError(null);
  };

  const renderConnectionStatus = () => {
    if (connectionStatus === 'checking') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
            <span className="text-blue-800 text-sm">Checking server connection...</span>
          </div>
        </div>
      );
    }

    if (connectionStatus === 'disconnected') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-900">Server Connection Lost</h4>
                <p className="text-red-700 text-sm">Unable to connect to the Neural Network Trainer server.</p>
              </div>
            </div>
            <button
              onClick={checkSystemHealth}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderSystemStatus = () => {
    if (systemHealth.checking) return null;

    if (systemHealth.status === 'healthy' && systemHealth.info) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-800 text-sm">
                Server Online • TensorFlow {systemHealth.info.tensorflow_version} • 
                {systemHealth.info.available_models} models available
                {systemHealth.info.active_sessions > 0 && ` • ${systemHealth.info.active_sessions} active sessions`}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderErrorAlert = () => {
    if (!lastError) return null;

    const severityConfig = {
      critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', icon: 'text-red-600' },
      warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', icon: 'text-yellow-600' },
      info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' }
    };

    const config = severityConfig[lastError.severity] || severityConfig.info;

    return (
      <div className={`${config.bg} ${config.border} border rounded-lg p-4 mb-6`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <svg className={`w-5 h-5 ${config.icon} mr-3 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className={`font-medium ${config.text}`}>
                {ErrorHandler.getErrorTitle(lastError.severity)}
                {lastError.context && ` - ${lastError.context}`}
              </h4>
              <p className={`${config.text} text-sm mt-1`}>
                {lastError.userMessage}
              </p>
              
              {lastError.advice && lastError.advice.length > 0 && (
                <div className="mt-3">
                  <p className={`${config.text} text-sm font-medium mb-1`}>Suggested actions:</p>
                  <ul className={`${config.text} text-sm space-y-1`}>
                    {lastError.advice.map((advice, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                        {advice}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {lastError.timestamp && (
                <p className={`${config.text.replace('900', '600')} text-xs mt-2`}>
                  Occurred at: {new Date(lastError.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={dismissError}
            className={`${config.icon} hover:opacity-75 transition-opacity`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // Render different views based on currentView
  if (currentView === 'test') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Toaster 
          position="top-right" 
          toastOptions={{
            duration: 4000,
            style: {
              maxWidth: '500px',
            },
          }}
        />
        <Header />
        
        {/* Navigation */}
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4">
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentView('train')}
                className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
              >
                Train Models
              </button>
              <button
                onClick={() => setCurrentView('test')}
                className="py-4 px-2 border-b-2 border-blue-600 text-blue-600 font-medium"
              >
                Test Models
              </button>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-6">
          {renderConnectionStatus()}
          {renderSystemStatus()}
          {renderErrorAlert()}
        </div>
        
        <ModelTesting />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            maxWidth: '500px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
      <Header />
      
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('train')}
              className="py-4 px-2 border-b-2 border-blue-600 text-blue-600 font-medium"
            >
              Train Models
            </button>
            <button
              onClick={() => setCurrentView('test')}
              className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
            >
              Test Models
            </button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* System Status */}
        {renderConnectionStatus()}
        {renderSystemStatus()}
        {renderErrorAlert()}

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className={`h-1 w-16 transition-colors ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className={`h-1 w-16 transition-colors ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
          </div>
          <div className="flex justify-center mt-2 space-x-12 text-sm text-gray-600">
            <span className={currentStep === 1 ? 'font-medium text-blue-600' : ''}>Upload Data</span>
            <span className={currentStep === 2 ? 'font-medium text-blue-600' : ''}>Configure Model</span>
            <span className={currentStep === 3 ? 'font-medium text-blue-600' : ''}>View Results</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          {currentStep === 1 && (
            <DataUpload 
              onDataUpload={handleDataUpload}
              disabled={connectionStatus === 'disconnected'}
            />
          )}
          
          {currentStep === 2 && (
            <TrainingConfig
              uploadedData={uploadedData}
              onTrainingStart={handleTrainingStart}
              onBack={() => setCurrentStep(1)}
              disabled={connectionStatus === 'disconnected'}
            />
          )}
          
          {currentStep === 3 && (
            <TrainingResults
              trainingConfig={trainingConfig}
              uploadedData={uploadedData}
              isTraining={isTraining}
              results={trainingResults}
              onTrainingComplete={handleTrainingComplete}
              onReset={resetApp}
            />
          )}
        </div>
      </div>

      {/* Enhanced Model Information Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">P</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Perceptron</h3>
              <p className="text-sm text-gray-600">
                Single neuron for binary classification with linear decision boundary
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Best for: Linearly separable data
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-green-600 font-bold text-lg">MLP</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Multi-Layer Perceptron</h3>
              <p className="text-sm text-gray-600">
                Multiple hidden layers for complex non-linear pattern recognition
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Best for: Complex tabular data
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-purple-600 font-bold text-lg">CNN</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Convolutional Network</h3>
              <p className="text-sm text-gray-600">
                Specialized architecture for image classification and computer vision
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Best for: Image data
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;