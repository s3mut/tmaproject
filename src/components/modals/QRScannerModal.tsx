import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSimulateScan: () => void;
}

const QRScannerModal: React.FC<Props> = ({ isOpen, onClose, onSimulateScan }) => {
  return (
    <div
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Scan QR Code</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="scan-area rounded-2xl p-8 text-center mb-4">
          <div className="w-32 h-32 mx-auto mb-4 qr-placeholder rounded-xl flex items-center justify-center">
            <i className="fas fa-qrcode text-4xl text-blue-500/50"></i>
          </div>
          <p className="text-sm text-slate-400">Arahkan kamera ke QR Code barang</p>
        </div>

        <button
          onClick={onSimulateScan}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium text-sm"
        >
          <i className="fas fa-camera mr-2"></i>Simulasi Scan
        </button>
      </div>
    </div>
  );
};

export default QRScannerModal;
