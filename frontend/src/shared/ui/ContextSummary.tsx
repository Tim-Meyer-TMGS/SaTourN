import { AREAS } from '../config/constants';
import { useContextStore } from '../state/context-store';

function getAreaLabel(value: string) {
  return AREAS.find(([, areaValue]) => areaValue === value)?.[0] || 'Sachsen';
}

export function ContextSummary() {
  const context = useContextStore((state) => state.context);

  return (
    <div className="work-context-bar">
      <span>Arbeitskontext:</span>
      <button className="context-summary" type="button">
        {getAreaLabel(context.area)} - {context.city || 'Alle Orte'} - {context.type || 'Alle Datentypen'}
      </button>
    </div>
  );
}
