import { useEffect, useState } from "react";

export function useBrowserOnlineStatus() {
	const [isOnline, setIsOnline] = useState(() => typeof window === "undefined" ? true : window.navigator.onLine);

	useEffect(() => {
		if (typeof window === "undefined") {
			return undefined;
		}

		const handleOnlineStateChange = () => {
			setIsOnline(window.navigator.onLine);
		};

		window.addEventListener("online", handleOnlineStateChange);
		window.addEventListener("offline", handleOnlineStateChange);

		return () => {
			window.removeEventListener("online", handleOnlineStateChange);
			window.removeEventListener("offline", handleOnlineStateChange);
		};
	}, []);

	return isOnline;
}