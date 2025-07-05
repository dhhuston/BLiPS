import React, { useState } from 'react';

interface LiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LiabilityModal: React.FC<LiabilityModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('disclaimer');

  if (!isOpen) return null;

  const tabs = [
    { id: 'disclaimer', label: 'Disclaimer', icon: '⚠️' },
    { id: 'liability', label: 'Liability', icon: '⚖️' },
    { id: 'safety', label: 'Safety Notice', icon: '🛡️' },
    { id: 'regulations', label: 'Regulations', icon: '📋' }
  ];

  const tabContent = {
    disclaimer: {
      title: 'Software Disclaimer',
      content: [
        'BLiPS (Balloon Launch Prediction Software) is designed for educational and simulation purposes only.',
        'This software provides trajectory predictions and safety assessments based on mathematical models and available weather data.',
        'Predictions are estimates and should not be used as the sole basis for flight planning decisions.',
        'Always consult with aviation authorities and follow local regulations for actual balloon operations.',
        'The developers are not responsible for any decisions made based on this software.'
      ]
    },
    liability: {
      title: 'Liability Statement',
      content: [
        'This software is provided "as is" without warranty of any kind.',
        'The developers and contributors are not liable for any damages, injuries, or losses resulting from the use of this software.',
        'Users assume all risks associated with balloon operations and flight planning.',
        'This software does not replace professional aviation consultation or regulatory compliance.',
        'By using this software, you acknowledge and accept these liability limitations.'
      ]
    },
    safety: {
      title: 'Safety Notice',
      content: [
        'Balloon operations involve inherent risks and should only be conducted by qualified personnel.',
        'Weather conditions can change rapidly and may affect flight safety.',
        'Always verify weather forecasts and conditions before any balloon operation.',
        'Ensure proper safety equipment and emergency procedures are in place.',
        'Follow all applicable aviation safety regulations and guidelines.',
        'This software does not guarantee safe flight conditions or outcomes.'
      ]
    },
    regulations: {
      title: 'Regulatory Compliance',
      content: [
        'Balloon operations are subject to various aviation regulations and requirements.',
        'Users must comply with all applicable local, national, and international aviation laws.',
        'Obtain necessary permits and authorizations before conducting balloon operations.',
        'Follow air traffic control procedures and maintain proper communication.',
        'Respect restricted airspace and flight restrictions.',
        'Consult with aviation authorities for specific regulatory requirements in your area.'
      ]
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Legal & Safety Information</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">
              {tabContent[activeTab as keyof typeof tabContent].title}
            </h3>
            <div className="space-y-3">
              {tabContent[activeTab as keyof typeof tabContent].content.map((item, index) => (
                <div key={index} className="flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <p className="text-gray-300 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-900">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">
              BLiPS v0.1.0 - For simulation purposes only
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiabilityModal; 