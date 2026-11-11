#!/usr/bin/env bash
# Senganthal Dress Boutique - Services Management Menu
# Menu and lifecycle flow adapted from Shakthi Yoga manage-services.sh.

set -Eeuo pipefail
umask 027

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; BLUE=$'\033[0;34m'; CYAN=$'\033[0;36m'; NC=$'\033[0m'
APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$APP_DIR/.run"; LOG_DIR="$APP_DIR/logs"
PROD_PID_FILE="$RUNTIME_DIR/production.pid"; DEV_API_PID_FILE="$RUNTIME_DIR/dev-api.pid"; DEV_WEB_PID_FILE="$RUNTIME_DIR/dev-web.pid"
PROD_LOG="$LOG_DIR/production.log"; DEV_API_LOG="$LOG_DIR/dev-api.log"; DEV_WEB_LOG="$LOG_DIR/dev-web.log"
PM2_NAME="${PM2_NAME:-senganthal}"; API_PORT="${PORT:-3000}"; WEB_PORT="${DEV_PORT:-5173}"; HOST="${HOST:-0.0.0.0}"
cd "$APP_DIR"; mkdir -p "$RUNTIME_DIR" "$LOG_DIR"

info() { echo -e "${BLUE}ℹ $*${NC}"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}" >&2; }
on_error() { local status="$1" line="$2"; fail "Command failed at line $line (exit $status). Check the message or relevant log above."; }
trap 'on_error "$?" "$LINENO"' ERR

validate_port() { local name="$1" value="$2"; [[ "$value" =~ ^[0-9]+$ ]] && (( value >= 1 && value <= 65535 )) || { fail "$name must be from 1 to 65535."; exit 2; }; }
validate_port PORT "$API_PORT"; validate_port DEV_PORT "$WEB_PORT"
[[ "$API_PORT" != "$WEB_PORT" ]] || { fail "PORT and DEV_PORT must be different."; exit 2; }
require_file() { [[ -f "$1" ]] || { fail "Required file not found: $1"; return 1; }; }
require_command() { command -v "$1" >/dev/null 2>&1 || { fail "Required command is not installed: $1"; return 1; }; }
ensure_env_file() { if [[ ! -f "$APP_DIR/.env" ]]; then require_file "$APP_DIR/.env.example"; cp "$APP_DIR/.env.example" "$APP_DIR/.env"; warn "Created .env from .env.example; review its secrets before production."; fi; }
require_node() { require_command node; require_command npm; require_file "$APP_DIR/package.json"; ensure_env_file; }
require_postgres_tools() { require_command systemctl; require_command pg_isready; }
parse_database_url() {
  local url="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/senganthal}"
  local userinfo host_port dbname
  local stripped="${url#*://}"
  userinfo="${stripped%%@*}"; stripped="${stripped#*@}"
  host_port="${stripped%%/*}"; stripped="${stripped#*/}"
  dbname="${stripped%%\?*}"
  DB_USER="${userinfo%%:*}"; DB_PASS="${userinfo#*:}"
  DB_HOST="${host_port%%:*}"; DB_PORT="${host_port##*:}"
  DB_NAME="${dbname:-senganthal}"
}
ensure_database() {
  parse_database_url
  if PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$DB_NAME"; then return 0; fi
  info "Creating PostgreSQL database '$DB_NAME'..."
  PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -c "CREATE DATABASE \"$DB_NAME\";" >/dev/null 2>&1 \
    || PGPASSWORD="$DB_PASS" createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME" \
    || { fail "Could not create database '$DB_NAME'. Create it manually: createdb -U $DB_USER $DB_NAME"; return 1; }
  success "Database '$DB_NAME' created."
}
run_privileged() { if (( EUID == 0 )); then "$@"; else require_command sudo; sudo "$@"; fi; }

