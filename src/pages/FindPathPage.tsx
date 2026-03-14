import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { generatePath } from "../api/costars"
import PageBackButton from "../components/PageBackButton"
import { useDataSourceMode } from "../context/dataSourceMode"
import { useSnapshotData } from "../context/snapshotData"
import { resolveCatalogSource } from "../data/catalogSource"
import { isOnlineSnapshotMode } from "../data/dataSourcePreferences"
import { findNodeByLabel, generateLocalPath } from "../data/localGraph"
import type { Actor, Movie, NodeSummary, NodeType, SnapshotIndexes } from "../types"

type PathResult = {
  nodes: NodeSummary[]
  steps: number
  reason: string | null
}

type SearchOption = {
  id: number
  label: string
  type: NodeType
  meta: string
}

type SearchFieldProps = {
  label: string
  placeholder: string
  query: string
  onQueryChange: (value: string) => void
  selectedOption: SearchOption | null
  suggestions: SearchOption[]
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onSelect: (option: SearchOption) => void
  disabled: boolean
}

function normalizeQuery(value: string) {
  return value.trim().toLocaleLowerCase()
}

function SearchField({
  label,
  placeholder,
  query,
  onQueryChange,
  selectedOption,
  suggestions,
  isOpen,
  onOpen,
  onClose,
  onSelect,
  disabled,
}: SearchFieldProps) {
  return (
    <label className="formField formField--search">
      <span>{label}</span>
      <div className="searchFieldShell">
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={onOpen}
          onBlur={() => {
            window.setTimeout(onClose, 120)
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {selectedOption ? <span className={`searchSelectionBadge searchSelectionBadge--${selectedOption.type}`}>{selectedOption.type}</span> : null}
        {isOpen && !disabled ? (
          <div className="searchDropdown" role="listbox" aria-label={`${label} suggestions`}>
            {suggestions.length > 0 ? (
              suggestions.map((option) => (
                <button
                  key={`${option.type}-${option.id}`}
                  type="button"
                  className="searchOption"
                  onMouseDown={() => onSelect(option)}
                >
                  <span className="searchOptionPrimary">{option.label}</span>
                  <span className="searchOptionMeta">
                    <span className={`searchSelectionBadge searchSelectionBadge--${option.type}`}>{option.type}</span>
                    <span>{option.meta}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="searchDropdownEmpty">No matching actors or movies.</div>
            )}
          </div>
        ) : null}
      </div>
    </label>
  )
}

function formatMovieMeta(movie: Movie) {
  return movie.releaseDate ? movie.releaseDate.slice(0, 4) : "Release date unavailable"
}

function resolveOptionFromQuery(query: string, options: SearchOption[]) {
  const normalized = normalizeQuery(query)

  if (!normalized) {
    return null
  }

  return options.find((option) => normalizeQuery(option.label) === normalized) ?? null
}

function isSameOption(left: SearchOption, right: SearchOption) {
  return left.type === right.type && left.id === right.id
}

function FindPathPage() {
  const { mode } = useDataSourceMode()
  const { snapshot, indexes: snapshotIndexes, isLoading: isSnapshotLoading } = useSnapshotData()
  const [actors, setActors] = useState<Actor[]>([])
  const [movies, setMovies] = useState<Movie[]>([])
  const [pathIndexes, setPathIndexes] = useState<SnapshotIndexes | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [startQuery, setStartQuery] = useState("")
  const [endQuery, setEndQuery] = useState("")
  const [selectedStartOption, setSelectedStartOption] = useState<SearchOption | null>(null)
  const [selectedEndOption, setSelectedEndOption] = useState<SearchOption | null>(null)
  const [isStartOpen, setIsStartOpen] = useState(false)
  const [isEndOpen, setIsEndOpen] = useState(false)
  const [result, setResult] = useState<PathResult | null>(null)
  const [pathError, setPathError] = useState<string | null>(null)
  const [isFindingPath, setIsFindingPath] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadCatalog = async () => {
      if (isOnlineSnapshotMode(mode) && !snapshot && isSnapshotLoading) {
        setIsLoading(true)
        return
      }

      setIsLoading(true)
      setLoadError(null)

      try {
        const catalog = await resolveCatalogSource({ mode, snapshot, indexes: snapshotIndexes })

        if (!isMounted) {
          return
        }

        setActors(catalog.actors)
        setMovies(catalog.movies)
        setPathIndexes(catalog.indexes)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setLoadError(error instanceof Error ? error.message : "Failed to load actor data.")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCatalog()

    return () => {
      isMounted = false
    }
  }, [isSnapshotLoading, mode, snapshot, snapshotIndexes])

  const searchOptions = useMemo(
    () => [
      ...actors.map((actor) => ({
        id: actor.id,
        label: actor.name,
        type: "actor" as const,
        meta: actor.popularity !== null ? `Popularity ${actor.popularity}` : "Actor",
      })),
      ...movies.map((movie) => ({
        id: movie.id,
        label: movie.title,
        type: "movie" as const,
        meta: formatMovieMeta(movie),
      })),
    ].sort((left, right) => left.label.localeCompare(right.label)),
    [actors, movies],
  )

  const startSuggestions = useMemo(() => {
    const normalized = normalizeQuery(startQuery)
    return searchOptions.filter((option) => {
      if (!normalized) {
        return true
      }

      return normalizeQuery(option.label).includes(normalized)
    })
  }, [searchOptions, startQuery])

  const endSuggestions = useMemo(() => {
    const normalized = normalizeQuery(endQuery)
    return searchOptions.filter((option) => {
      if (!normalized) {
        return true
      }

      return normalizeQuery(option.label).includes(normalized)
    })
  }, [endQuery, searchOptions])

  const handleStartQueryChange = (value: string) => {
    setStartQuery(value)
    setIsStartOpen(true)
    setPathError(null)
    setResult(null)

    if (!selectedStartOption || value !== selectedStartOption.label) {
      setSelectedStartOption(null)
    }
  }

  const handleEndQueryChange = (value: string) => {
    setEndQuery(value)
    setIsEndOpen(true)
    setPathError(null)
    setResult(null)

    if (!selectedEndOption || value !== selectedEndOption.label) {
      setSelectedEndOption(null)
    }
  }

  const handleSelectStart = (option: SearchOption) => {
    setSelectedStartOption(option)
    setStartQuery(option.label)
    setIsStartOpen(false)
    setPathError(null)
    setResult(null)
  }

  const handleSelectEnd = (option: SearchOption) => {
    setSelectedEndOption(option)
    setEndQuery(option.label)
    setIsEndOpen(false)
    setPathError(null)
    setResult(null)
  }

  const handleFindPath = async () => {
    setPathError(null)
    setResult(null)

    const normalizedStart = startQuery.trim()
    const normalizedEnd = endQuery.trim()

    if (!normalizedStart || !normalizedEnd) {
      setPathError("Choose any two actors or movies before generating a path.")
      return
    }

    const startOption = selectedStartOption ?? resolveOptionFromQuery(normalizedStart, searchOptions)
    const endOption = selectedEndOption ?? resolveOptionFromQuery(normalizedEnd, searchOptions)

    if (!startOption || !endOption) {
      setPathError("Pick a valid actor or movie from the available game data for both entries.")
      return
    }

    if (isSameOption(startOption, endOption)) {
      setResult({
        nodes: [{ id: startOption.id, type: startOption.type, label: startOption.label }],
        steps: 0,
        reason: null,
      })
      return
    }

    setIsFindingPath(true)

    try {
      if (pathIndexes) {
        const startNode = findNodeByLabel(startOption.label, startOption.type, pathIndexes)
        const endNode = findNodeByLabel(endOption.label, endOption.type, pathIndexes)

        if (!startNode || !endNode) {
          setPathError("One or both entries could not be resolved in the current local dataset.")
          return
        }

        const generated = generateLocalPath(startNode, endNode, pathIndexes)
        setResult({
          nodes: generated.nodes,
          steps: generated.steps,
          reason: generated.reason,
        })
        return
      }

      const generated = await generatePath(
        { type: startOption.type, value: startOption.label },
        { type: endOption.type, value: endOption.label },
      )

      setResult({
        nodes: generated.nodes,
        steps: generated.steps,
        reason: generated.reason,
      })
    } catch (error) {
      setPathError(error instanceof Error ? error.message : "The path could not be generated.")
    } finally {
      setIsFindingPath(false)
    }
  }

  return (
    <div className="utilityPage">
      <PageBackButton to="/" label="Back" />
      <div className="utilityPanel utilityPanel--wide">
        <div className="pageEyebrow">Find Path</div>
        <h1>Let the system solve it</h1>
        <p className="pageLead">Choose any two actors or movies from the currently available game data and Co-Stars will generate the shortest path it can find between them.</p>

        {isLoading ? <div className="pageStatus">Loading actor and movie data…</div> : null}
        {loadError ? <div className="pageStatus pageStatus--error">{loadError}</div> : null}

        <div className="findPathControls">
          <SearchField
            label="Start node"
            placeholder="Type an actor or movie"
            query={startQuery}
            onQueryChange={handleStartQueryChange}
            selectedOption={selectedStartOption}
            suggestions={startSuggestions}
            isOpen={isStartOpen}
            onOpen={() => setIsStartOpen(true)}
            onClose={() => setIsStartOpen(false)}
            onSelect={handleSelectStart}
            disabled={isLoading || searchOptions.length === 0}
          />
          <SearchField
            label="End node"
            placeholder="Type an actor or movie"
            query={endQuery}
            onQueryChange={handleEndQueryChange}
            selectedOption={selectedEndOption}
            suggestions={endSuggestions}
            isOpen={isEndOpen}
            onOpen={() => setIsEndOpen(true)}
            onClose={() => setIsEndOpen(false)}
            onSelect={handleSelectEnd}
            disabled={isLoading || searchOptions.length === 0}
          />
          <div className="findPathActionRow">
            <button type="button" onClick={() => void handleFindPath()} disabled={isLoading || searchOptions.length === 0 || isFindingPath}>
              {isFindingPath ? "Finding Path…" : "Find Path"}
            </button>
          </div>
        </div>

        <div className="placeholderPanel">
          <h2>Generated Route</h2>
          {pathError ? <div className="pageStatus pageStatus--error">{pathError}</div> : null}
          {!result && !pathError ? <p className="placeholderCopy">Pick two actors or movies, then generate a path to preview the route here.</p> : null}
          {result ? (
            <>
              <p className="placeholderCopy">
                {result.reason ? result.reason : `Resolved in ${result.steps} step${result.steps === 1 ? "" : "s"}.`}
              </p>
              <div className="pathResultList">
                {result.nodes.map((node, index) => (
                  <div key={`${node.type}-${node.id}-${index}`} className={`pathNode pathNode--${node.type}`}>
                    <span>{node.label}</span>
                    {index < result.nodes.length - 1 ? <span className="pathNodeArrow">→</span> : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <Link to="/" className="pageBackLink">Back to Home</Link>
      </div>
    </div>
  )
}

export default FindPathPage