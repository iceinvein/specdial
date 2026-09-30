#!/usr/bin/env bash
# Runs agents over the function tasks, one fresh session per run, and writes
#   runs/<fn>__<level>__<agent>__r<rep>/{impl.ts,result.json,transcript.jsonl,stderr.txt,final_message.txt}
#
#   ./run.sh --one <fn> <level> <agent> <rep>   exactly one run
#   ./run.sh --build-image                      build the agent image, with
#                                               the host's Claude Code and
#                                               Codex versions
#   ./run.sh --setup-network                    create the runs network and
#                                               its firewall in Docker's VM
#                                               (again after a VM restart)
#   ./run.sh --check-isolation                  the checks every run makes
#                                               before its container starts
#   ./run.sh                                    every run selected by the env below
#
# Every agent runs in a fresh Docker container of the image docker/Dockerfile
# builds, as the user candidate, seeing only its run's work dir (at /work)
# and, for Codex, a scratch CODEX_HOME. Claude authenticates with the token in
# ~/.config/interview-signal/claude-oauth-token (mode 0600), made with
# `claude setup-token`; Codex with a copy of ~/.codex/auth.json.
#
# The work dir holds package.json (docker/package.json), node_modules (a link
# to the image's /opt/deps/node_modules), src/<fn>.ts (the task's stub.ts) and
# TICKET.md, plus per level: L1 src/<fn>.test.ts, L2 also SPEC.md, L3 also
# src/<fn>.properties.test.ts. A level whose visible file is missing from the
# task dir fails the run before anything starts. The file the agent leaves at
# src/<fn>.ts is copied to impl.ts; nothing else leaves the work dir.
#
# Env: FNS, LEVELS, AGENTS (space-separated filters, default every function
# under tasks/, L0 to L3, sonnet opus codex), REPS (count per cell, default
# 15), JOBS (parallel runs, default 1), BUDGET (per-run USD cap for Claude
# agents, default 1.00), WALL_S (per-run wall-clock cap in seconds, default
# 600), SCRATCH_DIR (where run roots are made, default
# ~/.cache/specdial/scratch), AGENT_MEMORY and AGENT_CPUS (container limits,
# default 4g and 2).
# A run whose result.json exists is skipped; delete it to re-run. A run in
# progress holds <run dir>.lock; one left by a crashed runner must be removed
# by hand.
set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TASKS_DIR=${TASKS_DIR:-$REPO/tasks}
RUNS_DIR=${RUNS_DIR:-$REPO/runs}
ALL_LEVELS="L0 L1 L2 L3"
ALL_AGENTS="sonnet opus codex"
IMAGE=specdial-agent
CLAUDE_TOKEN_FILE="$HOME/.config/interview-signal/claude-oauth-token"
# Colima shares only the operator's home with its VM, and a bind mount of a
# path the VM cannot see is silently an empty directory, so the default sits
# under HOME (make_run_root checks the container really sees the mount).
SCRATCH_DIR=${SCRATCH_DIR:-$HOME/.cache/specdial/scratch}
AGENT_MEMORY=${AGENT_MEMORY:-4g}
AGENT_CPUS=${AGENT_CPUS:-2}

# Builds the agent image with the CLI versions the host runs, then checks the
# image reports the same versions.
build_image() {
  local claude_host codex_host claude_version codex_version
  claude_host=$(claude --version)
  codex_host=$(codex --version)
  claude_version=$(sed -nE 's/^([0-9][0-9.]*) .*$/\1/p' <<< "$claude_host")
  codex_version=$(sed -nE 's/^codex-cli ([0-9][0-9.]*)$/\1/p' <<< "$codex_host")
  [[ -n "$claude_version" ]] || { echo "cannot read a version from claude --version: $claude_host" >&2; return 1; }
  [[ -n "$codex_version" ]] || { echo "cannot read a version from codex --version: $codex_host" >&2; return 1; }
  docker build --build-arg "CLAUDE_CODE_VERSION=$claude_version" --build-arg "CODEX_VERSION=$codex_version" \
    -t "$IMAGE" "$REPO/docker"
  local claude_image codex_image
  claude_image=$(docker run --rm --network none "$IMAGE" claude --version)
  codex_image=$(docker run --rm --network none "$IMAGE" codex --version)
  [[ "$claude_image" == "$claude_host" ]] || { echo "image has $claude_image, host has $claude_host" >&2; return 1; }
  [[ "$codex_image" == "$codex_host" ]] || { echo "image has $codex_image, host has $codex_host" >&2; return 1; }
}

require_image() {
  docker image inspect --format '{{.Id}}' "$IMAGE" > /dev/null \
    || { echo "no Docker image $IMAGE: build it with ./run.sh --build-image" >&2; return 1; }
}

# The token goes to the container as an environment variable, never as a
# file, so it must be the operator's alone on the host: a regular file (not
# a link someone could point elsewhere), owned by the operator, mode 0600.
check_claude_token() {
  python3 - "$CLAUDE_TOKEN_FILE" <<'PY'
import os, stat, sys
path = sys.argv[1]
how = "make it with `claude setup-token`, save the token there and chmod 600 it"
try:
    st = os.lstat(path)
except FileNotFoundError:
    sys.exit(f"missing Claude token file {path}: {how}")
if stat.S_ISLNK(st.st_mode):
    sys.exit(f"Claude token file {path} is a symlink; it must be the file itself: {how}")
if not stat.S_ISREG(st.st_mode):
    sys.exit(f"Claude token file {path} is not a regular file: {how}")
if st.st_uid != os.getuid():
    sys.exit(f"Claude token file {path} is owned by uid {st.st_uid}, not this user ({os.getuid()})")
mode = stat.S_IMODE(st.st_mode)
if mode != 0o600:
    sys.exit(f"Claude token file {path} has mode {mode:o}, not 600: {how}")
if st.st_size == 0:
    sys.exit(f"Claude token file {path} is empty: {how}")
PY
}

