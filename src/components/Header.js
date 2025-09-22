import React from 'react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">NN</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Neural Network Trainer</h1>
              <p className="text-sm text-gray-600">Perceptron, MLP & CNN training platform</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Supported Models</div>
            <div className="flex space-x-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Perceptron</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">MLP</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">CNN</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;