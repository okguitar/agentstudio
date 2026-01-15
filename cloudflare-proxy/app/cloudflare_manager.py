"""Enhanced Cloudflare Tunnel Manager with DNS record management"""

import json
import random
import string
import base64
import requests
from typing import Optional, Dict, Any
from .config import settings


class CloudflareManager:
    """Manages Cloudflare Tunnels and DNS records via API"""

    def __init__(self):
        """Initialize Cloudflare Manager with settings"""
        self.api_token = settings.cloudflare_api_token
        self.account_id = settings.cloudflare_account_id
        self.zone_id = settings.cloudflare_zone_id
        self.parent_domain = settings.parent_domain
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Cloudflare API"""
        url = f"{self.base_url}{endpoint}"

        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers, params=params)
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

    def generate_subdomain(self, prefix: str = "agent") -> str:
        """Generate a random subdomain"""
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"{prefix}-{random_suffix}"

    def create_tunnel(
        self,
        tunnel_name: str,
        tunnel_secret: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new Cloudflare Tunnel

        Args:
            tunnel_name: Tunnel name (usually same as subdomain)
            tunnel_secret: Optional tunnel secret (auto-generated if not provided)

        Returns:
            Dict containing tunnel details
        """
        if not tunnel_secret:
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
        }

    def delete_tunnel(self, tunnel_id: str) -> bool:
        """Delete a tunnel by ID"""
        endpoint = f"/accounts/{self.account_id}/cfd_tunnel/{tunnel_id}"
        self._make_request("DELETE", endpoint)
        return True

    def create_dns_record(
        self,
        subdomain: str,
        tunnel_id: str
    ) -> Dict[str, Any]:
        """
        Create a CNAME DNS record pointing to the Cloudflare Tunnel

        Args:
            subdomain: Subdomain prefix (e.g., "user123")
            tunnel_id: Cloudflare Tunnel ID

        Returns:
            Dict containing DNS record details
        """
        endpoint = f"/zones/{self.zone_id}/dns_records"

        # Cloudflare Tunnel target format
        tunnel_target = f"{tunnel_id}.cfargotunnel.com"

        data = {
            "type": "CNAME",
            "name": subdomain,  # Just the subdomain part
            "content": tunnel_target,
            "ttl": 1,  # Auto TTL
            "proxied": True,  # Enable Cloudflare proxy
            "comment": f"Managed by Cloudflare Proxy Service"
        }

        result = self._make_request("POST", endpoint, data)
        record_data = result.get("result", {})

        return {
            "dns_record_id": record_data.get("id"),
            "name": record_data.get("name"),
            "content": record_data.get("content"),
            "proxied": record_data.get("proxied"),
        }

    def delete_dns_record(self, dns_record_id: str) -> bool:
        """Delete a DNS record by ID"""
        endpoint = f"/zones/{self.zone_id}/dns_records/{dns_record_id}"
        self._make_request("DELETE", endpoint)
        return True

    def check_dns_record_exists(self, subdomain: str) -> bool:
        """
        Check if a DNS record already exists for the subdomain

        Args:
            subdomain: Subdomain to check

        Returns:
            True if exists, False otherwise
        """
        endpoint = f"/zones/{self.zone_id}/dns_records"
        params = {
            "type": "CNAME",
            "name": f"{subdomain}.{self.parent_domain}"
        }

        try:
            result = self._make_request("GET", endpoint, params=params)
            records = result.get("result", [])
            return len(records) > 0
        except Exception:
            return False

    def configure_tunnel_route(
        self,
        tunnel_id: str,
        hostname: str,
        local_port: int = 4936
    ) -> Dict[str, Any]:
        """
        Configure tunnel routing to local service

        Args:
            tunnel_id: Tunnel ID
            hostname: Full hostname (e.g., "user123.agentstudio.cc")
            local_port: Local port to route to

        Returns:
            Dict containing configuration details
        """
        endpoint = f"/accounts/{self.account_id}/cfd_tunnel/{tunnel_id}/configurations"

        config = {
            "config": {
                "ingress": [
                    {
                        "hostname": hostname,
                        "service": f"http://localhost:{local_port}",
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
        token_data = {
            "a": self.account_id,
            "t": tunnel_id,
            "s": tunnel_secret
        }

        token_json = json.dumps(token_data)
        token_bytes = token_json.encode('utf-8')
        token_b64 = base64.b64encode(token_bytes).decode('utf-8')

        return token_b64

    def create_full_subdomain_setup(
        self,
        subdomain: Optional[str] = None,
        local_port: int = 4936,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Complete setup: Create tunnel + DNS record + configuration

        Args:
            subdomain: Optional subdomain (auto-generated if not provided)
            local_port: Local port to expose
            description: Optional description

        Returns:
            Dict with all setup details
        """
        # Step 1: Generate or validate subdomain
        if not subdomain:
            subdomain = self.generate_subdomain()

        # Step 2: Check if subdomain is available
        if self.check_dns_record_exists(subdomain):
            raise Exception(f"Subdomain '{subdomain}' is already taken")

        # Step 3: Create Cloudflare Tunnel
        tunnel_info = self.create_tunnel(tunnel_name=subdomain)
        tunnel_id = tunnel_info["tunnel_id"]
        tunnel_secret = tunnel_info["tunnel_secret"]

        try:
            # Step 4: Create DNS record
            full_hostname = f"{subdomain}.{self.parent_domain}"
            dns_info = self.create_dns_record(subdomain, tunnel_id)

            # Step 5: Configure tunnel routing
            self.configure_tunnel_route(tunnel_id, full_hostname, local_port)

            # Step 6: Generate tunnel token
            tunnel_token = self.get_tunnel_token(tunnel_id, tunnel_secret)

            return {
                "success": True,
                "subdomain": subdomain,
                "tunnel_id": tunnel_id,
                "tunnel_name": tunnel_info["tunnel_name"],
                "tunnel_secret": tunnel_secret,
                "dns_record_id": dns_info["dns_record_id"],
                "public_url": f"https://{full_hostname}",
                "local_port": local_port,
                "tunnel_token": tunnel_token,
                "created_at": tunnel_info["created_at"],
                "instructions": {
                    "cli": f"cloudflared tunnel run --token {tunnel_token}",
                    "docker": f"docker run -d cloudflare/cloudflared:latest tunnel run --token {tunnel_token}"
                }
            }

        except Exception as e:
            # Rollback: Delete tunnel if DNS/config failed
            try:
                self.delete_tunnel(tunnel_id)
            except Exception:
                pass
            raise e

    def cleanup_subdomain(self, tunnel_id: str, dns_record_id: Optional[str] = None) -> bool:
        """
        Clean up tunnel and DNS record

        Args:
            tunnel_id: Tunnel ID to delete
            dns_record_id: Optional DNS record ID to delete

        Returns:
            True if successful
        """
        success = True

        # Delete DNS record first
        if dns_record_id:
            try:
                self.delete_dns_record(dns_record_id)
            except Exception as e:
                print(f"Warning: Failed to delete DNS record: {e}")
                success = False

        # Delete tunnel
        try:
            self.delete_tunnel(tunnel_id)
        except Exception as e:
            print(f"Warning: Failed to delete tunnel: {e}")
            success = False

        return success
