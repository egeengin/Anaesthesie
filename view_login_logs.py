#!/usr/bin/env python3
"""
Facharzt Anästhesiologie - Security & Login Access Audit Log Viewer
Run this script anytime in terminal to view all IP addresses, cities, countries, and login attempts:
  python3 view_login_logs.py
"""

import urllib.request
import json
import sys
import ssl

LOG_ENDPOINT = "https://api.restful-api.dev/objects/ff8081819f7e10ae019fdac6f09e07e8"

def fetch_logs():
    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(LOG_ENDPOINT, headers={"User-Agent": "SecurityLogViewer/1.0"})
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and 'data' in data and 'logs' in data['data']:
                return data['data']['logs']
            return []
    except Exception as e:
        print(f"❌ Error fetching audit logs: {e}")
        return []

def main():
    logs = fetch_logs()
    print("=" * 115)
    print("🔒 FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - ACCESS & LOGIN SECURITY AUDIT LOGS")
    print("=" * 115)
    print(f"Total Recorded Access Entries: {len(logs)}\n")
    
    if not logs:
        print("No access logs recorded yet.")
        return

    # Header
    print(f"{'TIMESTAMP (UTC)':<20} | {'IP ADDRESS':<16} | {'LOCATION':<22} | {'ISP / NETWORK':<20} | {'STATUS':<12} | {'DEVICE / BROWSER'}")
    print("-" * 115)

    for entry in reversed(logs):
        ts = entry.get('timestamp', 'N/A')[:19].replace('T', ' ')
        ip = entry.get('ip', 'Unknown')
        city = entry.get('city', '')
        country = entry.get('country', '')
        loc = f"{city}, {country}" if city and country else (city or country or 'Unknown')
        isp = entry.get('isp', 'Unknown')[:18]
        status = entry.get('status', 'ACCESS')
        
        status_display = "✅ SUCCESS" if "SUCCESS" in status else f"❌ {status}"
        device = entry.get('device', 'Browser')[:25]
        
        print(f"{ts:<20} | {ip:<16} | {loc:<22} | {isp:<20} | {status_display:<12} | {device}")

    print("=" * 115)

if __name__ == "__main__":
    main()
