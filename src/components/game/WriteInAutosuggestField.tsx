import { useMemo, useState } from "react";
import EntityArtwork from "../EntityArtwork";
import { formatGameNodeMeta } from "../../data/presentation";
import type { GameNode } from "../../types";
import { getVisibleWriteInOptions } from "../../utils/writeInOptions";
import "./WriteInAutosuggestField.css";

type Props = {
  value: string;
  placeholder: string;
  suggestions: GameNode[];
  autoSuggestEnabled: boolean;
  disabled: boolean;
  autoFocus?: boolean;
  inputClassName: string;
  dropdownLabel: string;
  emptyMessage: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionSelect?: (suggestion: GameNode) => void;
};

function WriteInAutosuggestField({
  value,
  placeholder,
  suggestions,
  autoSuggestEnabled,
  disabled,
  autoFocus = false,
  inputClassName,
  dropdownLabel,
  emptyMessage,
  onChange,
  onSubmit,
  onSuggestionSelect,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const visibleSuggestions = useMemo(() => {
    if (!autoSuggestEnabled) {
      return [] as GameNode[];
    }

    return getVisibleWriteInOptions(suggestions, value, 12);
  }, [autoSuggestEnabled, suggestions, value]);
  const canShowDropdown = autoSuggestEnabled && !disabled && isOpen;

  return (
    <div className="write-in-autosuggest">
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          if (autoSuggestEnabled) {
            setIsOpen(true);
          }
        }}
        onFocus={() => {
          if (autoSuggestEnabled && !disabled) {
            setIsOpen(true);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        className={inputClassName}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        autoFocus={autoFocus}
      />
      {canShowDropdown ? (
        <div className="write-in-autosuggest__dropdown" role="listbox" aria-label={dropdownLabel}>
          {visibleSuggestions.length > 0 ? (
            visibleSuggestions.map((suggestion) => (
              <button
                key={`${suggestion.type}-${suggestion.id ?? suggestion.label}`}
                type="button"
                className="write-in-autosuggest__option"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setIsOpen(false);

                  if (onSuggestionSelect) {
                    onSuggestionSelect(suggestion);
                    return;
                  }

                  onChange(suggestion.label);
                }}
              >
                <EntityArtwork
                  type={suggestion.type}
                  label={suggestion.label}
                  imageUrl={suggestion.imageUrl}
                  className="write-in-autosuggest__artwork"
                  imageClassName="write-in-autosuggest__artwork-image"
                  placeholderClassName="write-in-autosuggest__artwork-emoji"
                />
                <span className="write-in-autosuggest__option-copy">
                  <span className="write-in-autosuggest__option-label">{suggestion.label}</span>
                  <span className="write-in-autosuggest__option-meta">{formatGameNodeMeta(suggestion)}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="write-in-autosuggest__empty">{emptyMessage}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default WriteInAutosuggestField;