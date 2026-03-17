import { createContext, useContext } from "react";
import type { FrontendManifest, FrontendSnapshot, HealthCheckResponse, SnapshotBundle, SnapshotIndexes } from "../types";

export type SnapshotDataContextValue = {
	snapshot: FrontendSnapshot | null;
	manifest: FrontendManifest | null;
	indexes: SnapshotIndexes | null;
	health: HealthCheckResponse | null;
	isLoading: boolean;
	errorMessage: string | null;
	errorSource: "api" | "s3" | null;
	loadedFrom: SnapshotBundle["loadedFrom"] | null;
	lastRefreshAt: string | null;
	waitTimeoutRemainingMs: number | null;
	recommendedRefreshMs: number;
	fetchSnapshotFromApi: () => Promise<SnapshotBundle | null>;
	fetchSnapshotFromS3: () => Promise<SnapshotBundle | null>;
	clearSnapshotCache: () => void;
};

export const SnapshotDataContext = createContext<SnapshotDataContextValue | null>(null);

export function useSnapshotData() {
	const context = useContext(SnapshotDataContext);

	if (!context) {
		throw new Error("useSnapshotData must be used within SnapshotDataProvider.");
	}

	return context;
}