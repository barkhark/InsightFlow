import React from 'react';

export const DynamicFieldRenderer = ({ fields = [], values = {}, onChange }) => {
  if (!fields || fields.length === 0) return null;

  const handleChange = (key, val) => {
    onChange({
      ...values,
      [key]: val,
    });
  };

  const handleCheckboxChange = (key, optValue, isChecked) => {
    const currentList = Array.isArray(values[key]) ? values[key] : [];
    const updated = isChecked
      ? [...currentList, optValue]
      : currentList.filter((item) => item !== optValue);
    handleChange(key, updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {fields
        .sort((a, b) => a.order - b.order)
        .map((field) => {
          const val = values[field.field_key] ?? '';

          return (
            <div key={field.id || field.field_key}>
              <label className="input-label">
                {field.field_label}
                {field.is_required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
              </label>

              {/* Text Input */}
              {field.field_type === 'text' && (
                <input
                  type="text"
                  className="input-field"
                  placeholder={field.placeholder || `Enter ${field.field_label}`}
                  value={val}
                  required={field.is_required}
                  onChange={(e) => handleChange(field.field_key, e.target.value)}
                />
              )}

              {/* Text Area */}
              {field.field_type === 'textarea' && (
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder={field.placeholder || `Enter ${field.field_label}`}
                  value={val}
                  required={field.is_required}
                  onChange={(e) => handleChange(field.field_key, e.target.value)}
                />
              )}

              {/* Dropdown Select */}
              {field.field_type === 'select' && (
                <select
                  className="input-field"
                  value={val}
                  required={field.is_required}
                  onChange={(e) => handleChange(field.field_key, e.target.value)}
                >
                  <option value="">-- Select an option --</option>
                  {(field.options_json || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Number Input */}
              {field.field_type === 'number' && (
                <input
                  type="number"
                  className="input-field"
                  placeholder={field.placeholder || '0'}
                  value={val}
                  required={field.is_required}
                  onChange={(e) => handleChange(field.field_key, e.target.value)}
                />
              )}

              {/* Date Input */}
              {field.field_type === 'date' && (
                <input
                  type="date"
                  className="input-field"
                  value={val}
                  required={field.is_required}
                  onChange={(e) => handleChange(field.field_key, e.target.value)}
                />
              )}

              {/* Checkbox Group */}
              {field.field_type === 'checkbox' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.35rem' }}>
                  {(field.options_json || []).map((opt) => {
                    const checked = Array.isArray(val) && val.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => handleCheckboxChange(field.field_key, opt.value, e.target.checked)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Helper text */}
              {field.help_text && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  {field.help_text}
                </p>
              )}
            </div>
          );
        })}
    </div>
  );
};
