import type { DetailTabKey } from '../types';

interface DetailTabsProps {
  activeTab: DetailTabKey;
  onChange: (value: DetailTabKey) => void;
}

const TAB_ITEMS: Array<{ key: DetailTabKey; label: string }> = [
  { key: 'overview', label: '개요' },
  { key: 'population', label: '인구' },
  { key: 'elections', label: '선거결과' },
  { key: 'other', label: '기타' },
];

export function DetailTabs({ activeTab, onChange }: DetailTabsProps) {
  return (
    <div className="tab-row">
      {TAB_ITEMS.map((item) => (
        <button
          className={activeTab === item.key ? 'tab-button tab-button-active' : 'tab-button'}
          key={item.key}
          onClick={() => onChange(item.key)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