read_pid() { local file="$1" pid=""; [[ -f "$file" ]] && IFS= read -r pid <"$file"; [[ "$pid" =~ ^[0-9]+$ ]] && printf '%s\n' "$pid"; }
pid_running() { [[ "$1" =~ ^[0-9]+$ ]] && kill -0 "$1" 2>/dev/null; }
pid_file_running() { local pid; pid="$(read_pid "$1" || true)"; [[ -n "$pid" ]] && pid_running "$pid"; }
process_description() { local pid="$1"; if [[ -r "/proc/$pid/cmdline" ]]; then tr '\0' ' ' <"/proc/$pid/cmdline"; else ps -p "$pid" -o command= 2>/dev/null || true; fi; }

http_check() {
  local port="$1" path="$2" timeout_seconds="${3:-2}"
  if command -v curl >/dev/null 2>&1; then
    curl --silent --show-error --fail --max-time "$timeout_seconds" "http://127.0.0.1:$port$path" >/dev/null 2>&1
  else
    node -e 'const h=require("node:http");const r=h.get({host:"127.0.0.1",port:+process.argv[1],path:process.argv[2],timeout:+process.argv[3]*1000},s=>{s.resume();process.exit(s.statusCode>=200&&s.statusCode<500?0:1)});r.on("timeout",()=>r.destroy());r.on("error",()=>process.exit(1));' "$port" "$path" "$timeout_seconds" >/dev/null 2>&1
  fi
}
api_healthy() { http_check "$API_PORT" /api/health 2; }
web_healthy() { http_check "$WEB_PORT" / 2; }
port_in_use() {
  if command -v lsof >/dev/null 2>&1; then lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then ss -ltn "sport = :$1" 2>/dev/null | tail -n +2 | grep -q .
  else node -e 'const n=require("node:net"),s=n.createServer();s.once("error",e=>process.exit(e.code==="EADDRINUSE"?0:2));s.listen(+process.argv[1],"127.0.0.1",()=>s.close(()=>process.exit(1)));' "$1"
  fi
}
show_port_owner() { if command -v lsof >/dev/null 2>&1; then lsof -nP -iTCP:"$1" -sTCP:LISTEN || true; elif command -v ss >/dev/null 2>&1; then ss -ltnp "sport = :$1" || true; fi; }
require_free_port() { if port_in_use "$1"; then fail "Port $1 is already in use."; show_port_owner "$1"; return 1; fi; }
wait_for_health() { local label="$1" attempts="$2" checker="$3" i; for ((i=1;i<=attempts;i++)); do "$checker" && { success "$label is healthy."; return 0; }; sleep 0.5; done; fail "$label did not become healthy in time."; return 1; }

stop_pid_file() {
  local label="$1" file="$2" pid; pid="$(read_pid "$file" || true)"
  if [[ -z "$pid" ]] || ! pid_running "$pid"; then rm -f "$file"; warn "$label is not running."; return 0; fi
  info "Stopping $label (PID $pid)..."; kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  for _ in {1..40}; do ! pid_running "$pid" && { rm -f "$file"; success "$label stopped."; return 0; }; sleep 0.25; done
  warn "$label did not stop gracefully; terminating it."; kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true; rm -f "$file"
}

print_header() { echo -e "${CYAN}======================================================================${NC}\n${GREEN}               Senganthal Services Management Menu${NC}\n${CYAN}======================================================================${NC}"; }

install_dependencies() { require_node; info "Installing locked Node.js dependencies..."; if [[ -f package-lock.json ]]; then npm ci; else npm install; fi; success "Dependencies installed."; }
check_app() { require_node; [[ -d node_modules ]] || install_dependencies; info "Running tests, TypeScript, and lint..."; npm test; npm run lint; npx tsc -b; success "Checks passed."; }
build_app() { require_node; [[ -d node_modules ]] || install_dependencies; info "Building frontend and backend..."; npm run build; require_file "$APP_DIR/dist/index.html"; require_file "$APP_DIR/server/dist/index.js"; success "Production build created."; }
clean_build() { info "Removing generated build output only..."; rm -rf -- "$APP_DIR/dist" "$APP_DIR/server/dist" "$APP_DIR/server/generated"; build_app; }

