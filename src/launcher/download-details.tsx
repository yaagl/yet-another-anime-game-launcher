import {
  ModalBody,
  ModalContent,
  ModalHeader,
  useColorMode,
} from "@hope-ui/solid";
import {
  createMemo,
  createSignal,
  For,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { SophonMetric } from "@sophon-rpc";
import type { Locale } from "@locale";
import {
  activityMetric,
  activityMetrics,
  ActivitySample,
  SophonActivity,
} from "../sophon/activity";
import { humanFileSize } from "../utils/helper";
import "./download-details.css";

function amount(value: number | undefined, unit = "bytes") {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return unit === "bytes"
    ? humanFileSize(Math.round(value * 10) / 10)
    : `${value.toLocaleString(undefined, {
        maximumFractionDigits: 1,
      })} ${unit}`.trim();
}

function duration(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return "—";
  const seconds = Math.max(0, Math.floor(value));
  return seconds >= 3600
    ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds / 60) % 60}m`
    : seconds >= 60
    ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    : `${seconds}s`;
}

function rate(value: number | undefined, unit = "bytes") {
  return value === undefined ? "—" : `${amount(value, unit)}/s`;
}

function Meter(props: { label: string; percentage?: number }) {
  return (
    <div
      class="activity-meter"
      role="progressbar"
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={props.percentage}
    >
      <span
        style={{
          width: `${Math.max(0, Math.min(100, props.percentage ?? 0))}%`,
        }}
      />
    </div>
  );
}

function Fields(props: { values: [string, string][] }) {
  return (
    <dl class="activity-fields">
      <For each={props.values}>
        {([label, value]) => (
          <div>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        )}
      </For>
    </dl>
  );
}

function Section(props: {
  title: string;
  info?: string;
  children: JSX.Element;
}) {
  const [opened, setOpened] = createSignal(false);
  return (
    <details
      class="activity-details"
      onToggle={event => setOpened(event.currentTarget.open)}
    >
      <summary>
        <span>{props.title}</span>
        <span class="activity-sub">{props.info}</span>
      </summary>
      <Show when={opened()}>
        <div class="activity-details-body">{props.children}</div>
      </Show>
    </details>
  );
}

function MetricRow(props: {
  label: string;
  unit: string;
  metric: SophonMetric | undefined;
}) {
  const exact = (value: number | undefined) =>
    value === undefined
      ? "—"
      : props.unit === "bytes"
      ? `${amount(value)} (${value.toLocaleString()} B)`
      : amount(value, props.unit);
  return (
    <Show when={props.metric}>
      <Section
        title={props.label}
        info={
          amount(props.metric?.completed, props.unit) +
          (props.metric?.total === undefined
            ? ""
            : ` / ${amount(props.metric?.total, props.unit)}`)
        }
      >
        <Meter label={props.label} percentage={props.metric?.percentage} />
        <Fields
          values={[
            ["Completed", exact(props.metric?.completed)],
            ["Total", exact(props.metric?.total)],
            ["Remaining", exact(props.metric?.remaining)],
            [
              "Percentage",
              props.metric?.percentage === undefined
                ? "—"
                : `${props.metric?.percentage?.toFixed(1)}%`,
            ],
            ["Recent rate", rate(props.metric?.rate, props.unit)],
            ["Average rate", rate(props.metric?.averageRate, props.unit)],
            ["Elapsed", duration(props.metric?.elapsedSeconds)],
            ["ETA", duration(props.metric?.etaSeconds)],
            ["Tracking finished", props.metric?.isFinished ? "Yes" : "No"],
          ]}
        />
      </Section>
    </Show>
  );
}

type Hover = { series: string; fraction: number } | undefined;

function Graph(props: {
  series: string;
  label: string;
  history: ActivitySample[];
  unit?: string;
  limit?: number;
  color?: string;
  occupancy?: boolean;
  hover: Hover;
  onHover: (value: Hover) => void;
}) {
  let element!: SVGSVGElement;
  const [width, setWidth] = createSignal(300);
  onMount(() => {
    const observer = new ResizeObserver(entries =>
      setWidth(entries[0].contentRect.width)
    );
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  });
  const end = () => props.history[props.history.length - 1]?.time ?? 0;
  const points = createMemo(() =>
    props.history.map(sample => ({
      time: sample.time,
      value: sample.values[props.series],
    }))
  );
  let lastScaleChange = 0;
  const ceiling = createMemo<number>((previous = 1) => {
    if (props.limit !== undefined && props.limit > 0) return props.limit;
    const maximum =
      Math.max(1, ...points().map(point => point.value ?? 0)) * 1.1;
    const divisor =
      props.unit === "bytes"
        ? 1024 **
          Math.min(
            4,
            Math.max(0, Math.floor(Math.log(maximum) / Math.log(1024)))
          )
        : 1;
    const magnitude = 10 ** Math.floor(Math.log10(maximum / divisor));
    const next =
      [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
        .map(step => step * magnitude * divisor)
        .find(step => step >= maximum) ?? maximum;
    if (next >= previous) {
      lastScaleChange = end();
      return next;
    }
    if (next < previous * 0.75 && end() - lastScaleChange >= 5) {
      lastScaleChange = end();
      return Math.max(next, previous / 2);
    }
    return previous;
  });
  const exponent = () =>
    props.unit === "bytes"
      ? Math.min(
          4,
          Math.max(0, Math.floor(Math.log(ceiling()) / Math.log(1024)))
        )
      : 0;
  const axisUnit = () =>
    (props.unit === "bytes"
      ? ["B", "KiB", "MiB", "GiB", "TiB"][exponent()]
      : props.unit) + (props.occupancy ? "" : "/s");
  const left = 48,
    top = 19,
    bottom = 122;
  const right = () => Math.max(left + 1, width() - 8);
  const x = (time: number) =>
    left + ((time - end() + 60) / 60) * (right() - left);
  const y = (value: number) =>
    bottom - Math.min(1, Math.max(0, value / ceiling())) * (bottom - top);
  const paths = createMemo(() => {
    const segments: { time: number; value: number }[][] = [];
    let segment: { time: number; value: number }[] = [];
    for (const point of points()) {
      if (
        point.value === undefined ||
        (segment.length && point.time - segment[segment.length - 1].time > 2.5)
      ) {
        if (segment.length) segments.push(segment);
        segment = [];
      }
      if (point.value !== undefined)
        segment.push({ time: point.time, value: point.value });
    }
    if (segment.length) segments.push(segment);
    const lines = segments.map(group =>
      group
        .map(
          (point, i) =>
            `${i ? "L" : "M"}${x(point.time).toFixed(1)},${y(
              point.value
            ).toFixed(1)}`
        )
        .join(" ")
    );
    return {
      line: lines.join(" "),
      area: lines
        .map(
          (line, i) =>
            `${line} L${x(
              segments[i][segments[i].length - 1].time
            )},${bottom} L${x(segments[i][0].time)},${bottom} Z`
        )
        .join(" "),
    };
  });
  const selected = createMemo(() => {
    const hover = props.hover;
    if (!hover) return undefined;
    const time = end() - 60 + hover.fraction * 60;
    return points().find(point => Math.abs(point.time - time) <= 0.6);
  });
  return (
    <svg
      ref={element}
      class="activity-chart"
      viewBox={`0 0 ${width()} 150`}
      role="img"
      aria-label={`${props.label}, last 60 seconds`}
      onPointerMove={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        props.onHover({
          series: props.series,
          fraction: Math.max(
            0,
            Math.min(1, (event.clientX - bounds.left - left) / (right() - left))
          ),
        });
      }}
      onPointerLeave={() => props.onHover(undefined)}
    >
      <text x="0" y="11">
        {axisUnit()}
      </text>
      <For each={[0, 0.5, 1]}>
        {fraction => (
          <>
            <line
              class="activity-grid"
              x1={left}
              x2={right()}
              y1={y(fraction * ceiling())}
              y2={y(fraction * ceiling())}
            />
            <text
              x={left - 8}
              y={y(fraction * ceiling()) + 4}
              text-anchor="end"
            >
              {((fraction * ceiling()) / 1024 ** exponent()).toLocaleString(
                undefined,
                { maximumFractionDigits: 1 }
              )}
            </text>
          </>
        )}
      </For>
      <path
        class="activity-chart-area"
        fill={props.color ?? "var(--activity-muted)"}
        d={paths().area}
      />
      <path
        class="activity-series"
        stroke={props.color ?? "var(--activity-muted)"}
        d={paths().line}
      />
      <text x={left} y="144">
        −60s
      </text>
      <text x={(left + right()) / 2} y="144" text-anchor="middle">
        −30s
      </text>
      <text x={right()} y="144" text-anchor="end">
        Now
      </text>
      <Show when={props.hover}>
        <line
          class="activity-guide"
          x1={left + (props.hover?.fraction ?? 0) * (right() - left)}
          x2={left + (props.hover?.fraction ?? 0) * (right() - left)}
          y1={top}
          y2={bottom}
        />
        <Show when={props.hover?.series === props.series}>
          <text x={right()} y="11" text-anchor="end">
            {Math.round((1 - (props.hover?.fraction ?? 1)) * 60)}s ·{" "}
            {props.occupancy
              ? amount(selected()?.value, props.unit)
              : rate(selected()?.value, props.unit)}
          </text>
        </Show>
      </Show>
    </svg>
  );
}

export function DownloadDetails(props: {
  locale: Locale;
  activity: SophonActivity;
  history: ActivitySample[];
  cancelling: boolean;
  onClose: () => void;
  onCancel: () => void;
}) {
  const { colorMode } = useColorMode();
  const [hover, setHover] = createSignal<Hover>();
  const progress = () => props.activity.progress;
  const metrics = () => progress()?.metrics;
  const common = () => metrics()?.common;
  const resources = () => common()?.resources;
  const metric = (key: string) => activityMetric(progress(), key);
  const hasRepair = () =>
    progress()?.phase === "repairing" ||
    metric("repair.download")?.total !== undefined;
  const download = () =>
    metric(
      props.activity.kind === "install"
        ? "download"
        : hasRepair()
        ? "repair.download"
        : "patch.data"
    );
  const active = () =>
    props.activity.status === "starting" || props.activity.status === "running";
  const game = () =>
    ({
      hk4e: "Genshin Impact",
      hkrpg: "Honkai: Star Rail",
      nap: "Zenless Zone Zero",
    }[props.activity.game.split("_")[0]] ?? props.activity.game);
  const phaseName = (phase: string) =>
    ({
      metadata: "Loading metadata",
      scanning: "Verifying files",
      trimming: "Allocating files",
      caching: "Downloading patch data",
      running: props.activity.kind === "install" ? "Installing" : "Updating",
      repairing: "Repairing files",
      deleting: "Removing old files",
    }[phase] ?? phase);
  const heading = () =>
    props.cancelling && active()
      ? props.locale.get("PAUSING")
      : !active()
      ? {
          starting: "Starting…",
          running: "Running",
          completed: "Completed",
          failed: "Failed",
          cancelled: props.locale.get("PAUSED"),
        }[props.activity.status]
      : progress()
      ? phaseName(progress()?.phase ?? "metadata")
      : "Starting…";
  const outcome = () => progress()?.outcome;
  const failure = () => {
    const value = outcome();
    return (
      props.activity.error ??
      (value && "failed" in value ? value.failed.reason : undefined)
    );
  };
  const versionPair = () => {
    const value = progress();
    const source =
      (value && "sourceVersion" in value ? value.sourceVersion : undefined) ??
      props.activity.sourceVersion;
    const target =
      (value && "targetVersion" in value ? value.targetVersion : undefined) ??
      props.activity.targetVersion;
    return [source, target];
  };
  const versions = () => versionPair().filter(Boolean).join(" → ");

  function Trend(card: {
    label: string;
    series: string;
    value?: number;
    total?: number;
    average?: number;
    unit?: string;
    color?: string;
  }) {
    const formatted = () => amount(card.value, card.unit ?? "bytes").split(" ");
    return (
      <section class="activity-panel">
        <h3 class="activity-legend">
          <span
            class="activity-dot"
            style={{ background: card.color ?? "var(--activity-muted)" }}
          />
          {card.label}
        </h3>
        <div class="activity-big">
          {formatted()[0]}
          <span class="activity-unit">
            {card.value === undefined
              ? ""
              : `${formatted().slice(1).join(" ")}/s`}
          </span>
        </div>
        <Graph
          series={card.series}
          label={card.label}
          history={props.history}
          unit={card.unit ?? "bytes"}
          color={card.color}
          hover={hover()}
          onHover={setHover}
        />
        <div class="activity-pair activity-sub">
          <span>{amount(card.total, card.unit ?? "bytes")}</span>
          <span>Average {rate(card.average, card.unit ?? "bytes")}</span>
        </div>
      </section>
    );
  }

  function MetricTrend(card: {
    path: string;
    label?: string;
    unit?: string;
    color?: string;
  }) {
    const definition = activityMetrics.find(([key]) => key === card.path);
    return (
      <Trend
        label={card.label ?? definition?.[1] ?? card.path}
        series={card.path}
        value={metric(card.path)?.rate}
        total={metric(card.path)?.completed}
        average={metric(card.path)?.averageRate}
        unit={card.unit ?? definition?.[2]}
        color={card.color}
      />
    );
  }

  function IO(card: { title: string; path: string }) {
    return (
      <>
        <div class="activity-section-head">
          <h3>{card.title}</h3>
        </div>
        <div class="activity-two">
          <MetricTrend
            path={`${card.path}.read`}
            color="var(--activity-read)"
          />
          <MetricTrend
            path={`${card.path}.write`}
            color="var(--activity-write)"
          />
        </div>
      </>
    );
  }

  function Budget(card: {
    label: string;
    series: string;
    value?: number;
    limit?: number;
  }) {
    return (
      <section class="activity-panel">
        <div class="activity-pair">
          <h3>{card.label}</h3>
          <span>
            {amount(card.value)}
            {card.limit === undefined ? "" : ` / ${amount(card.limit)}`}
          </span>
        </div>
        <div class="activity-budget-meter">
          <Show when={card.limit !== undefined}>
            <Meter
              label={card.label}
              percentage={
                card.limit && card.value !== undefined
                  ? (card.value / card.limit) * 100
                  : undefined
              }
            />
          </Show>
        </div>
        <Graph
          series={card.series}
          label={card.label}
          history={props.history}
          unit="bytes"
          limit={card.limit}
          occupancy
          hover={hover()}
          onHover={setHover}
        />
      </section>
    );
  }

  function disk(
    direction: "read" | "write",
    field: "rate" | "completed" | "averageRate"
  ) {
    if (direction === "read") return common()?.read[field];
    const devices = resources()?.devices;
    if (
      !devices?.length ||
      devices.some(device => device[direction][field] === undefined)
    )
      return undefined;
    return devices.reduce(
      (sum, device) => sum + (device[direction][field] ?? 0),
      0
    );
  }

  const counters = (): [string, string][] => {
    const value = metrics();
    if (!value) return [];
    return "verification" in value
      ? [
          ["Missing files", amount(value.verification.missingFiles, "")],
          ["Broken files", amount(value.verification.brokenFiles, "")],
          ["Downloaded chunks", amount(value.downloadedChunks, "")],
          ["Processed bytes", amount(value.processing.bytes)],
          ["Retry attempts", amount(value.retries, "")],
        ]
      : [
          ["Patch retained", amount(value.patch.retainedBytes)],
          ["Patch verified", amount(value.patch.verifiedBytes)],
          ["Bundles ready", amount(value.patch.bundlesReady, "")],
          ["Repair files", amount(value.repair.files, "")],
          ["Skipped files", amount(value.skippedFiles, "")],
          ["Cached files", amount(value.cachedFiles, "")],
        ];
  };
  const phaseTimes = () => {
    const value = progress();
    if (!value) return [];
    const timing = value.metrics.common.timing;
    const times = { ...timing.phaseDurations };
    if (!value.outcome)
      times[value.phase] =
        (times[value.phase] ?? 0) + timing.stageElapsedSeconds;
    return Object.entries(times);
  };

  return (
    <ModalContent
      class="download-details"
      data-theme={colorMode()}
      height="100vh"
      maxHeight="100vh"
      borderRadius={0}
      margin={0}
      style={{
        background: "var(--activity-bg)",
        color: "var(--activity-text)",
      }}
    >
      <ModalHeader class="activity-chrome">
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Back to launcher"
        >
          ←
        </button>
        <strong>Download activity</strong>
        <span class="activity-window">60s</span>
        <Show when={active()}>
          <button
            type="button"
            disabled={props.cancelling}
            onClick={props.onCancel}
          >
            {props.locale.get(props.cancelling ? "PAUSING" : "PAUSE")}
          </button>
        </Show>
      </ModalHeader>
      <ModalBody padding={0}>
        <div class="activity-main">
          <div class="activity-heading">
            <div>
              <div class="activity-eyebrow">
                {game()} ·{" "}
                {props.activity.predownload
                  ? "Predownload"
                  : props.activity.kind === "install"
                  ? "Install"
                  : "Update"}
              </div>
              <h2 aria-live="polite">{heading()}</h2>
              <p class="activity-sub">{versions()}</p>
            </div>
            <div class="activity-top-times">
              <div>
                <p class="activity-sub">Elapsed</p>
                <div class="activity-time">
                  {duration(common()?.timing.elapsedSeconds)}
                </div>
              </div>
              <div>
                <p class="activity-sub">Estimated remaining</p>
                <div class="activity-time">
                  {active() ? duration(common()?.timing.etaSeconds) : "—"}
                </div>
              </div>
            </div>
          </div>
          <Show when={failure()}>
            <p class="activity-error" role="alert">
              {failure()}
            </p>
          </Show>
          <div class="activity-top-grid">
            <MetricTrend
              path="common.network"
              color="var(--activity-network)"
            />
            <section class="activity-panel">
              <h3>
                {props.activity.kind === "install"
                  ? "Installation payload"
                  : hasRepair()
                  ? "Repair payload"
                  : "Patch payload"}
              </h3>
              <div class="activity-big">
                {amount(download()?.completed)}
                <span class="activity-unit">
                  {download()?.total === undefined
                    ? ""
                    : ` / ${amount(download()?.total)}`}
                </span>
              </div>
              <Meter
                label="Payload received"
                percentage={download()?.percentage}
              />
              <div class="activity-pair">
                <span>
                  {download()?.percentage === undefined
                    ? "—"
                    : `${download()?.percentage?.toFixed(1)}%`}{" "}
                  received
                </span>
                <span class="activity-sub">
                  {amount(download()?.remaining)} remaining
                </span>
              </div>
              <div class="activity-payload-info">
                <Show when={props.activity.kind === "update" && !hasRepair()}>
                  <div class="activity-pair activity-sub">
                    <span>Retained</span>
                    <span>
                      {counters().find(
                        ([label]) => label === "Patch retained"
                      )?.[1] ?? "—"}
                    </span>
                  </div>
                </Show>
                <Show when={hasRepair()}>
                  <div class="activity-pair activity-sub">
                    <span>Repair output</span>
                    <span>
                      {amount(metric("repair.write")?.completed)}
                      {metric("repair.write")?.total === undefined
                        ? ""
                        : ` / ${amount(metric("repair.write")?.total)}`}
                    </span>
                  </div>
                  <Meter
                    label="Repair output"
                    percentage={metric("repair.write")?.percentage}
                  />
                </Show>
                <div class="activity-pair activity-sub">
                  <span>
                    {props.activity.kind === "install"
                      ? "Installation output"
                      : "Verified output"}
                  </span>
                  <span>{amount(common()?.write.completed)}</span>
                </div>
                <div class="activity-pair activity-sub">
                  <span>Files complete</span>
                  <span>
                    {amount(common()?.files.completed, "")}
                    {common()?.files.total === undefined
                      ? ""
                      : ` / ${amount(common()?.files.total, "")}`}
                  </span>
                </div>
              </div>
            </section>
          </div>
          <div class="activity-section-head">
            <h3>Disk activity</h3>
          </div>
          <div class="activity-two">
            <For each={["read", "write"] as const}>
              {direction => (
                <Trend
                  label={direction === "read" ? "Disk reads" : "Disk writes"}
                  series={direction === "read" ? "common.read" : "disk.write"}
                  value={disk(direction, "rate")}
                  total={disk(direction, "completed")}
                  average={disk(direction, "averageRate")}
                  color={`var(--activity-${direction})`}
                />
              )}
            </For>
          </div>
          <IO title="Game files" path="common.resources.target" />
          <Show when={hasRepair()}>
            <div class="activity-section-head">
              <h3>File repairs</h3>
            </div>
            <div class="activity-two">
              <MetricTrend
                path="repair.download"
                color="var(--activity-network)"
              />
              <MetricTrend path="repair.write" color="var(--activity-write)" />
            </div>
          </Show>
          <div class="activity-section-head">
            <h3>
              {props.activity.kind === "install"
                ? "File processing"
                : "File completion"}
            </h3>
          </div>
          <div class="activity-two">
            <MetricTrend
              path="common.write"
              label={
                props.activity.kind === "install"
                  ? "Installation output"
                  : "Verified output"
              }
              color="var(--activity-write)"
            />
            <MetricTrend path="common.files" />
          </div>
          <IO title="Memory cache" path="common.resources.memoryCache" />
          <IO title="Disk cache" path="common.resources.diskCache" />
          <div class="activity-section-head">
            <h3>Cache usage</h3>
          </div>
          <div class="activity-three">
            <Budget
              label="Memory buffers"
              series="memory"
              value={resources()?.memoryBytes}
              limit={resources()?.memoryLimit}
            />
            <Budget
              label="Disk cache reserved"
              series="reserved"
              value={resources()?.diskReservedBytes}
              limit={resources()?.diskLimit}
            />
            <Budget
              label="Disk cache stored"
              series="stored"
              value={resources()?.devices.reduce(
                (sum, device) => sum + device.cacheBytes,
                0
              )}
            />
          </div>
          <Section title="Stage metrics">
            <For each={activityMetrics}>
              {([key, label, unit]) => (
                <MetricRow label={label} unit={unit} metric={metric(key)} />
              )}
            </For>
            <Fields values={counters()} />
          </Section>
          <Section
            title="Storage volumes"
            info={resources() ? `${resources()?.devices.length} volumes` : "—"}
          >
            <For each={resources()?.devices.map(device => device.id)}>
              {id => {
                const device = () =>
                  resources()?.devices.find(value => value.id === id);
                return (
                  <div class="activity-volume">
                    <Fields
                      values={[
                        ["Location", device()?.location ?? "—"],
                        ["Volume ID", id],
                        ["Roles", device()?.roles.join(", ") ?? "—"],
                        ["Cache stored", amount(device()?.cacheBytes)],
                        [
                          "Cache reserved",
                          amount(device()?.reservedCacheBytes),
                        ],
                      ]}
                    />
                    <div class="activity-two">
                      <For each={["read", "write"] as const}>
                        {direction => (
                          <Trend
                            label={
                              direction === "read"
                                ? "Volume reads"
                                : "Volume writes"
                            }
                            series={`volume:${id}:${direction}`}
                            value={device()?.[direction].rate}
                            total={device()?.[direction].completed}
                            average={device()?.[direction].averageRate}
                            color={`var(--activity-${direction})`}
                          />
                        )}
                      </For>
                    </div>
                    <MetricRow
                      label="Volume reads"
                      unit="bytes"
                      metric={device()?.read}
                    />
                    <MetricRow
                      label="Volume writes"
                      unit="bytes"
                      metric={device()?.write}
                    />
                  </div>
                );
              }}
            </For>
          </Section>
          <Section
            title="Patch bundles"
            info={
              resources() ? `${resources()?.downloads.length} bundles` : "—"
            }
          >
            <For each={resources()?.downloads.map(bundle => bundle.id)}>
              {id => {
                const bundle = () =>
                  resources()?.downloads.find(value => value.id === id);
                return (
                  <div class="activity-bundle">
                    <h3>{bundle()?.category}</h3>
                    <code>{id}</code>
                    <Meter
                      label={id}
                      percentage={
                        bundle()?.totalBytes
                          ? ((bundle()?.receivedBytes ?? 0) /
                              (bundle()?.totalBytes ?? 1)) *
                            100
                          : undefined
                      }
                    />
                    <Fields
                      values={[
                        ["Received", amount(bundle()?.receivedBytes)],
                        ["Total", amount(bundle()?.totalBytes)],
                        ["Retained", amount(bundle()?.retainedBytes)],
                        ["New traffic", amount(bundle()?.transferredBytes)],
                      ]}
                    />
                  </div>
                );
              }}
            </For>
          </Section>
          <Section
            title="Timing & operation"
            info={duration(common()?.timing.elapsedSeconds)}
          >
            <For each={phaseTimes()}>
              {([phase, seconds]) => (
                <div class="activity-stage">
                  <span>{phaseName(phase)}</span>
                  <Meter
                    label={phaseName(phase)}
                    percentage={
                      common()?.timing.elapsedSeconds
                        ? (seconds / (common()?.timing.elapsedSeconds ?? 1)) *
                          100
                        : undefined
                    }
                  />
                  <span>{duration(seconds)}</span>
                </div>
              )}
            </For>
            <Fields
              values={[
                ["Operation ID", props.activity.operationID ?? "—"],
                ["Kind", props.activity.kind],
                [
                  "Status",
                  props.activity.status === "cancelled"
                    ? props.locale.get("PAUSED")
                    : props.activity.status,
                ],
                ["Phase", progress()?.phase ?? "—"],
                [
                  "Stage elapsed",
                  duration(common()?.timing.stageElapsedSeconds),
                ],
                [
                  "Operation elapsed",
                  duration(common()?.timing.elapsedSeconds),
                ],
                ["ETA", duration(common()?.timing.etaSeconds)],
                ["Outcome", Object.keys(outcome() ?? {})[0] ?? "—"],
                ["Error", failure() ?? "—"],
                ["Source version", versionPair()[0] ?? "—"],
                ["Target version", versionPair()[1] ?? "—"],
                ["Predownload", props.activity.predownload ? "Yes" : "No"],
              ]}
            />
          </Section>
        </div>
      </ModalBody>
    </ModalContent>
  );
}
