import React from 'react';

const AccountDetailsModal = ({ isOpen, onClose, email }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Modal Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-75 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true" // Improve accessibility
      ></div>

      {/* Modal Content */}
      <div
        className={`relative bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all duration-300 ease-in-out ${
          isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
        }`}
      >
        <h2 className="text-xl font-semibold mb-4 text-white">Account Details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <p className="mt-1 text-gray-400">{email}</p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailsModal;