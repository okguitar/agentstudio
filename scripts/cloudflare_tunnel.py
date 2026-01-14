#!/usr/bin/env python3
"""
Cloudflare Tunnel Management Script
Provides API to create, manage, and delete Cloudflare Tunnels dynamically
"""

import os
import sys
import json
import random
import string
import requests
from typing import Optional, Dict, Any
from datetime import datetime


class CloudflareTunnelManager:
    """Manages Cloudflare Tunnels via API"""

    def __init__(self, api_token: str, account_id: str, zone_id: Optional[str] = None):
        """
        Initialize Cloudflare Tunnel Manager

        Args:
            api_token: Cloudflare API Token with Tunnel permissions
            account_id: Cloudflare Account ID
            zone_id: Optional Zone ID for custom domains
        """
        self.api_token = api_token
        self.account_id = account_id
        self.zone_id = zone_id
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Cloudflare API"""
        url = f"{self.base_url}{endpoint}"

        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method == "PUT":
                response = requests.put(url, headers=self.headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            result = response.json()

            if not result.get("success"):
                errors = result.get("errors", [])
                error_msg = errors[0].get("message") if errors else "Unknown error"
                raise Exception(f"Cloudflare API Error: {error_msg}")

            return result
        except requests.exceptions.RequestException as e:
            raise Exception(f"HTTP Request failed: {str(e)}")

    def generate_tunnel_name(self, prefix: str = "agentstudio") -> str:
        """Generate a random tunnel name"""
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"{prefix}-{random_suffix}"

    def create_tunnel(
        self,
        tunnel_name: Optional[str] = None,
        tunnel_secret: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new Cloudflare Tunnel

        Args:
            tunnel_name: Optional custom tunnel name (auto-generated if not provided)
            tunnel_secret: Optional tunnel secret (auto-generated if not provided)

        Returns:
            Dict containing tunnel details including ID and credentials
        """
        if not tunnel_name:
            tunnel_name = self.generate_tunnel_name()

        if not tunnel_secret:
            # Generate a 32-byte random secret
            tunnel_secret = ''.join(random.choices(
                string.ascii_letters + string.digits,
                k=32
            ))

        endpoint = f"/accounts/{self.account_id}/cfd_tunnel"
        data = {
            "name": tunnel_name,
            "tunnel_secret": tunnel_secret,
            "config_src": "cloudflare"
        }

        result = self._make_request("POST", endpoint, data)
        tunnel_data = result.get("result", {})

        return {
            "tunnel_id": tunnel_data.get("id"),
            "tunnel_name": tunnel_data.get("name"),
            "tunnel_secret": tunnel_secret,
            "created_at": tunnel_data.get("created_at"),
            "account_tag": tunnel_data.get("account_tag")
        }

    def get_tunnel(self, tunnel_id: str) -> Dict[str, Any]:
        """Get tunnel details by ID"""
        endpoint = f"/accounts/{self.account_id}/cfd_tunnel/{tunnel_id}"
        result = self._make_request("GET", endpoint)
        return result.get("result", {})

    def list_tunnels(self) -> list:
        """List all tunnels in the account"""
        endpoint = f"/accounts/{self.account_id}/cfd_tunnel"
        result = self._make_request("GET", endpoint)
        return result.get("result", [])

    def delete_tunnel(self, tunnel_id: str) -> bool:
        """Delete a tunnel by ID"""
        endpoint = f"/accounts/{self.account_id}/cfd_tunnel/{tunnel_id}"
        self._make_request("DELETE", endpoint)
        return True

    def create_dns_route(
        self,
        tunnel_id: str,
        hostname: str,
        service_url: str = "http://localhost:4936"
    ) -> Dict[str, Any]:
        """
        Create DNS route for tunnel with a specific hostname

        Args:
            tunnel_id: Tunnel ID
            hostname: Full hostname (e.g., "myapp.example.com")
            service_url: Local service URL to proxy (default: http://localhost:4936)

        Returns:
            Dict containing route details
        """
        endpoint = f"/accounts/{self.account_id}/cfd_tunnel/{tunnel_id}/configurations"

        config = {
            "config": {
                "ingress": [
                    {
                        "hostname": hostname,
                        "service": service_url,
                        "originRequest": {
                            "noTLSVerify": True
                        }
                    },
                    {
                        "service": "http_status:404"
                    }
                ]
            }
        }

        result = self._make_request("PUT", endpoint, config)
        return result.get("result", {})

    def get_tunnel_token(self, tunnel_id: str, tunnel_secret: str) -> str:
        """
        Generate tunnel token for cloudflared CLI

        Args:
            tunnel_id: Tunnel ID
            tunnel_secret: Tunnel secret

        Returns:
            Base64-encoded tunnel token
        """
        import base64

        token_data = {
            "a": self.account_id,
            "t": tunnel_id,
            "s": tunnel_secret
        }

        token_json = json.dumps(token_data)
        token_bytes = token_json.encode('utf-8')
        token_b64 = base64.b64encode(token_bytes).decode('utf-8')

        return token_b64

    def create_quick_tunnel(
        self,
        subdomain: Optional[str] = None,
        local_port: int = 4936
    ) -> Dict[str, Any]:
        """
        Quick setup: Create tunnel + generate trycloudflare.com subdomain

        Args:
            subdomain: Optional custom subdomain prefix
            local_port: Local port to expose (default: 4936)

        Returns:
            Dict with tunnel details and public URL
        """
        # Step 1: Create tunnel
        tunnel_name = subdomain if subdomain else None
        tunnel_info = self.create_tunnel(tunnel_name=tunnel_name)

        tunnel_id = tunnel_info["tunnel_id"]
        tunnel_secret = tunnel_info["tunnel_secret"]

        # Step 2: Generate public hostname (trycloudflare.com subdomain)
        # Note: Cloudflare auto-generates .trycloudflare.com URLs when using quick tunnels
        # For production, you'd use a custom domain with DNS routes

        tunnel_token = self.get_tunnel_token(tunnel_id, tunnel_secret)

        return {
            "success": True,
            "tunnel_id": tunnel_id,
            "tunnel_name": tunnel_info["tunnel_name"],
            "tunnel_token": tunnel_token,
            "local_url": f"http://localhost:{local_port}",
            "public_url": f"https://{tunnel_info['tunnel_name']}.trycloudflare.com",
            "created_at": tunnel_info["created_at"],
            "instructions": {
                "cli": f"cloudflared tunnel run --token {tunnel_token}",
                "docker": f"docker run cloudflare/cloudflared:latest tunnel run --token {tunnel_token}"
            }
        }


def main():
    """CLI interface for tunnel management"""
    import argparse

    parser = argparse.ArgumentParser(description="Cloudflare Tunnel Manager")
    parser.add_argument("--api-token", required=True, help="Cloudflare API Token")
    parser.add_argument("--account-id", required=True, help="Cloudflare Account ID")
    parser.add_argument("--action", required=True,
                       choices=["create", "list", "delete", "quick"],
                       help="Action to perform")
    parser.add_argument("--tunnel-id", help="Tunnel ID (for delete action)")
    parser.add_argument("--subdomain", help="Custom subdomain prefix")
    parser.add_argument("--local-port", type=int, default=4936,
                       help="Local port to expose (default: 4936)")

    args = parser.parse_args()

    manager = CloudflareTunnelManager(args.api_token, args.account_id)

    try:
        if args.action == "create":
            result = manager.create_tunnel(tunnel_name=args.subdomain)
            print(json.dumps(result, indent=2))

        elif args.action == "list":
            result = manager.list_tunnels()
            print(json.dumps(result, indent=2))

        elif args.action == "delete":
            if not args.tunnel_id:
                print("Error: --tunnel-id required for delete action", file=sys.stderr)
                sys.exit(1)
            manager.delete_tunnel(args.tunnel_id)
            print(f"Tunnel {args.tunnel_id} deleted successfully")

        elif args.action == "quick":
            result = manager.create_quick_tunnel(
                subdomain=args.subdomain,
                local_port=args.local_port
            )
            print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
