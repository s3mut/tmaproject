import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AssetDetail } from '../types/inventory';

interface ModalState {
  formOpen: boolean;
  detailOpen: boolean;
  qrOpen: boolean;
  transactionOpen: boolean;
  csvImportOpen: boolean;
  confirmOpen: boolean;
  proposeDisposalOpen: boolean;
  editItem: AssetDetail | null;
  detailItem: AssetDetail | null;
}

interface ModalContextProps {
  state: ModalState;
  openForm: (item?: AssetDetail | null) => void;
  closeForm: () => void;
  openDetail: (item: AssetDetail) => void;
  closeDetail: () => void;
  openQr: () => void;
  closeQr: () => void;
  openTransaction: (item?: AssetDetail | null) => void;
  closeTransaction: () => void;
  openCsvImport: () => void;
  closeCsvImport: () => void;
  openConfirm: () => void;
  closeConfirm: () => void;
  openProposeDisposal: () => void;
  closeProposeDisposal: () => void;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proposeDisposalOpen, setProposeDisposalOpen] = useState(false);
  const [editItem, setEditItem] = useState<AssetDetail | null>(null);
  const [detailItem, setDetailItem] = useState<AssetDetail | null>(null);

  const value: ModalContextProps = {
    state: {
      formOpen, detailOpen, qrOpen, transactionOpen, csvImportOpen, confirmOpen, proposeDisposalOpen, editItem, detailItem
    },
    openForm: (item = null) => {
      setEditItem(item);
      setFormOpen(true);
    },
    closeForm: () => {
      setEditItem(null);
      setFormOpen(false);
    },
    openDetail: (item) => {
      setDetailItem(item);
      setDetailOpen(true);
    },
    closeDetail: () => {
      setDetailItem(null);
      setDetailOpen(false);
    },
    openQr: () => setQrOpen(true),
    closeQr: () => setQrOpen(false),
    openTransaction: (item = null) => {
      if (item) setDetailItem(item);
      setTransactionOpen(true);
    },
    closeTransaction: () => setTransactionOpen(false),
    openCsvImport: () => setCsvImportOpen(true),
    closeCsvImport: () => setCsvImportOpen(false),
    openConfirm: () => setConfirmOpen(true),
    closeConfirm: () => setConfirmOpen(false),
    openProposeDisposal: () => setProposeDisposalOpen(true),
    closeProposeDisposal: () => setProposeDisposalOpen(false),
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

export const useModals = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
};
