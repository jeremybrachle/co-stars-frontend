import { useState } from "react"
import EntityArtwork from "./EntityArtwork"
import type { NodeType } from "../types"

export type EntityDetailCard = {
  label: string
  value: string
}

export type EntityDetailsHistoryEntry = {
  key: string
  type: NodeType
  label: string
}

export type EntityDetailsRelatedEntity = {
  id: number
  type: NodeType
  label: string
  meta: string
  imageUrl: string | null
  badges: string[]
  popularity?: number | null
}

export type EntityDetailsDialogData = {
  key: string
  type: NodeType
  title: string
  imageUrl: string | null
  lead: string
  subtle: string | null
  badges: string[]
  cards: EntityDetailCard[]
  narrativeTitle: string
  narrative: string | null
  relationLabel: string
  relationSearchPlaceholder: string
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase()
}

export default function EntityDetailsDialog({
  detail,
  history,
  relationSearch,
  relatedEntities,
  isLoading,
  errorMessage,
  onClose,
  onRelationSearchChange,
  onOpenRelatedEntity,
  onNavigateHistory,
}: {
  detail: EntityDetailsDialogData | null
  history: EntityDetailsHistoryEntry[]
  relationSearch: string
  relatedEntities: EntityDetailsRelatedEntity[]
  isLoading: boolean
  errorMessage: string | null
  onClose: () => void
  onRelationSearchChange: (value: string) => void
  onOpenRelatedEntity: (entity: EntityDetailsRelatedEntity) => void
  onNavigateHistory: (index: number) => void
}) {
  const [expandedNarrativeKey, setExpandedNarrativeKey] = useState<string | null>(null)

  if (!detail) {
    return null
  }

  const isNarrativeExpanded = expandedNarrativeKey === detail.key
  const filteredEntities = relatedEntities.filter((entity) => {
    if (!relationSearch.trim()) {
      return true
    }

    return normalizeSearchValue(entity.label).includes(normalizeSearchValue(relationSearch))
  })

  return (
    <div className="catalogDialogOverlay" onClick={onClose}>
      <div className="catalogDialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="catalogDialogClose" onClick={onClose} aria-label="Close details">×</button>

        {history.length > 1 ? (
          <div className="catalogDetailTrail" aria-label="Navigation trail">
            {history.map((entry, index) => {
              const isLast = index === history.length - 1

              return (
                <button
                  key={entry.key}
                  type="button"
                  className={`catalogDetailTrailStep${isLast ? " catalogDetailTrailStep--active" : ""}`}
                  onClick={() => onNavigateHistory(index)}
                  disabled={isLast}
                >
                  <span className={`searchSelectionBadge searchSelectionBadge--${entry.type}`}>{entry.type}</span>
                  <span>{entry.label}</span>
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="catalogDialogHeader">
          <div className="catalogDialogHero">
            <EntityArtwork
              type={detail.type}
              label={detail.title}
              imageUrl={detail.imageUrl}
              className="entityArtwork entityArtwork--hero"
              imageClassName="entityArtwork__image"
              placeholderClassName="entityArtwork__emoji"
            />
            <div>
              <div className="pageEyebrow">{detail.type === "actor" ? "Actor Details" : "Movie Details"}</div>
              <h2>{detail.title}</h2>
              <p className="catalogDetailLead">{detail.lead}</p>
              {detail.subtle ? <p className="catalogDetailSubtle">{detail.subtle}</p> : null}
            </div>
          </div>
          <div className={`searchSelectionBadge searchSelectionBadge--${detail.type}`}>{detail.type}</div>
        </div>

        {detail.badges.length > 0 ? (
          <div className="entityBadgeRow entityBadgeRow--detail">
            {detail.badges.map((badge) => <span key={badge} className="entityBadge">{badge}</span>)}
          </div>
        ) : null}

        <div className="catalogDetailMetaGrid">
          {detail.cards.map((card) => (
            <div key={card.label} className="catalogDetailMetaCard">
              <span className="catalogDetailMetaLabel">{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>

        {detail.narrative ? (
          <div className={`catalogDetailNarrative${isNarrativeExpanded ? " catalogDetailNarrative--expanded" : ""}`}>
            <div className="catalogDetailNarrativeHeader">
              <h3>{detail.narrativeTitle}</h3>
              <button
                type="button"
                className="catalogDetailNarrativeToggle"
                onClick={() => setExpandedNarrativeKey((currentValue) => (currentValue === detail.key ? null : detail.key))}
                aria-label={isNarrativeExpanded ? "Collapse text" : "Expand text"}
              >
                {isNarrativeExpanded ? "−" : "+"}
              </button>
            </div>
            <p>{detail.narrative}</p>
          </div>
        ) : null}

        <div className="catalogRelationToolbar">
          <label className="catalogControlField">
            <span>Search this list</span>
            <input
              type="text"
              value={relationSearch}
              onChange={(event) => onRelationSearchChange(event.target.value)}
              placeholder={detail.relationSearchPlaceholder}
            />
          </label>
        </div>

        <div className="catalogDialogListHeader">
          <h3>{detail.relationLabel}</h3>
          <span>{filteredEntities.length}</span>
        </div>

        {isLoading ? <div className="pageStatus">Loading connected entries…</div> : null}
        {errorMessage ? <div className="pageStatus pageStatus--error">{errorMessage}</div> : null}

        <div className="catalogDialogList">
          {!isLoading && !errorMessage && filteredEntities.length === 0 ? (
            <div className="catalogEmptyState">No connected entries matched the current search.</div>
          ) : null}
          {filteredEntities.map((entity) => (
            <button
              key={`${entity.type}-${entity.id}`}
              type="button"
              className="catalogDialogListItem"
              onClick={() => onOpenRelatedEntity(entity)}
            >
              <div className="catalogDialogListPrimary">
                <EntityArtwork
                  type={entity.type}
                  label={entity.label}
                  imageUrl={entity.imageUrl}
                  className="entityArtwork entityArtwork--row"
                  imageClassName="entityArtwork__image"
                  placeholderClassName="entityArtwork__emoji"
                />
                <div>
                  <span>{entity.label}</span>
                  <span className="catalogDialogListMeta">{entity.meta}</span>
                </div>
              </div>
              <div className="catalogDialogListSecondary">
                {typeof entity.popularity === "number" ? <span className="catalogDialogPopularity">Popularity {entity.popularity.toFixed(1)}</span> : null}
                {entity.badges.slice(0, 3).map((badge) => <span key={badge} className="entityBadge">{badge}</span>)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