# Codex reads instructions from CODEX_HOME, so each Codex session gets a
# scratch one holding credentials and a config that pins the operator's model
# and effort and turns off Codex's own web search, never the operator's
# AGENTS.md. It also turns off apps: with a ChatGPT login Codex otherwise
# offers the account's ChatGPT connectors as codex_apps tools, which let a
# run act on GitHub as the operator. Browser use, computer use, plugins and
# image generation go too, as tools a candidate at a terminal would not have.
# network_access applies only under workspace-write, which runs no longer use
# (see agent_command); it is moot, and left as it was.
make_codex_home() { # make_codex_home <dir>
  local auth="$HOME/.codex/auth.json"
  [[ -f "$auth" ]] || { echo "missing Codex credentials: $auth" >&2; return 1; }
  mkdir "$1"
  cp "$auth" "$1/auth.json"
  cat > "$1/config.toml" <<'TOML'
model = "gpt-6.1-sol"
model_reasoning_effort = "high"
web_search = "disabled"

[features]
apps = false
browser_use = false
computer_use = false
image_generation = false
plugins = false
remote_plugin = false

[sandbox_workspace_write]
network_access = true
TOML
}

# The docker network every run and scoring container joins. Its bridge
# carries no traffic between containers, and firewall rules in Docker's VM
# (see vm_firewall) keep it off the Mac's loopback, which Colima exposes at
# its gateway address, and off the VM itself except for DNS.
RUN_NETWORK=specdial-runs
RUN_BRIDGE=specdial-runs
# Hosts a run must still reach: the npm registry and the model APIs. The
# rules below block only private ranges, so the public internet, GitHub
# included, stays reachable; what keeps a run from fetching the public
# reference is its tools (no web tools, no Codex web search or connectors),
# and summarise records any URL a command names as external_fetches.
OUTBOUND_TARGETS=(registry.npmjs.org:443 api.anthropic.com:443 api.openai.com:443 chatgpt.com:443)

# vm_firewall setup|check: in Docker's VM, as root, (re)writes or checks the
# chains that drop the runs bridge's traffic to every private, shared and
# link-local IPv4 range (the Mac answers at the VM's gateway, and the Mac's
# own LAN sits behind it) and to the VM itself except DNS to its resolver.
# The VM's LAN is dropped by name too, in case a Colima puts it outside
# those ranges. Prints the Mac's address and the VM's LAN address, read in
# the VM rather than assumed.
vm_firewall() {
  colima ssh -- sudo sh -s "$1" "$RUN_BRIDGE" <<'SH'
set -eu
mode=$1 bridge=$2
host=$(ip -4 route show default | awk '{print $3; exit}')
lan=$(ip -4 route show default | awk '{print $5; exit}')
subnet=$(ip -4 route show dev "$lan" proto kernel | awk '{print $1; exit}')
vm=$(ip -4 addr show dev "$lan" | awk '$1 == "inet" {sub(/\/.*/, "", $2); print $2; exit}')
dns=$(awk '$1 == "nameserver" {print $2; exit}' /etc/resolv.conf)
[ -n "$host" ] && [ -n "$subnet" ] && [ -n "$vm" ] && [ -n "$dns" ] \
  || { echo "cannot read the VM's gateway, subnet, address or DNS server" >&2; exit 1; }
forward_rules="-A SPECDIAL-FORWARD -d $subnet -j DROP"
for range in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 169.254.0.0/16 100.64.0.0/10; do
  forward_rules="$forward_rules
-A SPECDIAL-FORWARD -d $range -j DROP"
done
input_rules="-A SPECDIAL-INPUT -d $dns/32 -p udp -m udp --dport 53 -j ACCEPT
-A SPECDIAL-INPUT -d $dns/32 -p tcp -m tcp --dport 53 -j ACCEPT
-A SPECDIAL-INPUT -j DROP"
if [ "$mode" = setup ]; then
  for chain in SPECDIAL-FORWARD SPECDIAL-INPUT; do
    iptables -S "$chain" > /dev/null 2>&1 || iptables -N "$chain"
    iptables -F "$chain"
  done
  printf '%s\n' "$forward_rules" "$input_rules" | while read -r rule; do iptables $rule; done
  iptables -C DOCKER-USER -i "$bridge" -j SPECDIAL-FORWARD 2> /dev/null || iptables -I DOCKER-USER -i "$bridge" -j SPECDIAL-FORWARD
  iptables -C INPUT -i "$bridge" -j SPECDIAL-INPUT 2> /dev/null || iptables -I INPUT -i "$bridge" -j SPECDIAL-INPUT
fi
[ "$(iptables -S SPECDIAL-FORWARD 2> /dev/null | grep -v '^-N')" = "$forward_rules" ] \
  || { echo "firewall chain SPECDIAL-FORWARD is missing or changed" >&2; exit 1; }
[ "$(iptables -S SPECDIAL-INPUT 2> /dev/null | grep -v '^-N')" = "$input_rules" ] \
  || { echo "firewall chain SPECDIAL-INPUT is missing or changed" >&2; exit 1; }
iptables -C DOCKER-USER -i "$bridge" -j SPECDIAL-FORWARD 2> /dev/null \
  || { echo "DOCKER-USER does not send $bridge to SPECDIAL-FORWARD" >&2; exit 1; }
iptables -C INPUT -i "$bridge" -j SPECDIAL-INPUT 2> /dev/null \
  || { echo "INPUT does not send $bridge to SPECDIAL-INPUT" >&2; exit 1; }
echo "$host $vm"
SH
}