start_postgres() {
  require_postgres_tools
  if ! systemctl is-active --quiet postgresql; then info "Starting PostgreSQL system service..."; run_privileged systemctl start postgresql; fi
  local i; for i in {1..30}; do pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && { success "PostgreSQL is ready on port 5432."; return 0; }; sleep 1; done
  fail "PostgreSQL did not become ready."; systemctl status postgresql --no-pager || true; return 1
}
stop_postgres() { require_postgres_tools; run_privileged systemctl stop postgresql; success "PostgreSQL system service stopped."; }
postgres_status() {
  require_postgres_tools
  if systemctl is-active --quiet postgresql 2>/dev/null; then success "PostgreSQL system service is active."; else warn "PostgreSQL system service is inactive or unavailable."; fi
  pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && success "PostgreSQL accepts connections on port 5432." || { warn "PostgreSQL is not accepting connections on port 5432."; return 1; }
}

database_migrate() { require_node; [[ -d node_modules ]] || install_dependencies; ensure_database; info "Applying PostgreSQL migrations..."; npm run db:migrate; success "Migrations applied."; }
database_status() { require_node; [[ -d node_modules ]] || install_dependencies; ensure_database; npx prisma migrate status; }
database_seed() { require_node; [[ -d node_modules ]] || install_dependencies; info "Creating/updating the admin from .env..."; npm run db:seed; success "Admin seed completed."; }
database_setup() { start_postgres; ensure_database; database_migrate; database_seed; success "Database setup completed."; }
database_studio() { require_node; [[ -d node_modules ]] || install_dependencies; info "Opening Prisma Studio; Ctrl+C returns."; npx prisma studio; }
database_reset() { require_node; [[ -d node_modules ]] || install_dependencies; ensure_database; echo -e "${RED}This deletes all Senganthal database data.${NC}"; printf 'Type RESET to continue: '; local answer; IFS= read -r answer; [[ "$answer" == RESET ]] || { warn "Reset cancelled."; return 0; }; npx prisma migrate reset --force; database_seed; }

start_production() {
  require_node; pid_file_running "$PROD_PID_FILE" && { success "Production already runs (PID $(read_pid "$PROD_PID_FILE"))."; return 0; }
  require_command setsid; require_free_port "$API_PORT"
  [[ -f dist/index.html && -f server/dist/index.js ]] || build_app; : >"$PROD_LOG"; info "Starting production on port $API_PORT..."
  (cd "$APP_DIR"; nohup setsid env NODE_ENV=production PORT="$API_PORT" node server/dist/index.js >>"$PROD_LOG" 2>&1 & printf '%s\n' "$!" >"$PROD_PID_FILE")
  wait_for_health "Production application" 40 api_healthy && { success "Website: http://localhost:$API_PORT"; echo "Log: $PROD_LOG"; return 0; }
  tail -n 40 "$PROD_LOG" || true; stop_pid_file "production application" "$PROD_PID_FILE"; return 1
}
stop_production() { stop_pid_file "production application" "$PROD_PID_FILE"; }
production_status() { local pid; pid="$(read_pid "$PROD_PID_FILE" || true)"; if [[ -n "$pid" ]] && pid_running "$pid"; then echo "Process: running (PID $pid)"; echo "Command: $(process_description "$pid")"; api_healthy && { success "Health check passed at http://localhost:$API_PORT/api/health"; return 0; }; warn "Process runs but health failed."; return 1; fi; rm -f "$PROD_PID_FILE"; warn "Production is stopped."; return 1; }
production_logs() { touch "$PROD_LOG"; tail -n 150 -f "$PROD_LOG"; }

