import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const GradCAMViewer = ({ sessionId }) => {
  const [gradcamData, setGradcamData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);

  // Load Grad-CAM data on mount
  useEffect(() => {
    if (sessionId) {
      console.log('🚀 GradCAMViewer mounted with sessionId:', sessionId);
      fetchGradCAMData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const fetchGradCAMData = async () => {
    if (!sessionId) {
      console.error('❌ No sessionId provided to GradCAMViewer');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🔍 Fetching Grad-CAM data for session: ${sessionId}`);
      const response = await fetch(`/api/gradcam-status/${sessionId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Grad-CAM Status Response:', JSON.stringify(data, null, 2));

      if (data.status === 'completed' && data.data) {
        console.log('✅ Grad-CAM completed! Setting data...');
        console.log('   - num_samples:', data.data.num_samples);
        console.log('   - samples:', data.data.samples?.length || 0);

        setGradcamData(data.data);
        setIsLoading(false);
        toast.success(`Successfully loaded ${data.data.num_samples} images`);
      } else if (data.status === 'computing') {
        console.log('⏳ Grad-CAM still computing, retrying in 3 seconds...');
        setTimeout(fetchGradCAMData, 3000);
      } else {
        console.error('❌ Unexpected Grad-CAM status:', data.status);
        console.error('   Full response:', data);
        setIsLoading(false);
        toast.error(`Unexpected status: ${data.status || 'unknown'}`);
      }
    } catch (error) {
      console.error('❌ Error fetching Grad-CAM:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });
      setIsLoading(false);
      toast.error(`Error loading data: ${error.message}`);
    }
  };

  const startGradCAMComputation = async () => {
    if (!sessionId) {
      toast.error('No Session ID found');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🔮 Starting Grad-CAM computation for session: ${sessionId}`);
      const response = await fetch('/api/compute-gradcam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Started Grad-CAM computation... will take 30-60 seconds');
        console.log('✅ Grad-CAM computation started');
        // Start polling
        setTimeout(fetchGradCAMData, 3000);
      } else {
        throw new Error(data.error || 'Failed to start Grad-CAM computation');
      }
    } catch (error) {
      console.error('❌ Error starting Grad-CAM:', error);
      setIsLoading(false);
      toast.error(`Error: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Computing Grad-CAM...</p>
          <p className="text-xs text-gray-500 mt-2">May take 30-60 seconds</p>
        </div>
      </div>
    );
  }

  if (!gradcamData || !gradcamData.samples || gradcamData.samples.length === 0) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-8 text-center shadow-lg">
        <div className="text-6xl mb-4">🔍</div>
        <p className="text-yellow-800 font-bold text-xl mb-2">No Grad-CAM Data Found</p>
        <p className="text-sm text-yellow-600 mb-6">
          SessionId: <span className="font-mono bg-white px-2 py-1 rounded">{sessionId || 'Not Found'}</span>
        </p>

        <div className="bg-white border border-yellow-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-700 mb-3">
            <strong>💡 What happened?</strong><br/>
            Grad-CAM was not computed automatically for this model.
          </p>
          <p className="text-xs text-gray-600">
            You can compute Grad-CAM manually by clicking the button below.
          </p>
        </div>

        <details className="mb-6">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 mb-2">
            🐛 Technical Info (Debug Info)
          </summary>
          <div className="text-xs text-gray-600 font-mono text-left bg-white p-3 rounded border border-gray-200">
            <strong>Debug Info:</strong><br/>
            - gradcamData: {gradcamData ? 'exists' : 'null'}<br/>
            - samples: {gradcamData?.samples ? `${gradcamData.samples.length} items` : 'not found'}<br/>
            - isLoading: {isLoading ? 'true' : 'false'}<br/>
            - sessionId: {sessionId || 'undefined'}
          </div>
        </details>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={startGradCAMComputation}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
          >
            🔮 Compute Grad-CAM Now
          </button>
          <button
            onClick={fetchGradCAMData}
            className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors shadow-md"
          >
            🔄 Recheck
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          ⏱️ Grad-CAM computation usually takes 30-60 seconds
        </p>
      </div>
    );
  }

  const currentSample = gradcamData.samples[currentIndex];

  return (
    <div className="space-y-6">
      {/* Explanation */}
      {showExplanation && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6 relative">
          <button
            onClick={() => setShowExplanation(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>

          <div className="flex items-start">
            <div className="text-4xl mr-4">🔍</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-purple-900 mb-2">
                What does this heatmap mean?
              </h3>
              <p className="text-purple-800 text-sm mb-3">
                The heatmap shows which parts of the image the model focused on to make its decision.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded p-3 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                    <span className="font-semibold text-red-700">🔴 Red (Very Important)</span>
                  </div>
                  <p className="text-gray-700">
                    Parts that strongly influence the decision
                  </p>
                </div>

                <div className="bg-white rounded p-3 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                    <span className="font-semibold text-yellow-700">🟡 Yellow (Moderate)</span>
                  </div>
                  <p className="text-gray-700">
                    Important parts but less influential
                  </p>
                </div>

                <div className="bg-white rounded p-3 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                    <span className="font-semibold text-blue-700">🔵 Blue (Less)</span>
                  </div>
                  <p className="text-gray-700">
                    Parts not important for the decision
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Display */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          🔬 Model Decision Visualization
        </h3>

        {/* Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-900 text-sm">
            💡 <strong>How it works:</strong> The model focuses on specific parts of the image (red and yellow)
            to make its decision. Blue means less important parts.
          </p>
        </div>

        {/* Three Images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Original Image */}
          <div className="flex flex-col">
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ height: '300px' }}>
              <img
                src={currentSample.original_base64}
                alt="Original"
                className="max-h-full max-w-full rounded"
              />
            </div>
            <p className="text-center mt-3 font-semibold text-gray-900">🔬 Original Image</p>
            <p className="text-center text-xs text-gray-600 mt-1">MRI Image</p>
          </div>

          {/* Overlay (Original + Heatmap) */}
          <div className="flex flex-col">
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ height: '300px' }}>
              <img
                src={currentSample.overlay_base64}
                alt="Overlay"
                className="max-h-full max-w-full rounded"
              />
            </div>
            <p className="text-center mt-3 font-semibold text-gray-900">🎯 Model Focus</p>
            <p className="text-center text-xs text-gray-600 mt-1">
              What the model focused on (overlaid with original)
            </p>
          </div>

          {/* Heatmap Only */}
          <div className="flex flex-col">
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center relative" style={{ height: '300px' }}>
              <img
                src={currentSample.heatmap_base64}
                alt="Heatmap"
                className="max-h-full max-w-full rounded"
              />
              {/* Color Legend */}
              <div className="absolute bottom-2 left-2 w-8 h-24 bg-gradient-to-b from-red-500 via-yellow-500 to-blue-500 rounded border border-gray-400"></div>
            </div>
            <p className="text-center mt-3 font-semibold text-gray-900">🔥 Attention Map</p>
            <p className="text-center text-xs text-gray-600 mt-1">Attention intensity (red = most important)</p>
          </div>
        </div>

        {/* Main Result - Enhanced like Colab ✅ */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-6 text-white text-center">
          <p className="text-sm font-medium mb-2">🎯 Final Prediction</p>
          <h2 className="text-4xl font-bold mb-2">
            {currentSample.class_name}
          </h2>
          <p className="text-xl font-semibold">
            {(currentSample.confidence * 100).toFixed(1)}% confidence
          </p>
          {currentSample.confidence > 0.9 && (
            <p className="text-sm mt-2 bg-white/20 rounded-full px-4 py-1 inline-block">
              ✅ Very High Accuracy
            </p>
          )}
          {currentSample.confidence > 0.7 && currentSample.confidence <= 0.9 && (
            <p className="text-sm mt-2 bg-white/20 rounded-full px-4 py-1 inline-block">
              👍 Good Accuracy
            </p>
          )}
          {currentSample.confidence <= 0.7 && (
            <p className="text-sm mt-2 bg-white/20 rounded-full px-4 py-1 inline-block">
              ⚠️ Moderate Confidence
            </p>
          )}
        </div>

        {/* Top 3 Predictions - Same as Colab ✅ */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Top-3 Predictions
          </h4>

          <div className="space-y-4">
            {currentSample.top3_predictions && currentSample.top3_predictions.length > 0 ? (
              currentSample.top3_predictions.map((pred, index) => {
                const emojis = ['🔴', '🟡', '⚪'];
                const colors = [
                  'from-red-500 to-red-600',
                  'from-yellow-500 to-yellow-600',
                  'from-gray-400 to-gray-500'
                ];
                const bgColors = [
                  'bg-red-50 border-red-200',
                  'bg-yellow-50 border-yellow-200',
                  'bg-gray-50 border-gray-200'
                ];

                return (
                  <div key={pred.class_name} className={`${bgColors[index]} border-2 rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{emojis[index]}</span>
                        <span className="font-bold text-gray-900 text-lg">
                          {pred.class_name}
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-gray-900">
                        {(pred.confidence * 100).toFixed(1)}%
                      </span>
                    </div>

                    {/* Progress bar with █ characters (same as Colab) */}
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div
                          className={`bg-gradient-to-r ${colors[index]} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${pred.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-600 font-mono text-sm">
                        {'█'.repeat(Math.round(pred.confidence * 40))}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              // Fallback: if no top3_predictions, use all_predictions
              Object.entries(currentSample.all_predictions)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([className, probability], index) => {
                  const emojis = ['🔴', '🟡', '⚪'];
                  const colors = [
                    'from-red-500 to-red-600',
                    'from-yellow-500 to-yellow-600',
                    'from-gray-400 to-gray-500'
                  ];
                  const bgColors = [
                    'bg-red-50 border-red-200',
                    'bg-yellow-50 border-yellow-200',
                    'bg-gray-50 border-gray-200'
                  ];

                  return (
                    <div key={className} className={`${bgColors[index]} border-2 rounded-lg p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{emojis[index]}</span>
                          <span className="font-bold text-gray-900 text-lg">
                            {className}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">
                          {(probability * 100).toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div
                            className={`bg-gradient-to-r ${colors[index]} h-3 rounded-full transition-all duration-500`}
                            style={{ width: `${probability * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-600 font-mono text-sm">
                          {'█'.repeat(Math.round(probability * 40))}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* All predictions in collapsible section */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center">
              <span className="mr-2">📋</span>
              Show all predictions ({Object.keys(currentSample.all_predictions).length} classes)
            </summary>
            <div className="mt-4 space-y-2">
              {Object.entries(currentSample.all_predictions)
                .sort(([, a], [, b]) => b - a)
                .map(([className, probability]) => (
                  <div key={className} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{className}</span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full"
                          style={{ width: `${probability * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-900 font-medium w-16 text-right">
                        {(probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </details>
        </div>
      </div>

      {/* التنقل بين الصور */}
      <div className="flex items-center justify-center space-x-6 mb-6">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← السابقة
        </button>

        <div className="text-center">
          <p className="font-semibold text-gray-900">
            صورة {currentIndex + 1} من {gradcamData.num_samples}
          </p>
          <p className="text-xs text-gray-600">
            {currentSample.class_name} - {(currentSample.confidence * 100).toFixed(1)}% ثقة
          </p>
        </div>

        <button
          onClick={() => setCurrentIndex(Math.min(gradcamData.num_samples - 1, currentIndex + 1))}
          disabled={currentIndex === gradcamData.num_samples - 1}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          التالية →
        </button>
      </div>

      {/* مؤشر التقدم */}
      <div className="flex justify-center space-x-2">
        {Array.from({ length: gradcamData.num_samples }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-3 h-3 rounded-full transition-all ${
              idx === currentIndex
                ? 'bg-purple-600 w-8'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            title={`صورة ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default GradCAMViewer;