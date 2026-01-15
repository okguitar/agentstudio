"""SQLAlchemy database models"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.sql import func
from .database import Base


class Tunnel(Base):
    """Tunnel records tracking Cloudflare tunnels and DNS records"""

    __tablename__ = "tunnels"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Subdomain information
    subdomain = Column(String(100), unique=True, nullable=False, index=True)

    # Cloudflare Tunnel details
    tunnel_id = Column(String(200), unique=True, nullable=False, index=True)
    tunnel_name = Column(String(200), nullable=False)
    tunnel_secret = Column(Text, nullable=False)  # Consider encryption in production

    # DNS record information
    dns_record_id = Column(String(200), nullable=True, index=True)

    # Public URL
    public_url = Column(String(500), nullable=False)

    # Local configuration
    local_port = Column(Integer, nullable=False, default=4936)

    # Metadata
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active", index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Indexes for common queries
    __table_args__ = (
        Index('idx_status_created', 'status', 'created_at'),
    )

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "subdomain": self.subdomain,
            "tunnelId": self.tunnel_id,
            "tunnelName": self.tunnel_name,
            "dnsRecordId": self.dns_record_id,
            "publicUrl": self.public_url,
            "localPort": self.local_port,
            "description": self.description,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