start_dev_backend() {
  require_node; [[ -d node_modules ]] || install_dependencies
  if pid_file_running "$DEV_API_PID_FILE"; then success "Development backend already runs (PID $(read_pid "$DEV_API_PID_FILE"))."; return 0; fi
  require_command setsid; require_free_port "$API_PORT"; : >"$DEV_API_LOG"
  info "Starting development backend on port $API_PORT..."
  (cd "$APP_DIR"; nohup setsid env NODE_ENV=development PORT="$API_PORT" npm run dev:server >>"$DEV_API_LOG" 2>&1 & printf '%s\n' "$!" >"$DEV_API_PID_FILE")
  wait_for_health "Development backend" 60 api_healthy || { tail -n 40 "$DEV_API_LOG" || true; stop_pid_file "development backend" "$DEV_API_PID_FILE"; return 1; }
  success "Backend API: http://localhost:$API_PORT/api"
}
stop_dev_backend() { stop_pid_file "development backend" "$DEV_API_PID_FILE"; }

start_dev_frontend() {
  require_node; [[ -d node_modules ]] || install_dependencies
  if pid_file_running "$DEV_WEB_PID_FILE"; then success "Development frontend already runs (PID $(read_pid "$DEV_WEB_PID_FILE"))."; return 0; fi
  require_command setsid; require_free_port "$WEB_PORT"; : >"$DEV_WEB_LOG"
  info "Starting development frontend on port $WEB_PORT..."
  (cd "$APP_DIR"; nohup setsid npm run dev -- --host "$HOST" --port "$WEB_PORT" >>"$DEV_WEB_LOG" 2>&1 & printf '%s\n' "$!" >"$DEV_WEB_PID_FILE")
  wait_for_health "Development frontend" 60 web_healthy || { tail -n 40 "$DEV_WEB_LOG" || true; stop_pid_file "development frontend" "$DEV_WEB_PID_FILE"; return 1; }
  success "Frontend: http://localhost:$WEB_PORT"
}
stop_dev_frontend() { stop_pid_file "development frontend" "$DEV_WEB_PID_FILE"; }

start_development() {
  require_node; [[ -d node_modules ]] || install_dependencies
  if pid_file_running "$DEV_API_PID_FILE" || pid_file_running "$DEV_WEB_PID_FILE"; then warn "Development services already run; stop them first."; return 1; fi
  start_dev_backend; start_dev_frontend
}
run_development_foreground() { require_node; [[ -d node_modules ]] || install_dependencies; info "Starting frontend and API; Ctrl+C stops them."; npm run dev:all; }
stop_development() { stop_dev_frontend; stop_dev_backend; }
development_status() {
  local failed=0
  if pid_file_running "$DEV_API_PID_FILE" && api_healthy; then success "Development backend healthy on port $API_PORT."; else warn "Development backend stopped/unhealthy."; failed=1; fi
  if pid_file_running "$DEV_WEB_PID_FILE" && web_healthy; then success "Development frontend healthy on port $WEB_PORT."; else warn "Development frontend stopped/unhealthy."; failed=1; fi
  return "$failed"
}
development_logs() { touch "$DEV_API_LOG" "$DEV_WEB_LOG"; tail -n 100 -f "$DEV_API_LOG" "$DEV_WEB_LOG"; }

pm2_start() {
  require_command pm2; [[ -f server/dist/index.js && -f dist/index.html ]] || build_app
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    NODE_ENV=production PORT="$API_PORT" pm2 restart "$PM2_NAME" --update-env
  else
    require_free_port "$API_PORT"
    NODE_ENV=production PORT="$API_PORT" pm2 start "$APP_DIR/server/dist/index.js" --cwd "$APP_DIR" --name "$PM2_NAME" --update-env
  fi
  wait_for_health "PM2 production application" 40 api_healthy || { pm2 logs "$PM2_NAME" --lines 50 --nostream || true; return 1; }
  pm2 save; success "PM2 service started: $PM2_NAME"
}
pm2_stop() { require_command pm2; pm2 delete "$PM2_NAME" 2>/dev/null || warn "PM2 service was not running."; pm2 save --force >/dev/null 2>&1 || true; }
pm2_status() { require_command pm2; pm2 show "$PM2_NAME" || pm2 status; }
pm2_logs() { require_command pm2; pm2 logs "$PM2_NAME" --lines 150; }
stop_pm2_if_available() { command -v pm2 >/dev/null 2>&1 && { pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true; pm2 save --force >/dev/null 2>&1 || true; }; return 0; }
start_nohup_mode() { stop_development || true; stop_pm2_if_available; start_production; }
start_pm2_mode() { stop_development || true; stop_production || true; pm2_start; }

