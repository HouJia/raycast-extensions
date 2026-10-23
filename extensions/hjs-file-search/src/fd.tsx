import { LaunchProps } from "@raycast/api";
import { SearchList } from "./components/SearchList";

export default function Command(props: LaunchProps<{ arguments: { query?: string } }>) {
  return <SearchList profile="fd" initialQuery={props.arguments?.query || ""} />;
}