# Prints the runs network's gateway (the VM's address on it), after checking
# the network exists with inter-container traffic off on the expected bridge
# and no IPv6, which the IPv4 firewall rules would not cover.
runs_network_gateway() {
  local state icc bridge gateway ipv6
  state=$(docker network inspect --format \
    '{{index .Options "com.docker.network.bridge.enable_icc"}} {{index .Options "com.docker.network.bridge.name"}} {{(index .IPAM.Config 0).Gateway}} {{.EnableIPv6}}' \
    "$RUN_NETWORK") || { echo "no Docker network $RUN_NETWORK: run ./run.sh --setup-network" >&2; return 1; }
  read -r icc bridge gateway ipv6 <<< "$state"
  [[ "$ipv6" == false ]] || { echo "network $RUN_NETWORK has IPv6 enabled, which the firewall does not cover" >&2; return 1; }
  [[ "$icc" == false ]] || { echo "network $RUN_NETWORK has enable_icc=$icc, not false" >&2; return 1; }
  [[ "$bridge" == "$RUN_BRIDGE" ]] || { echo "network $RUN_NETWORK uses bridge '$bridge', not $RUN_BRIDGE" >&2; return 1; }
  [[ -n "$gateway" ]] || { echo "network $RUN_NETWORK has no gateway address" >&2; return 1; }
  echo "$gateway"
}

setup_network() {
  if [[ -z "$(docker network ls --quiet --filter "name=^${RUN_NETWORK}\$")" ]]; then
    docker network create --driver bridge -o com.docker.network.bridge.enable_icc=false \
      -o "com.docker.network.bridge.name=$RUN_BRIDGE" "$RUN_NETWORK" > /dev/null
  fi
  runs_network_gateway > /dev/null
  vm_firewall setup > /dev/null
}

# Each target is tried at once from inside the container and reported as
# "open <target>" or "closed <target>"; a dropped packet shows as a timeout.
PREFLIGHT_SCRIPT='for target in "$@"; do
  (timeout 5 bash -c "exec 3<>/dev/tcp/${target%:*}/${target##*:}" 2> /dev/null && echo "open $target" || echo "closed $target") &
done
wait'

# preflight <network> <mac address> <vm lan address> <vm gateway on network>
# From a container on the network, the Mac's Postgres and SSH ports, the
# VM's SSH port, the Mac's own LAN gateway (read here with route) and a
# sample address in each of 192.168.0.0/16 and 10.0.0.0/8 must be
# unreachable, and every outbound target reachable.
preflight() {
  local network=$1 host=$2 vm=$3 gateway=$4 out target problems=0 lan_gateway
  lan_gateway=$(route -n get default | awk '/gateway:/ {print $2}')
  [[ -n "$lan_gateway" ]] || { echo "cannot read this Mac's default gateway with route -n get default" >&2; return 1; }
  local closed=("$host:5432" "$host:22" "$gateway:22" "$vm:22" 192.168.0.1:80 10.0.0.1:80 "$lan_gateway:80")
  out=$(docker run --rm --network "$network" --user candidate --security-opt no-new-privileges \
    "$IMAGE" bash -c "$PREFLIGHT_SCRIPT" preflight "${closed[@]}" "${OUTBOUND_TARGETS[@]}")
  for target in "${closed[@]}"; do
    grep -qxF "closed $target" <<< "$out" \
      || { echo "a container on $network can reach $target, which must be blocked" >&2; problems=1; }
  done
  for target in "${OUTBOUND_TARGETS[@]}"; do
    grep -qxF "open $target" <<< "$out" \
      || { echo "a container on $network cannot reach $target, which runs need" >&2; problems=1; }
  done
  return "$problems"
}

# Everything a container needs before it may start: the image, the runs
# network and its firewall, and a live check that the rules hold.
check_isolation() {
  local gateway addresses
  require_image || return 1
  gateway=$(runs_network_gateway) || return 1
  addresses=$(vm_firewall check) \
    || { echo "firewall rules for $RUN_BRIDGE are missing in Docker's VM: run ./run.sh --setup-network" >&2; return 1; }
  preflight "$RUN_NETWORK" ${addresses} "$gateway"
}

# Fails when the container would get an empty /work because Docker's VM does
# not share the directory.
check_mount() { # check_mount <work dir>
  local marker=".mount-check-$RANDOM$RANDOM"
  : > "$1/$marker"
  if ! docker run --rm --network none -v "$1:/work" --workdir /work "$IMAGE" test -e "$marker"; then
    echo "a container cannot see $1 (Docker's VM does not share it); set SCRATCH_DIR to a directory it shares" >&2
    return 1
  fi
  rm "$1/$marker"
}

# Removes a directory an agent wrote into, which may hold files and
# directories it made unreadable. chmod -R does not follow symlinks inside
# the tree, so a planted link cannot widen the mode of a file outside it.
remove_tree() {
  [[ -e "$1" || -L "$1" ]] || return 0
  [[ -L "$1" || ! -d "$1" ]] || chmod -R u+rwX "$1"
  rm -rf "$1"
}

