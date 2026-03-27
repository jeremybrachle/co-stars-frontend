import { createContext, useContext } from "react";
import type { FrontendManifest, FrontendSnapshot, SnapshotBundle, SnapshotIndexes, SnapshotUpdateCheck, StoredSnapshotSource } from "../types";

export type SnapshotErrorSource = "installed" | "api" | "s3";

export type SnapshotDataContextValue = {
	snapshot: FrontendSnapshot | null;
	manifest: FrontendManifest | null;
	indexes: SnapshotIndexes | null;
	isLoading: boolean;
	isCheckingForS3Update: boolean;
	errorMessage: string | null;
	errorSource: SnapshotErrorSource | null;
	loadedFrom: SnapshotBundle["loadedFrom"] | null;
	lastRefreshAt: string | null;
	installedBundle: SnapshotBundle | null;
	s3Bundle: SnapshotBundle | null;
	apiBundle: SnapshotBundle | null;
	s3UpdateCheck: SnapshotUpdateCheck;
	fetchSnapshotFromApi: () => Promise<SnapshotBundle | null>;
	fetchSnapshotFromS3: () => Promise<SnapshotBundle | null>;
	checkForS3SnapshotUpdate: () => Promise<SnapshotUpdateCheck>;
	clearSnapshotCache: (source: StoredSnapshotSource) => void;
};

export const SnapshotDataContext = createContext<SnapshotDataContextValue | null>(null);

export function useSnapshotData() {
	const context = useContext(SnapshotDataContext);

	if (!context) {
		throw new Error("useSnapshotData must be used within SnapshotDataProvider.");
	}

	return context;
}