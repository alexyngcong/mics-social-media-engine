interface SpinnerProps {
  color?: string;
  size?: number;
}

export function Spinner({ color = '#A8926A', size = 48 }: SpinnerProps) {
  return (
    <div
      className="rounded-full animate-spin"
      style={{
        width: size,
        height: size,
        border: '2px solid rgba(30,30,56,1)',
        borderTopColor: color,
      }}
    />
  );
}
