import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const GradCAMViewer = ({ sessionId, modelId }) => {
  const [gradcamData, setGradcamData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);

  // تحميل بيانات Grad-CAM عند التركيب
  useEffect(() => {
    fetchGradCAMData();
  }, [sessionId]);

  const fetchGradCAMData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/gradcam-status/${sessionId}`);
      const data = await response.json();

      if (data.status === 'completed' && data.data) {
        setGradcamData(data.data);
        console.log('✅ Grad-CAM data loaded:', data.data.num_samples, 'samples');
      } else if (data.status === 'computing') {
        // إعادة المحاولة بعد 3 ثوان
        setTimeout(fetchGradCAMData, 3000);
      } else {
        toast.error('فشل تحميل بيانات Grad-CAM');
      }
    } catch (error) {
      console.error('Error fetching Grad-CAM:', error);
      toast.error('خطأ في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري حساب Grad-CAM...</p>
          <p className="text-xs text-gray-500 mt-2">قد يستغرق 30-60 ثانية</p>
        </div>
      </div>
    );
  }

  if (!gradcamData || gradcamData.samples.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800">لم يتم العثور على بيانات Grad-CAM</p>
        <button
          onClick={fetchGradCAMData}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const currentSample = gradcamData.samples[currentIndex];

  return (
    <div className="space-y-6">
      {/* شرح توضيحي */}
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
                ماذا تعني هذه الخريطة الحرارية؟
              </h3>
              <p className="text-purple-800 text-sm mb-3">
                تُظهر الخريطة الحرارية الأجزاء من الصورة التي ركّز عليها النموذج لاتخاذ قراره.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded p-3 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                    <span className="font-semibold text-red-700">🔴 أحمر (مهم جداً)</span>
                  </div>
                  <p className="text-gray-700">
                    الأجزاء التي تؤثر بشدة على القرار
                  </p>
                </div>

                <div className="bg-white rounded p-3 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                    <span className="font-semibold text-yellow-700">🟡 أصفر (متوسط)</span>
                  </div>
                  <p className="text-gray-700">
                    أجزاء مهمة لكن أقل تأثيراً
                  </p>
                </div>

                <div className="bg-white rounded p-3 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                    <span className="font-semibold text-blue-700">🔵 أزرق (أقل)</span>
                  </div>
                  <p className="text-gray-700">
                    أجزاء ليست مهمة للقرار
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* عرض الصور */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          🔬 تصور قرار النموذج
        </h3>

        {/* الشرح */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-900 text-sm">
            💡 <strong>كيف يعمل:</strong> النموذج يركز على أجزاء محددة من الصورة (الأحمر والأصفر) 
            لاتخاذ قراره. الأزرق تعني الأجزاء غير المهمة.
          </p>
        </div>

        {/* الصور الثلاثة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* الصورة الأصلية */}
          <div className="flex flex-col">
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ height: '300px' }}>
              <img
                src={currentSample.original_base64}
                alt="Original"
                className="max-h-full max-w-full rounded"
              />
            </div>
            <p className="text-center mt-3 font-semibold text-gray-900">🔬 الصورة الأصلية</p>
            <p className="text-center text-xs text-gray-600 mt-1">MRI Image</p>
          </div>

          {/* الدمج (Original + Heatmap) */}
          <div className="flex flex-col">
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ height: '300px' }}>
              <img
                src={currentSample.overlay_base64}
                alt="Overlay"
                className="max-h-full max-w-full rounded"
              />
            </div>
            <p className="text-center mt-3 font-semibold text-gray-900">🎯 تركيز النموذج</p>
            <p className="text-center text-xs text-gray-600 mt-1">
              ما ركز عليه النموذج (معلوف مع الأصلية)
            </p>
          </div>

          {/* خريطة الحرارة فقط */}
          <div className="flex flex-col">
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center relative" style={{ height: '300px' }}>
              <img
                src={currentSample.heatmap_base64}
                alt="Heatmap"
                className="max-h-full max-w-full rounded"
              />
              {/* أسطورة الألوان */}
              <div className="absolute bottom-2 left-2 w-8 h-24 bg-gradient-to-b from-red-500 via-yellow-500 to-blue-500 rounded border border-gray-400"></div>
            </div>
            <p className="text-center mt-3 font-semibold text-gray-900">🔥 خريطة الانتباه</p>
            <p className="text-center text-xs text-gray-600 mt-1">شدة الانتباه (أحمر = أهم)</p>
          </div>
        </div>

        {/* التنبؤات */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">📊 التنبؤات:</h4>

          <div className="space-y-3">
            {Object.entries(currentSample.all_predictions)
              .sort(([, a], [, b]) => b - a)
              .map(([className, probability], index) => {
                const colors = [
                  'from-red-400 to-red-600',
                  'from-yellow-400 to-yellow-600',
                  'from-green-400 to-green-600',
                  'from-blue-400 to-blue-600'
                ];

                const emoji = ['🔴', '🟡', '🟢', '🔵'][index];

                return (
                  <div key={className}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{emoji}</span>
                        <span className="font-medium text-gray-900 w-32">
                          {className}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {(probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${colors[index]} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${probability * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* الفئة المتنبأ بها */}
          <div className="mt-6 pt-4 border-t border-purple-200">
            <p className="text-center text-gray-600 mb-2">🎯 التنبؤ النهائي:</p>
            <p className="text-center">
              <span className="text-2xl font-bold text-purple-600">
                {currentSample.class_name}
              </span>
              <span className="text-gray-600 ml-3">
                ({(currentSample.all_predictions[currentSample.class_name] * 100).toFixed(1)}% ثقة)
              </span>
            </p>
          </div>
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