"""Pytest configuration and fixtures"""

import pytest
import os

# Set test environment variables
os.environ["API_KEYS"] = "test-key-12345"
os.environ["CLOUDFLARE_API_TOKEN"] = "test-token"
os.environ["CLOUDFLARE_ACCOUNT_ID"] = "test-account"
os.environ["CLOUDFLARE_ZONE_ID"] = "test-zone"
os.environ["PARENT_DOMAIN"] = "test.example.com"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