smoke_test() { require_node; info "Running full API smoke test..."; npm run smoke; }
quick_nohup_flow() { stop_development || true; stop_production || true; stop_pm2_if_available; start_postgres; install_dependencies; database_migrate; database_seed; build_app; start_production; smoke_test; success "Quick nohup deployment completed."; }
quick_pm2_flow() { stop_development || true; stop_production || true; stop_pm2_if_available; start_postgres; install_dependencies; database_migrate; database_seed; build_app; pm2_start; smoke_test; success "Quick PM2 deployment completed."; }
install_and_build() { install_dependencies; build_app; }
rebuild_nohup() { stop_development || true; stop_production || true; stop_pm2_if_available; clean_build; start_production; }
deploy_nohup() { install_dependencies; check_app; database_migrate; build_app; stop_development || true; stop_production || true; stop_pm2_if_available; start_production; }

show_disk() { df -h "$APP_DIR"; echo; du -sh "$APP_DIR" "$APP_DIR/node_modules" "$APP_DIR/server/uploads" 2>/dev/null || true; }
show_memory() { command -v free >/dev/null 2>&1 && free -h; echo; ps -eo pid,ppid,%mem,rss,command --sort=-rss | head -20; }
show_all_status() {
  print_header
  echo -e "${CYAN}Production:${NC}"; production_status || true
  echo -e "\n${CYAN}Development:${NC}"; development_status || true
  echo -e "\n${CYAN}PM2:${NC}"
  if command -v pm2 >/dev/null 2>&1 && pm2 describe "$PM2_NAME" >/dev/null 2>&1; then pm2 show "$PM2_NAME"; else echo "PM2 service is not installed, registered, or reachable."; fi
  echo -e "\n${CYAN}PostgreSQL:${NC}"; postgres_status || true
}

usage() { cat <<'EOF'
Usage: ./manage-service.sh [command]

App:  install, install-build, check, build, clean-build, rebuild, start, stop,
      restart, status, logs, deploy, quick, smoke
Dev:  dev, dev-start, dev-stop, dev-status, dev-logs
      dev-start-frontend, dev-stop-frontend
      dev-start-backend, dev-stop-backend
DB:   db-start, db-stop, postgres-status, db-create, db-status, db-setup,
      db-migrate, db-migration-status, db-seed, db-studio, db-reset
PM2:  pm2-start, pm2-stop, pm2-status, pm2-logs, pm2-quick
Monitoring: disk, memory

Without a command, the interactive services menu opens.
EOF
}

print_menu() {
  if [[ -t 1 && -n "${TERM:-}" ]] && command -v clear >/dev/null 2>&1; then clear; fi
  print_header
  cat <<EOF

${YELLOW}Sec A: Local Environment Setup (application will run as a service):${NC}
  1. Build Services (install dependencies + production build)
  1a. Rebuild All (stop all → clean build → start nohup)
  2. Start PostgreSQL (System Service)
  3. Clean Database (destructive; confirmation required)
  4. Setup Database (start → migrate → seed)
  4a. Open Prisma Studio
  5. Migrate Database                    5a. Check Migration Status
  6. Start Services — nohup
  6a. Quick nohup: DB→install→migrate→seed→build→start→smoke
  7. Stop Services — nohup               8. Service Status
  9. Start Services — PM2                9a. Quick PM2 full flow
 10. Stop Services — PM2                11. Service Status (PM2)

${YELLOW}Sec D: Development:${NC}
 20. Start Frontend + Backend (background)   21. Stop Frontend + Backend
 22. Development Status                     23. Development Logs
 24. Full API Smoke Test                    25. Run Both (foreground)
 26. Start Frontend only                    27. Stop Frontend only
 28. Start Backend only                     29. Stop Backend only

${YELLOW}Sec E: Database & PostgreSQL Operations:${NC}
 80. Start PostgreSQL                    81. Stop PostgreSQL
 82. PostgreSQL Status                   83. Create Database
 84. Clean Database
 85. Setup Database                      86. Migrate Database
 87. Seed Admin                          88. Migration Status

${YELLOW}Sec F: System Monitoring & Health:${NC}
100. Show Disk Space Usage              101. Show RAM / Top Processes
102. PostgreSQL Status                  103. Tail Service Logs (nohup)
104. Tail Service Logs (PM2)

${RED}  0. Exit${NC}
${CYAN}======================================================================${NC}
EOF
}