# A run root is stale when the runner that made it (named in its owner file)
# has died and its container is not running. A root with no owner file yet is
# one being made, unless it is older than any runner takes to write the file.
sweep_stale_roots() {
  local root owner
  for root in "$SCRATCH_DIR"/run.*; do
    [[ -d "$root" ]] || continue
    if [[ -f "$root/owner" ]]; then
      owner=$(cat "$root/owner")
      ! kill -0 "$owner" 2> /dev/null || continue
    else
      [[ -n "$(find "$root" -maxdepth 0 -mmin +10)" ]] || continue
    fi
    [[ -z "$(docker ps --quiet --filter "name=^$(container_name "$root")\$")" ]] || continue
    remove_tree "$root"
  done
}

# make_run_root <agent> <variable> sets the variable to a fresh private
# directory holding
#   owner   this runner's pid, for sweep_stale_roots
#   work/   the agent's working directory, empty, mounted at /work
#   codex/  (Codex only) its CODEX_HOME, mounted at /codex
# after checking isolation holds and, for Claude, the token file. The root
# joins CLEANUP before anything goes into it. Nothing else of the host
# reaches the container: the operator's HOME holds a gh login, SSH keys and
# a signing git config, its keychain the full Claude login, and the Mac's
# loopback a password-less Postgres, and sessions found all of them.
make_run_root() {
  local agent=$1
  local -n root_var=$2
  check_isolation
  [[ "$agent" == codex ]] || check_claude_token
  mkdir -p -m 700 "$SCRATCH_DIR"
  sweep_stale_roots
  root_var=$(mktemp -d "$SCRATCH_DIR/run.XXXXXX")
  CLEANUP+=("$root_var")
  echo "$$" > "$root_var/owner"
  mkdir "$root_var/work"
  [[ "$agent" != codex ]] || make_codex_home "$root_var/codex"
  check_mount "$root_var/work"
}

container_name() { echo "specdial-$(basename "$1")"; } # container_name <run root>

# container_command <array> <agent> <run root> <agent command...>
# Fills the named array with the docker run line that runs the agent command
# in a fresh container. The Claude token is named but not given a value, so
# docker takes it from run_timed's environment and it never appears in an
# argument list or a file.
container_command() {
  local -n docker_args=$1
  local agent=$2 root=$3
  shift 3
  docker_args=(docker run --rm --init --name "$(container_name "$root")"
    --user candidate --workdir /work
    --memory "$AGENT_MEMORY" --cpus "$AGENT_CPUS"
    --network "$RUN_NETWORK" --security-opt no-new-privileges
    -v "$root/work:/work" -e TZ=UTC)
  if [[ "$agent" == codex ]]; then
    docker_args+=(-v "$root/codex:/codex" -e CODEX_HOME=/codex)
  else
    docker_args+=(-e CLAUDE_CODE_OAUTH_TOKEN)
  fi
  docker_args+=("$IMAGE" "$@")
}

# Fills the named array with the agent's exact command line.
agent_command() {
  local -n into=$1
  local agent=$2 prompt=$3 budget=$4
  case "$agent" in
    sonnet | opus)
      into=(claude -p "$prompt" --model "$agent" --setting-sources project
        --output-format stream-json --verbose
        --tools Bash Edit Glob Grep Read Write TodoWrite Task
        --allowedTools Read Write Edit Glob Grep Bash
        --disallowedTools WebSearch WebFetch Workflow RemoteTrigger SendMessage
        --strict-mcp-config
        --permission-mode bypassPermissions --no-session-persistence
        --max-budget-usd "$budget") ;;
    # Codex's workspace-write sandbox runs every command through bwrap,
    # which cannot create a user namespace under Docker's default seccomp
    # profile, so inside the container Codex runs unsandboxed and the
    # container is the boundary.
    codex)
      into=(codex exec --skip-git-repo-check --sandbox danger-full-access --json "$prompt") ;;
    *) echo "unknown agent: $agent" >&2; return 1 ;;
  esac
}

agent_cli_version() {
  case "$1" in
    codex) docker run --rm --network none "$IMAGE" codex --version ;;
    *) docker run --rm --network none "$IMAGE" claude --version ;;
  esac
}

