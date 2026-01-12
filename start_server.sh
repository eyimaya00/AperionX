#!/bin/bash

# 1. Load NVM (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. Use default node version
nvm use default

# 3. Verify Node
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Install dependencies if missing (just in case)
# npm install

# 5. Run Migration (Fix Usernames)
echo "Running Migration..."
node force_migration.js

# 6. Kill Old Server (Forcefully)
echo "Stopping old processes..."
pkill -f server.js
pkill -f "node server.js"

# 7. Start Server with Nohup
echo "Starting Server..."
nohup node server.js > output.log 2>&1 &

echo "=========================================="
echo "SERVER STARTED SUCCESSFULLY! 🚀"
echo "Check output.log for details."
echo "PID: $!"
echo "=========================================="
