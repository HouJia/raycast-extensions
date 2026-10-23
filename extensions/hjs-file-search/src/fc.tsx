import { LaunchProps } from "@raycast/api";
import { SearchList } from "./components/SearchList";

export default function Command(props: LaunchProps<{ arguments: { query?: string } }>) {
  return <SearchList profile="fc" initialQuery={props.arguments?.query || ""} />;
}