# run_timed <wall_s> <stdout> <stderr> <status.json> <container> <token file|""> -- <docker run...>
# Runs the docker run line and records exit code, wall time, whether the cap
# was hit and any signal that stopped it. With a token file, its contents are
# the CLAUDE_CODE_OAUTH_TOKEN that docker hands the container. When the cap
# is hit, or this runner gets SIGINT, SIGTERM or SIGHUP, the container is
# killed with docker kill, which ends everything the agent started.
run_timed() {
  python3 - "$@" <<'PY'
import json, os, signal, subprocess, sys, time

wall_s, out_path, err_path, status_path, container, token_file = sys.argv[1:7]
assert sys.argv[7] == "--"
command = sys.argv[8:]
# How long docker gets to end the container after a kill before the client
# itself is killed.
KILL_GRACE_S = 30

env = dict(os.environ)
if token_file:
    with open(os.open(token_file, os.O_RDONLY | os.O_NOFOLLOW)) as f:
        env["CLAUDE_CODE_OAUTH_TOKEN"] = f.read().strip()

proc = None
stopped_by = None
stop_started = None


def kill_container():
    # Before docker has created the container, or after --rm has removed it,
    # docker kill finds nothing; the wait loop below retries until the client
    # has exited, so a signal that comes before the container exists still
    # ends it.
    subprocess.run(["docker", "kill", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def on_signal(signum, frame):
    global stopped_by, stop_started
    stopped_by = signal.Signals(signum).name
    stop_started = stop_started or time.monotonic()


def wait_for_exit(until):
    while proc.poll() is None:
        now = time.monotonic()
        if stop_started is not None:
            kill_container()
            if now - stop_started > KILL_GRACE_S:
                proc.kill()
        if now >= until:
            return False
        time.sleep(min(1.0, until - now))
    return True


for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
    signal.signal(sig, on_signal)

start = time.monotonic()
timed_out = False
with open(out_path, "wb") as out, open(err_path, "wb") as err:
    # Its own session, so a signal to the runner's process group reaches the
    # agent only through the kill below, after this helper has noted it.
    proc = subprocess.Popen(command, env=env, stdin=subprocess.DEVNULL, stdout=out, stderr=err,
                            start_new_session=True)
    if not wait_for_exit(start + float(wall_s)):
        timed_out = True
        stop_started = stop_started or time.monotonic()
        wait_for_exit(float("inf"))
    # Also after a clean exit: a client that died on its own would otherwise
    # leave the container writing to the workspace while it is copied.
    kill_container()
    code = proc.returncode
with open(status_path, "w") as f:
    json.dump({"exit_code": code, "timed_out": timed_out, "interrupted": stopped_by,
               "wall_s": round(time.monotonic() - start, 3)}, f)
PY
}

# summarise <agent> <transcript> <status.json> <codex_home|""> <final_message.txt>
# Prints JSON with the per-agent fields of result.json and writes the agent's
# final message. A value the agent did not report is null, never guessed; with
# no codex_home, Codex's model and effort are null.
summarise() {
  python3 - "$REPO" "$@" <<'PY'
import glob, ipaddress, json, os, re, shlex, sys, urllib.parse

repo, agent, transcript, status_path, codex_home, final_path = sys.argv[1:7]
status = json.load(open(status_path))
raw = open(transcript, errors="replace").read()
events = []
for line in raw.splitlines():
    line = line.strip()
    if line.startswith("{"):
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            pass  # a run killed at the wall-clock cap can end mid-line.


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for v in value.values():
            yield from strings(v)
    elif isinstance(value, list):
        for v in value:
            yield from strings(v)


failed_run = status["exit_code"] != 0 or status["timed_out"] or bool(status["interrupted"])
if agent == "codex":
    turns = [e for e in events if e.get("type") == "turn.completed"]
    errored = any(e.get("type") in ("turn.failed", "error") for e in events)
    items = [e["item"] for e in events if e.get("type") == "item.completed" and "item" in e]
    usage = None
    for e in turns:
        usage = usage or {}
        for k, v in e.get("usage", {}).items():
            usage[k] = usage.get(k, 0) + v
    # codex exec --json reports neither model nor effort; the session rollout
    # does. A session killed mid-write can leave a cut-off last line.
    model = effort = None
    rollouts = glob.glob(os.path.join(codex_home, "sessions", "**", "rollout-*.jsonl"), recursive=True) if codex_home else []
    for path in sorted(rollouts):
        for line in open(path, errors="replace"):
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            if e.get("type") == "turn_context":
                model = e["payload"].get("model", model)
                effort = e["payload"].get("effort", effort)
    messages = [i["text"] for i in items if i.get("type") == "agent_message"]
    commands = [i["command"] for i in items if i.get("type") == "command_execution"]
    written = [s for i in items if i.get("type") == "file_change" for s in strings(i)]
    final = messages[-1] if messages else None
    # One codex exec is one turn in Codex's own count, so turns is 1 for any
    # completed run; codex_steps (commands run plus messages sent) is the
    # closer measure of how much work the session did.
    fields = {"model": model, "effort": effort,
              "is_error": failed_run or errored or not turns,
              "cost_usd": None, "turns": len(turns) if turns else None,
              "codex_steps": sum(1 for i in items if i.get("type") in ("command_execution", "agent_message")),
              "usage": usage}
else:
    init = next((e for e in events if e.get("type") == "system" and e.get("subtype") == "init"), {})
    # A background task that ends after the answer (a Monitor timing out)
    # makes Claude emit a further, shorter result event. The answer is the
    # result with the most turns; cost is cumulative, so the last one has it.
    results = [e for e in events if e.get("type") == "result"]
    result = results[-1] if results else None
    answer = max(results, key=lambda e: e.get("num_turns") or 0) if results else None
    commands = [c["input"]["command"] for e in events if e.get("type") == "assistant"
                for c in e.get("message", {}).get("content", [])
                if c.get("type") == "tool_use" and c.get("name") == "Bash" and "command" in c.get("input", {})]
    written = [s for e in events if e.get("type") == "assistant"
               for c in e.get("message", {}).get("content", [])
               if c.get("type") == "tool_use" and c.get("name") in ("Write", "Edit")
               for s in strings(c.get("input", {}))]
    final = answer.get("result") if answer else None
    fields = {"model": init.get("model"), "effort": None,
              "is_error": failed_run or result is None or bool(result.get("is_error")),
              "cost_usd": result.get("total_cost_usd") if result else None,
              "turns": answer.get("num_turns") if answer else None,
              "codex_steps": None,
              "usage": result.get("usage") if result else None}

# Signs the agent went looking for the reference, the corpus or the
# operator's own instructions instead of doing the task.
said = raw + "\n" + "\n".join(s for e in events for s in strings(e))
markers = (repo, "mutgap", "specdial", "reference.ts", "buggy.ts", "corpus.json",
           ".claude/CLAUDE.md", ".codex/AGENTS.md")
fields["contamination"] = [m for m in markers if m in said]

# Any URL in a command the agent ran counts, since a fetch can go through
# git, pip, or a one-line script as easily as curl; so does any gh command and
# the target of any git push, clone or remote add, since those act on GitHub
# (or another host) as whoever the session is logged in as. So do a host
# named without a scheme to curl, wget, git clone or fetch(, any URL written
# into a file with Write, Edit or a Codex file change, and any package npm
# or npx would pull from the registry beyond the four the image preinstalls.
# Reserved test domains, bare hostnames and loopback cannot reach anyone
# else's server.
allowed_hosts = {"registry.npmjs.org", "0.0.0.0"}
reserved_suffixes = (".example", ".test", ".invalid", ".localhost")


def ignored_host(host):
    if not host or host in allowed_hosts or host.endswith(reserved_suffixes):
        return True
    if "." not in host and ":" not in host:
        return True  # a bare hostname: the agent's own machine or network
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


# Where a command's text ends inside a line: a shell separator, or the quote
# that closes a `bash -lc '...'` wrapper.
SEGMENT = r"[^;&|\n'\"`()]*"
STARTS = r"(?:^|(?<=[\s;&|('\"`]))(?:\S*/)?"
GIT_VALUE_OPTIONS = {"-C", "-c", "-b", "--branch", "-o", "--origin", "--depth", "--reference",
                     "--config", "-j", "--jobs", "--filter", "--template", "--separate-git-dir",
                     "-u", "--upload-pack", "--receive-pack", "--push-option", "--shallow-since"}


def positionals(words):
    out, skip = [], False
    for w in words:
        if skip:
            skip = False
        elif w in GIT_VALUE_OPTIONS:
            skip = True
        elif not w.startswith("-"):
            out.append(w)
    return out


def shell_words(text):
    try:
        return shlex.split(text)
    except ValueError:
        return text.split()


def git_targets(command):
    for m in re.finditer(STARTS + r"git((?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*)\s+(push|clone|remote\s+add)\b(" + SEGMENT + ")", command):
        sub, args = m.group(2).split()[0], positionals(shell_words(m.group(3)))
        if sub == "remote":
            target = args[1] if len(args) > 1 else None  # remote add <name> <url>
        else:
            target = args[0] if args else None
        if target is None:
            if sub == "push":
                yield "git push"
            continue
        if target.startswith(("/", ".", "~", "file:")):
            continue  # a local repository
        if "://" in target:
            host = urllib.parse.urlparse(target).hostname
        elif ":" in target:
            host = target.split(":", 1)[0].rsplit("@", 1)[-1]
        elif sub == "push":
            yield f"git push {target}"  # a remote named earlier, which could point anywhere
            continue
        elif sub == "clone" and BARE_URL.fullmatch(target):
            host = target.split("/", 1)[0].split(":", 1)[0]  # host.tld/path, no scheme
        else:
            continue  # clone or remote add of a relative local path
        if not ignored_host(host):
            yield target


def urls(text):
    """URLs with a scheme, and the argument of a fetch( call written without
    one, whose host is not ignored."""
    for url in re.findall(r"https?://[^\s'\"<>()\\;&|`]+", text):
        if not ignored_host(urllib.parse.urlparse(url).hostname):
            yield url
    for m in re.finditer(r"\bfetch\(\s*['\"`]([^'\"`\s]+)", text):
        if BARE_URL.fullmatch(m.group(1)) and not ignored_host(bare_host(m.group(1))):
            yield m.group(1)


# host.tld with an optional port and path, as curl and wget accept it.
BARE_URL = re.compile(r"[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?::\d+)?(?:/\S*)?")
# Options that take a value, so the value is not read as a URL.
DOWNLOADER_VALUE_OPTIONS = {"-o", "--output", "-d", "--data", "--data-raw", "--data-binary", "-H", "--header",
                            "-X", "--request", "-u", "--user", "-A", "--user-agent", "-e", "--referer", "-b",
                            "--cookie", "-c", "--cookie-jar", "-T", "--upload-file", "-m", "--max-time",
                            "-O", "--output-document", "-P", "--directory-prefix", "-U", "-w", "--write-out"}


def bare_host(target):
    return target.split("/", 1)[0].split(":", 1)[0]


def downloader_targets(command):
    """Arguments to curl or wget that name a host without a scheme."""
    for m in re.finditer(STARTS + r"(curl|wget)(\s" + SEGMENT + ")", command):
        skip = False
        for w in shell_words(m.group(2)):
            if skip:
                skip = False
            elif w in DOWNLOADER_VALUE_OPTIONS:
                skip = True
            elif not w.startswith("-") and "://" not in w and BARE_URL.fullmatch(w) and not ignored_host(bare_host(w)):
                yield f"{m.group(1)} {w}"


# The image preinstalls these; any other package npm or npx names comes from
# the registry.
PREINSTALLED = {"vitest", "fast-check", "tsx", "esbuild"}


def package_name(spec):
    """The package in an npm spec such as @scope/name@1.2 or name@^3."""
    at = spec.find("@", 1)
    return spec if at == -1 else spec[:at]


def package_fetches(command):
    for m in re.finditer(STARTS + r"npm\s+(install|i|add|pack|view)\b(" + SEGMENT + ")", command):
        for w in shell_words(m.group(2)):
            if not w.startswith("-") and package_name(w) not in PREINSTALLED:
                yield f"npm {m.group(1)} {w}"
    for m in re.finditer(STARTS + r"npx(\s" + SEGMENT + ")", command):
        words, named, take = shell_words(m.group(1)), [], False
        for w in words:
            if take:
                named.append(w)
                take = False
            elif w in ("-p", "--package"):
                take = True
            elif w.startswith("--package="):
                named.append(w.split("=", 1)[1])
            elif not w.startswith("-"):
                # The command npx runs, which is itself the package unless
                # -p named them; its arguments follow.
                if not named:
                    named.append(w)
                break
        for w in named:
            if package_name(w) not in PREINSTALLED:
                yield f"npx {w}"


fetches = []
for command in commands:
    found = list(urls(command))
    found += ["gh" + m.group(1).rstrip() for m in re.finditer(STARTS + r"gh(\s" + SEGMENT + ")", command)]
    found += list(git_targets(command))
    found += list(downloader_targets(command))
    found += list(package_fetches(command))
    for item in found:
        if item not in fetches:
            fetches.append(item)
# A URL written into a file counts too: the agent's own code can fetch it
# when a test runs.
for text in written:
    for item in urls(text):
        if item not in fetches:
            fetches.append(item)
fields["external_fetches"] = fetches

# An agent that sent no final message leaves no final_message.txt, rather
# than an empty one that reads as a blank answer.
if final is not None:
    with open(final_path, "w") as f:
        f.write(final)
fields.update(timed_out=status["timed_out"], interrupted=status["interrupted"],
              exit_code=status["exit_code"], wall_s=status["wall_s"])
print(json.dumps(fields))
PY
}

CLEANUP=()
cleanup() {
  local path
  for path in "${CLEANUP[@]}"; do remove_tree "$path"; done
}

# Once the agent is running, a stop signal to the runner is passed to
# run_timed, which kills the agent at once; the runner then records the run
# (it has been paid for) and exits with the signal's status.
STOP_SIGNAL=""
TIMED_PID=""
forward_stop() {
  STOP_SIGNAL=${STOP_SIGNAL:-$1}
  # TIMED_PID is the background subshell; the helper that owns the agent is
  # its child.
  [[ -z "$TIMED_PID" ]] || pkill -TERM -P "$TIMED_PID" || true
}

# level_files <fn> <level> prints one "<task file> <work dir path>" line per
# file the level puts in the work dir, levels being cumulative.
level_files() {
  local fn=$1 level=$2
  echo "stub.ts src/$fn.ts"
  echo "ticket.md TICKET.md"
  [[ "$level" == L0 ]] && return 0
  echo "examples.test.ts src/$fn.test.ts"
  [[ "$level" == L1 ]] && return 0
  echo "spec.md SPEC.md"
  [[ "$level" == L2 ]] && return 0
  echo "properties.test.ts src/$fn.properties.test.ts"
}

level_prompt() { # level_prompt <fn> <level>
  local fn=$1
  case "$2" in
    L0) echo "Implement \`$fn\` in \`src/$fn.ts\`. The request is in \`TICKET.md\`." ;;
    L1) echo "Implement \`$fn\` in \`src/$fn.ts\`. The request is in \`TICKET.md\`, and \`src/$fn.test.ts\` has tests it must pass. \`npx vitest run\` runs them." ;;
    L2) echo "Implement \`$fn\` in \`src/$fn.ts\`. The request is in \`TICKET.md\`, the full specification is in \`SPEC.md\`, and \`src/$fn.test.ts\` has tests it must pass. \`npx vitest run\` runs them." ;;
    L3) echo "Implement \`$fn\` in \`src/$fn.ts\`. The request is in \`TICKET.md\`, the full specification is in \`SPEC.md\`, and \`src/$fn.test.ts\` and \`src/$fn.properties.test.ts\` have tests it must pass. \`npx vitest run\` runs them." ;;
    *) echo "unknown level: $2" >&2; return 1 ;;
  esac
}

