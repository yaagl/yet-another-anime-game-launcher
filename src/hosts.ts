import { exec, readAllLines, rawString } from "./utils";

export async function ensureHosts(hosts: [string, string][]) {
  const content = await readAllLines("/etc/hosts");
  let start = 0;
  while (start < content.length && content[start] != "# Added by Yaagl") {
    start++;
  }
  let end = start;
  while (end < content.length && content[end] != "# End of section") {
    end++;
  }
  const newContentPre = content.filter((_, index) => {
    return index < start;
  });
  const newContentPost = content.filter((_, index) => {
    return index > end;
  });
  const newContent = [
    ...newContentPre,
    "# Added by Yaagl",
    "# Warning: any content in this section will be overwritten",
    ...hosts.map(([domain, ip]) => `${ip} ${domain}`),
    "# End of section",
    ...(newContentPost.length ? newContentPost : [""]),
  ];
  const contentsss = newContent.join("\n");
  await exec(["printf", contentsss, rawString(">"), "/etc/hosts"], {}, true);
}
