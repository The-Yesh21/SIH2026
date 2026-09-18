import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLiveTrainFeed, type LiveTrainFeedData } from "./liveFeedServer";

export function useLiveTrainFeed(trainNumber: string = "16215", customApiKey?: string) {
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("railrakshak_rapidapi_key") || "";
    }
    return "";
  });

  const activeKey = customApiKey || userApiKey;

  const query = useQuery({
    queryKey: ["liveTrainFeed", trainNumber, activeKey],
    queryFn: async () => {
      const result = await fetchLiveTrainFeed({
        data: {
          trainNumber,
          rapidApiKey: activeKey || undefined,
        },
      });
      return result;
    },
    refetchInterval: 30000, // 30-second RTIS satellite polling
    refetchOnWindowFocus: true,
    staleTime: 15000,
  });

  const saveApiKey = (key: string) => {
    setUserApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("railrakshak_rapidapi_key", key);
    }
  };

  return {
    ...query,
    liveFeed: query.data,
    userApiKey,
    saveApiKey,
  };
}