interactive_menu() {
  local choice action
  while true; do
    print_menu; printf '\nChoose an option: '; IFS= read -r choice || { echo; return; }
    case "$choice" in
      1) action=install-build;; 1a) action=rebuild;;
      2|80) action=db-start;; 3|84) action=db-reset;; 4|85) action=db-setup;; 4a) action=db-studio;; 5|86) action=db-migrate;; 5a|88) action=db-migration-status;;
      6) action=start;; 6a) action=quick;; 7) action=stop;; 8) action=status;; 9) action=pm2-start;; 9a) action=pm2-quick;; 10) action=pm2-stop;; 11) action=pm2-status;;
      20) action=dev-start;; 21) action=dev-stop;; 22) action=dev-status;; 23) action=dev-logs;; 24) action=smoke;; 25) action=dev;;
      26) action=dev-start-frontend;; 27) action=dev-stop-frontend;; 28) action=dev-start-backend;; 29) action=dev-stop-backend;;
      81) action=db-stop;; 82|102) action=postgres-status;; 83) action=db-create;; 87) action=db-seed;;
      100) action=disk;; 101) action=memory;; 103) action=logs;; 104) action=pm2-logs;;
      0) success "Goodbye."; return;; *) warn "Invalid option: $choice"; action="";;
    esac
    if [[ -n "$action" ]] && ! "$APP_DIR/manage-service.sh" "$action"; then warn "Action '$action' failed. Review the error above; the menu will remain available."; fi
    echo; read -r -p "Press Enter to return to the menu..." _ || true
  done
}

case "${1:-menu}" in
  menu) interactive_menu;; install) install_dependencies;; install-build) install_and_build;; check) check_app;; build) build_app;; clean-build) clean_build;; rebuild) rebuild_nohup;;
  start) start_nohup_mode;; stop) stop_production;; restart) stop_production; start_nohup_mode;; status) show_all_status;; logs) production_logs;; deploy) deploy_nohup;; quick) quick_nohup_flow;; smoke) smoke_test;;
  dev) run_development_foreground;; dev-start) start_development;; dev-stop) stop_development;; dev-status) development_status;; dev-logs) development_logs;;
  dev-start-frontend) start_dev_frontend;; dev-stop-frontend) stop_dev_frontend;; dev-start-backend) start_dev_backend;; dev-stop-backend) stop_dev_backend;;
  db-start) start_postgres;; db-stop) stop_postgres;; postgres-status) postgres_status;; db-create) start_postgres; ensure_database;; db-status) postgres_status; database_status;; db-setup) database_setup;; db-migrate) database_migrate;; db-migration-status) database_status;; db-seed) database_seed;; db-studio) database_studio;; db-reset) database_reset;;
  pm2-start) start_pm2_mode;; pm2-stop) pm2_stop;; pm2-status) pm2_status;; pm2-logs) pm2_logs;; pm2-quick) quick_pm2_flow;;
  disk) show_disk;; memory) show_memory;; help|-h|--help) usage;; *) fail "Unknown command: $1"; usage >&2; exit 2;;
esac
