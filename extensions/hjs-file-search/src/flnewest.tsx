import { LaunchProps } from "@raycast/api";
import { SearchList } from "./components/SearchList";

export default function Command(props: LaunchProps<{ arguments: { query?: string } }>) {
  return <SearchList profile="flnewest" initialQuery={props.arguments?.query || ""} />;
}
