import { QuickLoader } from "./QuickLoader";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div class="loading-state" role="status">
      <QuickLoader color="teal" />
      <span>{label}</span>
    </div>
  );
}
