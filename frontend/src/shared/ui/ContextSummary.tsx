import { AREAS } from '../config/constants';
import { useContextStore } from '../state/context-store';

type ContextSummaryProps = {
  onEdit: () => void;
};

function getAreaLabel(value: string) {
  return AREAS.find(([, areaValue]) => areaValue === value)?.[0] || 'Sachsen';
}

export function ContextSummary({ onEdit }: ContextSummaryProps) {
  const context = useContextStore((state) => state.context);

  return (
    <div className="work-context-bar">
      <span>Arbeitskontext:</span>
      <button className="context-summary" type="button" onClick={onEdit}>
        {getAreaLabel(context.area)} - {context.city || 'Alle Orte'} - {context.type || 'Alle Datentypen'}
      </button>
      <button className="context-edit" type="button" onClick={onEdit}>Ändern</button>
    </div>
  );
}
