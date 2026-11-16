import { useEffect } from "react";
import { useSearch } from "wouter";
export function useFocusedRecord(ready: boolean) {
  const search = useSearch(); const item = new URLSearchParams(search).get("item");
  useEffect(() => { if (ready && item) document.getElementById(`work-${item}`)?.scrollIntoView({ block: "center" }); }, [item, ready]);
  return item;
}
