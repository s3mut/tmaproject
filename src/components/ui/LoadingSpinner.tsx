interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner = ({
  text = 'Memuat komponen...',
  size = 'md',
  className = '',
}: LoadingSpinnerProps) => {
  const iconSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-3xl';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <div className={`flex flex-col items-center justify-center py-10 opacity-70 ${className}`}>
      <i className={`fas fa-spinner fa-spin ${iconSize} text-blue-500 mb-3`} />
      <span className={`text-slate-500 ${textSize} animate-pulse font-medium`}>{text}</span>
    </div>
  );
};
