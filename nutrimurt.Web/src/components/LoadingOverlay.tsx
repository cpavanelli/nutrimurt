import Spinner from './Spinner';

interface LoadingOverlayProps {
  visible: boolean;
  label?: string;
}

export default function LoadingOverlay({ visible, label }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-slate-950/60 backdrop-blur-sm">
      <Spinner size="md" />
      {label && <p className="mt-3 text-sm text-slate-300">{label}</p>}
    </div>
  );
}
