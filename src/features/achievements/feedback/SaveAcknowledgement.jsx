import { Sparkles, X } from 'lucide-react';

export function SaveAcknowledgement({ message, onClose }) {
  if (!message) return null;
  return (
    <aside className="save-acknowledgement" role="status" aria-live="polite">
      <span className="save-acknowledgement__mark"><Sparkles size={17} /></span>
      <span>
        <strong>{message.headline}</strong>
        <small>{message.supporting}</small>
      </span>
      <button type="button" onClick={onClose} aria-label="收起鼓励"><X size={16} /></button>
    </aside>
  );
}
