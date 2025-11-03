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

  const [availableModelTypes] = useState([
    { 
      value: 'perceptron', 
      label: 'Single Layer Perceptron', 
      description: 'Simple single neuron for binary classification',
      icon: '🧬'
    },
    { 
      value: 'mlp', 
      label: 'Multi-Layer Perceptron (MLP)', 
      description: 'Multiple hidden layers for complex patterns',
      icon: '🧠'
    },
    { 
      value: 'cnn', 
      label: 'Convolutional Neural Network', 
      description: 'For image classification tasks',
      icon: '📸'
    },
    { 
      value: 'efficientnetv2', 
      label: '🎯 EfficientNetV2 (Advanced)', 
      description: 'State-of-the-art model for medical imaging',
      icon: '⚡',
      advanced: true
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
      } else if (newModelType === 'efficientnetv2') {
        // EfficientNetV2 has automatic architecture
        newLayers = [];
      }
      
      // Adjust optimizer for perceptron
      const newOptimizer = newModelType === 'perceptron' ? 'sgd' : 'adam';
      const newLearningRate = newModelType === 'perceptron' ? 0.01 : 0.001;
      
      return {
        ...prev,
        modelType: newModelType,
        layers: newLayers,
        optimizer: newOptimizer,
        learningRate: newLearningRate,
        batchSize: newModelType === 'efficientnetv2' ? 16 : 32,
        epochs: newModelType === 'efficientnetv2' ? 30 : 100,
        phase2_epochs: 25,
        phase2_learning_rate: 0.00001
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

    // EfficientNetV2 validation
    if (config.modelType === 'efficientnetv2') {
      if (uploadedData?.type !== 'images') {
        toast.error('EfficientNetV2 requires image data');
        return;
      }
      if (config.phase2_epochs < 1 || config.phase2_epochs > 100) {
        toast.error('Phase 2 epochs must be between 1 and 100');
        return;
      }
    }

    onTrainingStart(config);
  };

  const getModelDescription = () => {
    switch (config.modelType) {
      case 'perceptron':
        return {
          title: 'Single Layer Perceptron',
          description: 'A single neuron that learns a linear decision boundary. Best for linearly separable data.',
          complexity: 'Simple',
          bestFor: 'Binary classification, linearly separable data',
          trainingTime: 'Very Fast (seconds)',
          memory: 'Minimal'
        };
      case 'mlp':
        return {
          title: 'Multi-Layer Perceptron',
          description: 'Multiple layers of neurons that can learn complex non-linear patterns.',
          complexity: 'Moderate to Complex',
          bestFor: 'Complex classification/regression, non-linear patterns',
          trainingTime: 'Medium (minutes)',
          memory: 'Low to Medium'
        };
      case 'cnn':
        return {
          title: 'Convolutional Neural Network',
          description: 'Specialized for image processing with convolutional and pooling layers.',
          complexity: 'Complex',
          bestFor: 'Image classification, computer vision tasks',
          trainingTime: 'Slow (10+ minutes)',
          memory: 'Medium to High'
        };
      case 'efficientnetv2':
        return {
          title: 'EfficientNetV2 (Transfer Learning)',
          description: 'State-of-the-art pre-trained model. Uses Transfer Learning for medical imaging with high accuracy.',
          complexity: 'Advanced',
          bestFor: 'Medical imaging, brain tumors, precise classification',
          trainingTime: 'Medium (3-10 minutes)',
          memory: 'High (requires 4GB+ RAM)'
        };
      default:
        return {
          title: 'Unknown',
          description: '',
          complexity: '',
          bestFor: '',
          trainingTime: '',
          memory: ''
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableModelTypes.map((type) => (
              <div
                key={type.value}
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all transform hover:scale-105 ${
                  config.modelType === type.value
                    ? type.advanced 
                      ? 'border-purple-500 bg-purple-50 shadow-lg'
                      : 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleModelTypeChange(type.value)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">{type.label}</h4>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </div>
                  <span className="text-3xl">{type.icon}</span>
                </div>
                {type.advanced && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <span className="inline-block px-3 py-1 bg-purple-200 text-purple-800 text-xs font-semibold rounded-full">
                      Advanced / Medical Imaging
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Model Info Panel */}
          <div className={`mt-6 p-6 rounded-lg border-l-4 ${
            config.modelType === 'efficientnetv2'
              ? 'bg-purple-50 border-purple-500'
              : 'bg-blue-50 border-blue-500'
          }`}>
            <h4 className={`font-bold text-lg mb-3 ${
              config.modelType === 'efficientnetv2'
                ? 'text-purple-900'
                : 'text-blue-900'
            }`}>
              {modelInfo.title}
            </h4>
            <p className={`text-sm mb-4 ${
              config.modelType === 'efficientnetv2'
                ? 'text-purple-800'
                : 'text-blue-800'
            }`}>
              {modelInfo.description}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className={`font-semibold ${
                  config.modelType === 'efficientnetv2'
                    ? 'text-purple-900'
                    : 'text-blue-900'
                }`}>
                  Complexity:
                </span>
                <p className={`${
                  config.modelType === 'efficientnetv2'
                    ? 'text-purple-700'
                    : 'text-blue-700'
                }`}>
                  {modelInfo.complexity}
                </p>
              </div>
              <div>
                <span className={`font-semibold ${
                  config.modelType === 'efficientnetv2'
                    ? 'text-purple-900'
                    : 'text-blue-900'
                }`}>
                  Best For:
                </span>
                <p className={`${
                  config.modelType === 'efficientnetv2'
                    ? 'text-purple-700'
                    : 'text-blue-700'
                }`}>
                  {modelInfo.bestFor}
                </p>
              </div>
              <div>
                <span className={`font-semibold ${
                  config.modelType === 'efficientnetv2'
                    ? 'text-purple-900'
                    : 'text-blue-900'
                }`}>
                  Training Time:
                </span>
                <p className={`${
                  config.modelType === 'efficientnetv2'
                    ? 'text-purple-700'
                    : 'text-blue-700'
                }`}>
                  {modelInfo.trainingTime}
                </p>
              </div>
              <div>
                <span className={`font-semibold ${
                  config.modelType === 'efficientnetv2'
                    ? 'text-purple-900'
                    : 'text-blue-900'
                }`}>
                  Memory:
                </span>
                <p className={`${
                  config.modelType === 'efficientnetv2'
                    ? 'text-purple-700'
                    : 'text-blue-700'
                }`}>
                  {modelInfo.memory}
                </p>
              </div>
            </div>
          </div>

          {/* EfficientNetV2 Info Box */}
          {config.modelType === 'efficientnetv2' && (
            <div className="mt-6 bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-lg p-6">
              <div className="flex items-start">
                <div className="text-4xl mr-4">🧠</div>
                <div className="flex-1">
                  <h4 className="font-bold text-purple-900 mb-2 text-lg">
                    What is EfficientNetV2?
                  </h4>
                  <p className="text-purple-800 text-sm mb-4">
                    An advanced pre-trained model already trained on millions of images. 
                    It uses "Transfer Learning" to achieve high accuracy quickly on new data.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white rounded p-3 border border-purple-300">
                      <p className="font-semibold text-purple-900 mb-2">✅ Advantages:</p>
                      <ul className="text-purple-700 text-sm space-y-1">
                        <li>• Very high accuracy</li>
                        <li>• Pre-trained on medical images</li>
                        <li>• Fast training process</li>
                        <li>• Shows what it learns (Grad-CAM)</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded p-3 border border-purple-300">
                      <p className="font-semibold text-purple-900 mb-2">⚠️ Requirements:</p>
                      <ul className="text-purple-700 text-sm space-y-1">
                        <li>• Images only (not CSV)</li>
                        <li>• RAM: 4GB minimum</li>
                        <li>• Longer training time</li>
                        <li>• GPU recommended</li>
                      </ul>
                    </div>
                  </div>
                  <p className="text-purple-700 text-xs mt-4 italic">
                    💡 Tip: Use this model for medical images to get the best results!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Layer Configuration - Only show for non-EfficientNetV2 */}
        {config.modelType !== 'efficientnetv2' && (
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
                    
                    {/* Units/Filters */}
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
                    
                    {/* Kernel Size */}
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
                    
                    {/* Pool Size */}
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
                  
                  {/* Perceptron Note */}
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
        )}

        {/* Training Parameters */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            ⚙️ Training Parameters
          </h3>

          {config.modelType === 'efficientnetv2' ? (
            // EfficientNetV2 Parameters
            <div>
              <p className="text-gray-600 text-sm mb-6">
                Configure the two-phase training process for optimal results.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Phase 1 */}
                <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
                  <h4 className="font-bold text-blue-900 mb-4 text-lg">Phase 1: Train Head</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Epochs
                      </label>
                      <input
                        type="number"
                        value={config.epochs || 30}
                        onChange={(e) => handleConfigChange('epochs', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        min="5"
                        max="100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Recommended: 20-40</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Learning Rate
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={config.learningRate || 0.001}
                        onChange={(e) => handleConfigChange('learningRate', parseFloat(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Recommended: 0.001</p>
                    </div>
                  </div>
                </div>
                
                {/* Phase 2 */}
                <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-600">
                  <h4 className="font-bold text-green-900 mb-4 text-lg">Phase 2: Fine-tune</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Epochs
                      </label>
                      <input
                        type="number"
                        value={config.phase2_epochs || 25}
                        onChange={(e) => handleConfigChange('phase2_epochs', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        min="5"
                        max="100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Recommended: 15-30</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Learning Rate (Fine-tune)
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={config.phase2_learning_rate || 0.00001}
                        onChange={(e) => handleConfigChange('phase2_learning_rate', parseFloat(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Recommended: 0.00001 (smaller than phase 1)</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Common Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={config.batchSize || 16}
                    onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min="8"
                    max="64"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 8-32 (lower = less memory)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Validation Split
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={config.validationSplit || 0.2}
                    onChange={(e) => handleConfigChange('validationSplit', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min="0.1"
                    max="0.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Percentage of data for validation</p>
                </div>
              </div>
            </div>
          ) : (
            // Standard Parameters for other models
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
                  <p className="text-xs text-gray-500 mt-1">Perceptrons typically use higher rates (0.01-0.1)</p>
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
                  <p className="text-xs text-gray-500 mt-1">Perceptrons often converge in 50-200</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Additional Settings */}
        {config.modelType !== 'efficientnetv2' && (
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
                    Note: Perceptrons are primarily designed for classification
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Model Summary */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Configuration Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-3 rounded border border-gray-200">
              <span className="text-gray-600">Model Type:</span>
              <p className="font-bold text-gray-900">
                {config.modelType === 'perceptron' ? 'Perceptron' : 
                 config.modelType === 'mlp' ? 'MLP' : 
                 config.modelType === 'cnn' ? 'CNN' :
                 'EfficientNetV2'}
              </p>
            </div>
            
            {config.modelType !== 'efficientnetv2' && (
              <div className="bg-white p-3 rounded border border-gray-200">
                <span className="text-gray-600">Layers:</span>
                <p className="font-bold text-gray-900">{config.layers.length}</p>
              </div>
            )}
            
            <div className="bg-white p-3 rounded border border-gray-200">
              <span className="text-gray-600">Epochs:</span>
              <p className="font-bold text-gray-900">
                {config.modelType === 'efficientnetv2' 
                  ? `${config.epochs} + ${config.phase2_epochs}`
                  : config.epochs}
              </p>
            </div>
            
            <div className="bg-white p-3 rounded border border-gray-200">
              <span className="text-gray-600">Learning Rate:</span>
              <p className="font-bold text-gray-900">{config.learningRate}</p>
            </div>
            
            <div className="bg-white p-3 rounded border border-gray-200">
              <span className="text-gray-600">Batch Size:</span>
              <p className="font-bold text-gray-900">{config.batchSize}</p>
            </div>
            
            <div className="bg-white p-3 rounded border border-gray-200">
              <span className="text-gray-600">Optimizer:</span>
              <p className="font-bold text-gray-900">{config.optimizer.toUpperCase()}</p>
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
            className={`px-8 py-3 text-white rounded-lg font-medium transition-colors ${
              config.modelType === 'efficientnetv2'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Start Training
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingConfig;