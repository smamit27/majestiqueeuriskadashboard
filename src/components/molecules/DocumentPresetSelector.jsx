import React from 'react';
import { FileText, Presentation, Table, FileSpreadsheet, FileUp, ExternalLink } from 'lucide-react';

/**
 * DocumentPresetSelector Molecule
 * Renders preset document switcher buttons, custom uploaded doc button,
 * file uploader label, and open URL trigger.
 */
export default function DocumentPresetSelector({
  presets = [],
  selectedDocId,
  customDoc,
  onSelectPreset,
  onSelectCustom,
  onFileUpload,
  onOpenUrlModal
}) {
  return (
    <div className="ip-preset-group">
      {presets.map(docItem => {
        const isSelected = selectedDocId === docItem.id;
        const typeClass = docItem.type === 'XLSX'
          ? 'ip-preset-btn--xlsx'
          : docItem.type === 'PPT'
          ? 'ip-preset-btn--ppt'
          : '';

        let icon = <FileText size={15} color={isSelected ? '#0d9488' : '#64748b'} />;
        if (docItem.type === 'PPT') {
          icon = <Presentation size={15} color={isSelected ? '#d97706' : '#64748b'} />;
        } else if (docItem.type === 'XLSX') {
          icon = <Table size={15} color={isSelected ? '#059669' : '#64748b'} />;
        }

        return (
          <button
            key={docItem.id}
            type="button"
            onClick={() => onSelectPreset(docItem.id)}
            className={`ip-preset-btn ${isSelected ? `ip-preset-btn--selected ${typeClass}` : ''}`}
          >
            {icon}
            <span>{docItem.type}: {docItem.title.split(' ')[0]} {docItem.title.split(' ')[1]}…</span>
          </button>
        );
      })}

      {customDoc && (
        <button
          type="button"
          onClick={onSelectCustom}
          className={`ip-preset-btn ${selectedDocId === 'custom' ? 'ip-preset-btn--selected' : ''}`}
        >
          {customDoc.type === 'XLSX' ? (
            <FileSpreadsheet size={15} color="#059669" />
          ) : (
            <FileText size={15} color="#0d9488" />
          )}
          <span>{customDoc.type}: {customDoc.title.slice(0, 16)}…</span>
        </button>
      )}

      {/* Upload Local File Button */}
      <label
        className="ip-upload-btn"
        title="Upload any PDF, XLSX, XLS, CSV or Presentation to view in-portal"
      >
        <FileUp size={15} />
        <span>Open File (PPT/PDF/XLSX)</span>
        <input
          type="file"
          accept=".pdf,.html,.htm,.txt,.png,.jpg,.jpeg,.webp,.pptx,.ppt,.xlsx,.xls,.csv"
          onChange={onFileUpload}
          className="ip-upload-input"
        />
      </label>

      {/* Open Web URL Button */}
      <button
        type="button"
        onClick={onOpenUrlModal}
        className="ip-url-btn"
        title="Open document via web URL"
      >
        <ExternalLink size={14} />
        <span>Open URL</span>
      </button>
    </div>
  );
}