run_one() {
  local fn=$1 level=$2 agent=$3 rep=$4
  local task="$TASKS_DIR/$fn"
  local dir="$RUNS_DIR/${fn}__${level}__${agent}__r${rep}"
  [[ -d "$task" ]] || { echo "no such task: $task" >&2; return 1; }
  [[ " $ALL_LEVELS " == *" $level "* ]] || { echo "unknown level: $level (one of $ALL_LEVELS)" >&2; return 1; }
  [[ " $ALL_AGENTS " == *" $agent "* ]] || { echo "unknown agent: $agent (one of $ALL_AGENTS)" >&2; return 1; }
  [[ "$rep" =~ ^[0-9]+$ ]] || { echo "rep must be a whole number: $rep" >&2; return 1; }
  local files from to
  files=$(level_files "$fn" "$level")
  while read -r from to; do
    [[ -f "$task/$from" ]] || { echo "level $level needs $task/$from, which is missing" >&2; return 1; }
  done <<< "$files"

  # The run's private root (with its Codex credential copy) and the lock go
  # however the run ends. A stop signal before the agent starts ends the run
  # unrecorded; once it has started, forward_stop takes over.
  trap cleanup EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  mkdir -p "$RUNS_DIR"
  if ! mkdir "$dir.lock" 2>/dev/null; then
    echo "locked: $dir.lock (another runner has this run, or one crashed and left it)" >&2
    return 1
  fi
  CLEANUP+=("$dir.lock")

  if [[ -f "$dir/result.json" ]]; then
    echo "skip $(basename "$dir")"
    return 0
  fi
  local budget=${BUDGET:-1.00}
  local wall_s=${WALL_S:-600}
  local root work codex_home="" token_file=""
  make_run_root "$agent" root
  work="$root/work"
  if [[ "$agent" == codex ]]; then codex_home="$root/codex"; else token_file=$CLAUDE_TOKEN_FILE; fi

  # A directory without result.json is a run that died part way; start over.
  rm -rf "$dir"
  mkdir -p "$dir"
  cp "$REPO/docker/package.json" "$work/package.json"
  # Resolves only inside the container, where the image installed the deps.
  ln -s /opt/deps/node_modules "$work/node_modules"
  mkdir "$work/src"
  while read -r from to; do
    cp "$task/$from" "$work/$to"
  done <<< "$files"

  local -a command_line docker_line
  agent_command command_line "$agent" "$(level_prompt "$fn" "$level")" "$budget"
  container_command docker_line "$agent" "$root" "${command_line[@]}"
  local cli
  cli=$(agent_cli_version "$agent")

  echo "run  $(basename "$dir")"
  trap 'forward_stop HUP' HUP
  trap 'forward_stop INT' INT
  trap 'forward_stop TERM' TERM
  # In the background, because bash runs a trap only after the foreground
  # command ends, which for an agent can be ten minutes away. The subshell
  # ignores stop signals so a signal to the whole group cannot end it before
  # the helper (which sets its own handlers) has recorded the run.
  (
    trap '' HUP INT TERM
    run_timed "$wall_s" "$dir/transcript.jsonl" "$dir/stderr.txt" "$root/status.json" "$(container_name "$root")" "$token_file" \
      -- "${docker_line[@]}"
  ) &
  TIMED_PID=$!
  [[ -z "$STOP_SIGNAL" ]] || forward_stop "$STOP_SIGNAL"
  # wait returns early whenever a trapped signal arrives; keep waiting until
  # run_timed has written its status and gone.
  until wait "$TIMED_PID"; do
    kill -0 "$TIMED_PID" 2>/dev/null || break
  done
  [[ -f "$root/status.json" ]] || { echo "run_timed failed without recording a status" >&2; return 1; }

  # The agent may have left files only its own user could read. The
  # implementation is copied only if it resolves inside the work dir: a link
  # the agent left, at src/<fn>.ts or at src/ itself, could point at any of
  # the operator's files once outside the container.
  chmod -R u+rwX "$work"
  local impl="$work/src/$fn.ts" impl_present=false impl_refused="" work_real impl_real
  work_real=$(realpath "$work")
  if [[ ! -e "$impl" && ! -L "$impl" ]]; then
    impl_refused="src/$fn.ts does not exist"
  elif ! impl_real=$(realpath "$impl" 2> /dev/null); then
    impl_refused="src/$fn.ts does not resolve on the host"
  elif [[ "$impl_real" != "$work_real"/* ]]; then
    impl_refused="src/$fn.ts resolves outside the work dir, to $impl_real"
  elif [[ ! -f "$impl_real" ]]; then
    impl_refused="src/$fn.ts is not a regular file"
  else
    cp "$impl_real" "$dir/impl.ts"
    impl_present=true
  fi

  local fields
  fields=$(summarise "$agent" "$dir/transcript.jsonl" "$root/status.json" "$codex_home" "$dir/final_message.txt")
  local base
  base=$(python3 -c 'import json, sys
fn, level, agent, rep, cli, impl_present, impl_refused = sys.argv[1:8]
print(json.dumps({"fn": fn, "level": level, "agent": agent, "rep": int(rep), "cli": cli,
                  "impl_present": impl_present == "true", "impl_refused": impl_refused or None}))' \
    "$fn" "$level" "$agent" "$rep" "$cli" "$impl_present" "$impl_refused")
  write_result "$dir/result.json" "$base" "$fields"
  case "$STOP_SIGNAL" in
    HUP) exit 129 ;;
    INT) exit 130 ;;
    TERM) exit 143 ;;
  esac
}

# write_result <result.json> <base JSON> <fields JSON>: the base overlaid
# with the fields, written aside and renamed so a result.json that exists is
# always whole.
write_result() {
  python3 - "$@" <<'PY'
import json, os, sys
path, base, fields = sys.argv[1:4]
result = json.loads(base)
result.update(json.loads(fields))
with open(path + ".tmp", "w") as f:
    json.dump(result, f, indent=2)
    f.write("\n")
os.replace(path + ".tmp", path)
PY
}

run_all() {
  local fn level agent rep list=""
  for fn in ${FNS:-$(ls "$TASKS_DIR")}; do
    [[ -d "$TASKS_DIR/$fn" ]] || { echo "no such task: $TASKS_DIR/$fn" >&2; return 1; }
    for level in ${LEVELS:-$ALL_LEVELS}; do
      for agent in ${AGENTS:-$ALL_AGENTS}; do
        for rep in $(seq 1 "${REPS:-15}"); do
          list+="$fn $level $agent $rep"$'\n'
        done
      done
    done
  done
  [[ -n "$list" ]] || { echo "no runs selected" >&2; return 1; }
  printf '%s' "$list" | xargs -P "${JOBS:-1}" -n 4 "$REPO/run.sh" --one
}

main() {
  if [[ "${1:-}" == --build-image ]]; then
    [[ $# -eq 1 ]] || { echo "usage: $0 --build-image" >&2; return 2; }
    build_image
  elif [[ "${1:-}" == --setup-network ]]; then
    [[ $# -eq 1 ]] || { echo "usage: $0 --setup-network" >&2; return 2; }
    setup_network
  elif [[ "${1:-}" == --check-isolation ]]; then
    [[ $# -eq 1 ]] || { echo "usage: $0 --check-isolation" >&2; return 2; }
    check_isolation
  elif [[ "${1:-}" == --one ]]; then
    [[ $# -eq 5 ]] || { echo "usage: $0 --one <fn> <level> <agent> <rep>" >&2; return 2; }
    run_one "$2" "$3" "$4" "$5"
  elif [[ $# -eq 0 ]]; then
    run_all
  else
    echo "usage: $0 [--build-image | --setup-network | --check-isolation | --one <fn> <level> <agent> <rep>]" >&2
    return 2
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
