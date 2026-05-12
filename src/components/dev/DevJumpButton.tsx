interface DevJumpButtonProps {
  onClick: () => void;
}

export function DevJumpButton({ onClick }: DevJumpButtonProps) {
  return (
    <button className="dev-jump-button" onClick={onClick} type="button">
      DEV: Jump to Completed Imprint
    </button>
  );
}
