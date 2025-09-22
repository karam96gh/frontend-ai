import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const TrainingConfig = ({ uploadedData, onTrainingStart, onBack }) => {
  const [config, setConfig] = useState({
    modelType: 'perceptron',
    layers: [
      { type: 'perceptron', units: 1, activation: 'sigmoid' }
    ],
    optimizer: 'sgd',
    learningRate: 0.01,
    batchSize: 32,
    epochs: 100,
    validationSplit: 0.2,
    taskType: 'classification'
  });

  const [availableModelTypes, setAvailableModelTypes] = useState([
    { 
      value: 'perceptron', 
      label: 'Single Layer Perceptron', 
      description: 'Simple single neuron for binary classification' 
    },
    { 
      value: 'mlp', 
      label: 'Multi-Layer Perceptron (MLP)', 
      description: 'Multiple hidden layers for complex patterns' 
    },
    { 
      value: 'cnn', 
      label: 'Convolutional Neural Network', 
      description: 'For image classification tasks' 
    }
  ]);

  useEffect(() => {
    // Auto-configure based on data type
    if (uploadedData?.type === 'images') {
      setConfig(prev => ({
        ...prev,
        modelType: 'cnn',
        layers: [
          { type: 'conv2d', filters: 32, kernelSize: 3, activation: 'relu' },
          { type: 'maxpool2d', poolSize: 2 },
          { type: 'conv2d', filters: 64, kernelSize: 3, activation: 'relu' },
          { type: 'maxpool2d', poolSize: 2 },
          { type: 'flatten' },
          { type: 'dense', units: 128, activation: 'relu' },
          { type: 'dense', units: 10, activation: 'softmax' }
        ]
      }));
    } else {
      // For tabular data, default to MLP
      setConfig(prev => ({
        ...prev,
        modelType: 'mlp',
        layers: [
          { type: 'dense', units: 64, activation: 'relu' },
          { type: 'dense', units: 32, activation: 'relu' },
          { type: 'dense', units: 10, activation: 'softmax' }
        ]
      }));
    }
  }, [uploadedData]);

  const handleModelTypeChange = (newModelType) => {
    setConfig(prev => {
      let newLayers = [];
      
      if (newModelType === 'perceptron') {
        newLayers = [
          { type: 'perceptron', units: 1, activation: 'sigmoid' }
        ];
      } else if (newModelType === 'mlp') {
        newLayers = [
          { type: 'dense', units: 64, activation: 'relu' },
          { type: 'dense', units: 32, activation: 'relu' },
          { type: 'dense', units: 10, activation: 'softmax' }
        ];
      } else if (newModelType === 'cnn') {
        newLayers = [
          { type: 'conv2d', filters: 32, kernelSize: 3, activation: 'relu' },
          { type: 'maxpool2d', poolSize: 2 },
          { type: 'conv2d', filters: 64, kernelSize: 3, activation: 'relu' },
          { type: 'maxpool2d', poolSize: 2 },
          { type: 'flatten' },
          { type: 'dense', units: 128, activation: 'relu' },
          { type: 'dense', units: 10, activation: 'softmax' }
        ];
      }
      
      // Adjust optimizer for perceptron
      const newOptimizer = newModelType === 'perceptron' ? 'sgd' : 'adam';
      const newLearningRate = newModelType === 'perceptron' ? 0.01 : 0.001;
      
      return {
        ...prev,
        modelType: newModelType,
        layers: newLayers,
        optimizer: newOptimizer,
        learningRate: newLearningRate
      };
    });
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const addLayer = () => {
    let newLayer;
    
    if (config.modelType === 'cnn') {
      newLayer = { type: 'conv2d', filters: 32, kernelSize: 3, activation: 'relu' };
    } else if (config.modelType === 'mlp') {
      newLayer = { type: 'dense', units: 64, activation: 'relu' };
    } else {
      // Perceptron can't add layers
      toast.error('Single Layer Perceptron cannot have additional layers');
      return;
    }
    
    setConfig(prev => ({
      ...prev,
      layers: [...prev.layers.slice(0, -1), newLayer, prev.layers[prev.layers.length - 1]]
    }));
  };

  const removeLayer = (index) => {
    if (config.modelType === 'perceptron') {
      toast.error('Cannot remove layers from Single Layer Perceptron');
      return;
    }
    
    if (config.layers.length > 2) {
      setConfig(prev => ({
        ...prev,
        layers: prev.layers.filter((_, i) => i !== index)
      }));
    }
  };

  const getAvailableLayerTypes = () => {
    if (config.modelType === 'perceptron') {
      return [
        { value: 'perceptron', label: 'Perceptron' }
      ];
    } else if (config.modelType === 'cnn') {
      return [
        { value: 'conv2d', label: 'Conv2D' },
        { value: 'maxpool2d', label: 'MaxPool2D' },
        { value: 'flatten', label: 'Flatten' },
        { value: 'dense', label: 'Dense' },
        { value: 'dropout', label: 'Dropout' }
      ];
    } else {
      return [
        { value: 'dense', label: 'Dense' },
        { value: 'dropout', label: 'Dropout' }
      ];
    }
  };

  const updateLayer = (index, key, value) => {
    if (config.modelType === 'perceptron' && key !== 'activation') {
      // For perceptron, only allow activation change
      return;
    }
    
    setConfig(prev => ({
      ...prev,
      layers: prev.layers.map((layer, i) => 
        i === index ? { ...layer, [key]: value } : layer
      )
    }));
  };

  const handleStartTraining = () => {
    // Validation
    if (config.epochs < 1 || config.epochs > 1000) {
      toast.error('Epochs must be between 1 and 1000');
      return;
    }
    if (config.batchSize < 1 || config.batchSize > 512) {
      toast.error('Batch size must be between 1 and 512');
      return;
    }
    if (config.learningRate <= 0 || config.learningRate > 1) {
      toast.error('Learning rate must be between 0 and 1');
      return;
    }

    onTrainingStart(config);
  };

  const getModelDescription = () => {
    if (config.modelType === 'perceptron') {
      return {
        title: 'Single Layer Perceptron',
        description: 'A single neuron that learns a linear decision boundary. Best for linearly separable data.',
        complexity: 'Simple',
        bestFor: 'Binary classification, linearly separable data'
      };
    } else if (config.modelType === 'mlp') {
      return {
        title: 'Multi-Layer Perceptron',
        description: 'Multiple layers of neurons that can learn complex non-linear patterns.',
        complexity: 'Moderate to Complex',
        bestFor: 'Complex classification/regression, non-linear patterns'
      };
    } else {
      return {
        title: 'Convolutional Neural Network',
        description: 'Specialized for image processing with convolutional and pooling layers.',
        complexity: 'Complex',
        bestFor: 'Image classification, computer vision tasks'
      };
    }
  };

  const modelInfo = getModelDescription();

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-8 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Configure Your Model</h2>
        <p className="text-gray-600 text-lg">
          Choose and customize your neural network architecture
        </p>
      </div>

      <div className="p-8 space-y-8">
        {/* Model Type Selection */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Model Architecture</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableModelTypes.map((type) => (
              <div
                key={type.value}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  config.modelType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleModelTypeChange(type.value)}
              >
                <h4 className="font-medium text-gray-900">{type.label}</h4>
                <p className="text-sm text-gray-600 mt-1">{type.description}</p>
              </div>
            ))}
          </div>
          
          {/* Model Info Panel */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">{modelInfo.title}</h4>
            <p className="text-blue-800 text-sm mb-2">{modelInfo.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-900">Complexity: </span>
                <span className="text-blue-700">{modelInfo.complexity}</span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Best for: </span>
                <span className="text-blue-700">{modelInfo.bestFor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Layer Configuration */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Network Layers</h3>
            {config.modelType !== 'perceptron' && (
              <button
                onClick={addLayer}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Layer
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {config.layers.map((layer, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">
                    {config.modelType === 'perceptron' ? 'Perceptron Layer' : `Layer ${index + 1}`}
                  </span>
                  {config.modelType !== 'perceptron' && config.layers.length > 2 && (
                    <button
                      onClick={() => removeLayer(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={layer.type}
                      onChange={(e) => updateLayer(index, 'type', e.target.value)}
                      disabled={config.modelType === 'perceptron'}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {getAvailableLayerTypes().map(layerType => (
                        <option key={layerType.value} value={layerType.value}>
                          {layerType.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Units/Filters - only for certain layer types */}
                  {(layer.type === 'dense' || layer.type === 'conv2d' || layer.type === 'perceptron') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {layer.type === 'conv2d' ? 'Filters' : 
                         layer.type === 'perceptron' ? 'Output Units' : 'Units'}
                      </label>
                      <input
                        type="number"
                        value={layer.units || layer.filters || 1}
                        onChange={(e) => updateLayer(index, layer.type === 'conv2d' ? 'filters' : 'units', parseInt(e.target.value))}
                        disabled={config.modelType === 'perceptron'}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        min="1"
                        max={layer.type === 'perceptron' ? 10 : 1024}
                      />
                    </div>
                  )}
                  
                  {/* Kernel Size for Conv2D */}
                  {layer.type === 'conv2d' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kernel Size</label>
                      <input
                        type="number"
                        value={layer.kernelSize || 3}
                        onChange={(e) => updateLayer(index, 'kernelSize', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        min="1"
                        max="11"
                      />
                    </div>
                  )}
                  
                  {/* Pool Size for MaxPool2D */}
                  {layer.type === 'maxpool2d' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pool Size</label>
                      <input
                        type="number"
                        value={layer.poolSize || 2}
                        onChange={(e) => updateLayer(index, 'poolSize', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        min="1"
                        max="5"
                      />
                    </div>
                  )}
                  
                  {/* Dropout Rate */}
                  {layer.type === 'dropout' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dropout Rate</label>
                      <input
                        type="number"
                        step="0.1"
                        value={layer.rate || 0.5}
                        onChange={(e) => updateLayer(index, 'rate', parseFloat(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        min="0"
                        max="1"
                      />
                    </div>
                  )}
                  
                  {/* Activation Function */}
                  {(layer.type === 'dense' || layer.type === 'conv2d' || layer.type === 'perceptron') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Activation</label>
                      <select
                        value={layer.activation || 'relu'}
                        onChange={(e) => updateLayer(index, 'activation', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        {layer.type === 'perceptron' ? (
                          <>
                            <option value="sigmoid">Sigmoid</option>
                            <option value="tanh">Tanh</option>
                            <option value="relu">ReLU</option>
                          </>
                        ) : (
                          <>
                            <option value="relu">ReLU</option>
                            <option value="sigmoid">Sigmoid</option>
                            <option value="tanh">Tanh</option>
                            <option value="softmax">Softmax</option>
                            <option value="linear">Linear</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}
                </div>
                
                {/* Perceptron specific info */}
                {layer.type === 'perceptron' && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Single Layer Perceptron is best for binary classification of linearly separable data. 
                      For more complex patterns, consider using Multi-Layer Perceptron.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Training Parameters */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Training Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Optimizer</label>
              <select
                value={config.optimizer}
                onChange={(e) => handleConfigChange('optimizer', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {config.modelType === 'perceptron' ? (
                  <>
                    <option value="sgd">SGD (Recommended)</option>
                    <option value="adam">Adam</option>
                  </>
                ) : (
                  <>
                    <option value="adam">Adam</option>
                    <option value="sgd">SGD</option>
                    <option value="rmsprop">RMSprop</option>
                    <option value="adagrad">Adagrad</option>
                  </>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Learning Rate</label>
              <input
                type="number"
                step="0.0001"
                value={config.learningRate}
                onChange={(e) => handleConfigChange('learningRate', parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="0.0001"
                max="1"
              />
              {config.modelType === 'perceptron' && (
                <p className="text-xs text-gray-500 mt-1">Perceptrons typically use higher learning rates (0.01-0.1)</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Batch Size</label>
              <input
                type="number"
                value={config.batchSize}
                onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="1"
                max="512"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Epochs</label>
              <input
                type="number"
                value={config.epochs}
                onChange={(e) => handleConfigChange('epochs', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="1"
                max="1000"
              />
              {config.modelType === 'perceptron' && (
                <p className="text-xs text-gray-500 mt-1">Perceptrons often converge in 50-200 epochs</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Settings */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Validation Split</label>
              <input
                type="number"
                step="0.1"
                value={config.validationSplit}
                onChange={(e) => handleConfigChange('validationSplit', parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="0.1"
                max="0.5"
              />
              <p className="text-sm text-gray-500 mt-1">Percentage of data used for validation</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
              <select
                value={config.taskType}
                onChange={(e) => handleConfigChange('taskType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
              </select>
              {config.modelType === 'perceptron' && config.taskType === 'regression' && (
                <p className="text-xs text-yellow-600 mt-1">
                  Note: Single perceptrons are primarily designed for classification
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Model Summary */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Model Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Model Type:</span>
              <span className="font-medium ml-2">
                {config.modelType === 'perceptron' ? 'Perceptron' : 
                 config.modelType === 'mlp' ? 'MLP' : 'CNN'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Total Layers:</span>
              <span className="font-medium ml-2">{config.layers.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Optimizer:</span>
              <span className="font-medium ml-2">{config.optimizer.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-gray-500">Epochs:</span>
              <span className="font-medium ml-2">{config.epochs}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Data Upload
          </button>
          <button
            onClick={handleStartTraining}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start Training
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingConfig;