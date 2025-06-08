import { ReactNode } from 'react';
import './ListItem.css';

interface ListItemProps {
  id: string;
  selected?: boolean;
  onClick?: () => void;
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ListItem({
  id,
  selected = false,
  onClick,
  header,
  children,
  className = ''
}: ListItemProps) {
  return (
    <div
      className={`list-item ${selected ? 'selected' : ''} ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      data-item-id={id}
    >
      {header && <div className="list-item-header">{header}</div>}
      <div className="list-item-content">
        {children}
      </div>
    </div>
  );
}