export const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-10 opacity-70">
    <i className="fas fa-spinner fa-spin text-3xl text-blue-500 mb-3" />
    <span className="text-slate-500 text-sm animate-pulse font-medium">Memuat komponen...</span>
  </div>
);
