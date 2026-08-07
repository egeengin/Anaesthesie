#!/bin/bash
# Automatic Background Security Log Syncer
# Fetches live cloud security logs and updates access_security_audit.log every 15 minutes

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"
python3 view_login_logs.py > /dev/null 2>&1
