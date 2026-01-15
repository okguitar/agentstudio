"""FastAPI application for Cloudflare subdomain proxy service"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .database import get_db, init_db
from .models import Tunnel
from .cloudflare_manager import CloudflareManager
from .auth import validate_api_key
from .config import settings

# Initialize FastAPI app
app = FastAPI(
    title="Cloudflare Subdomain Proxy Service",
    description="Centralized service for managing Cloudflare Tunnel subdomains",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables"""
    init_db()


# Pydantic models for request/response
class CreateSubdomainRequest(BaseModel):
    """Request model for creating subdomain"""
    subdomain: Optional[str] = Field(None, description="Subdomain prefix (auto-generated if not provided)")
    localPort: int = Field(4936, description="Local port to expose", ge=1, le=65535)
    description: Optional[str] = Field(None, description="Optional description")


class SubdomainResponse(BaseModel):
    """Response model for subdomain information"""
    success: bool
    subdomain: str
    publicUrl: str
    tunnelId: str
    tunnelToken: str
    createdAt: str
    instructions: dict


class CheckSubdomainResponse(BaseModel):
    """Response model for subdomain availability check"""
    subdomain: str
    available: bool
    message: str


class DeleteSubdomainResponse(BaseModel):
    """Response model for subdomain deletion"""
    success: bool
    message: str


class TunnelListItem(BaseModel):
    """Model for tunnel list item"""
    subdomain: str
    publicUrl: str
    tunnelId: str
    createdAt: str
    status: str


class ListSubdomainsResponse(BaseModel):
    """Response model for subdomain list"""
    success: bool
    subdomains: List[TunnelListItem]


# API Endpoints

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Cloudflare Subdomain Proxy",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/api/subdomain/create", response_model=SubdomainResponse)
async def create_subdomain(
    request: CreateSubdomainRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(validate_api_key)
):
    """
    Create a new subdomain with Cloudflare Tunnel

    - **subdomain**: Optional subdomain prefix (auto-generated if not provided)
    - **localPort**: Local port to expose (default: 4936)
    - **description**: Optional description
    """
    try:
        # Check if subdomain already exists in database
        if request.subdomain:
            existing = db.query(Tunnel).filter(
                Tunnel.subdomain == request.subdomain,
                Tunnel.status == "active"
            ).first()

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Subdomain '{request.subdomain}' is already taken"
                )

        # Create subdomain setup via Cloudflare
        cf_manager = CloudflareManager()
        result = cf_manager.create_full_subdomain_setup(
            subdomain=request.subdomain,
            local_port=request.localPort,
            description=request.description
        )

        # Save to database
        tunnel = Tunnel(
            subdomain=result["subdomain"],
            tunnel_id=result["tunnel_id"],
            tunnel_name=result["tunnel_name"],
            tunnel_secret=result["tunnel_secret"],
            dns_record_id=result["dns_record_id"],
            public_url=result["public_url"],
            local_port=request.localPort,
            description=request.description,
            status="active"
        )
        db.add(tunnel)
        db.commit()
        db.refresh(tunnel)

        return SubdomainResponse(
            success=True,
            subdomain=result["subdomain"],
            publicUrl=result["public_url"],
            tunnelId=result["tunnel_id"],
            tunnelToken=result["tunnel_token"],
            createdAt=result["created_at"],
            instructions=result["instructions"]
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subdomain: {str(e)}"
        )


@app.get("/api/subdomain/check/{subdomain}", response_model=CheckSubdomainResponse)
async def check_subdomain(
    subdomain: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(validate_api_key)
):
    """
    Check if a subdomain is available

    - **subdomain**: Subdomain to check
    """
    try:
        # Check database
        existing = db.query(Tunnel).filter(
            Tunnel.subdomain == subdomain,
            Tunnel.status == "active"
        ).first()

        if existing:
            return CheckSubdomainResponse(
                subdomain=subdomain,
                available=False,
                message="Subdomain is already taken"
            )

        # Also check Cloudflare DNS
        cf_manager = CloudflareManager()
        dns_exists = cf_manager.check_dns_record_exists(subdomain)

        if dns_exists:
            return CheckSubdomainResponse(
                subdomain=subdomain,
                available=False,
                message="Subdomain exists in DNS but not in database (may be orphaned)"
            )

        return CheckSubdomainResponse(
            subdomain=subdomain,
            available=True,
            message="Subdomain is available"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check subdomain: {str(e)}"
        )


@app.delete("/api/subdomain/{subdomain}", response_model=DeleteSubdomainResponse)
async def delete_subdomain(
    subdomain: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(validate_api_key)
):
    """
    Delete a subdomain and its associated tunnel

    - **subdomain**: Subdomain to delete
    """
    try:
        # Find tunnel in database
        tunnel = db.query(Tunnel).filter(
            Tunnel.subdomain == subdomain,
            Tunnel.status == "active"
        ).first()

        if not tunnel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subdomain '{subdomain}' not found"
            )

        # Delete from Cloudflare
        cf_manager = CloudflareManager()
        cf_manager.cleanup_subdomain(
            tunnel_id=tunnel.tunnel_id,
            dns_record_id=tunnel.dns_record_id
        )

        # Mark as deleted in database (soft delete)
        tunnel.status = "deleted"
        db.commit()

        return DeleteSubdomainResponse(
            success=True,
            message=f"Subdomain '{subdomain}' deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete subdomain: {str(e)}"
        )


@app.get("/api/subdomain/list", response_model=ListSubdomainsResponse)
async def list_subdomains(
    status_filter: Optional[str] = "active",
    limit: int = 100,
    db: Session = Depends(get_db),
    api_key: str = Depends(validate_api_key)
):
    """
    List all subdomains

    - **status_filter**: Filter by status (active/deleted/all)
    - **limit**: Maximum number of results
    """
    try:
        query = db.query(Tunnel)

        if status_filter and status_filter != "all":
            query = query.filter(Tunnel.status == status_filter)

        tunnels = query.order_by(Tunnel.created_at.desc()).limit(limit).all()

        subdomain_list = [
            TunnelListItem(
                subdomain=t.subdomain,
                publicUrl=t.public_url,
                tunnelId=t.tunnel_id,
                createdAt=t.created_at.isoformat() if t.created_at else "",
                status=t.status
            )
            for t in tunnels
        ]

        return ListSubdomainsResponse(
            success=True,
            subdomains=subdomain_list
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list subdomains: {str(e)}"
        )


@app.get("/api/subdomain/{subdomain}")
async def get_subdomain_details(
    subdomain: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(validate_api_key)
):
    """
    Get detailed information about a subdomain

    - **subdomain**: Subdomain to query
    """
    try:
        tunnel = db.query(Tunnel).filter(Tunnel.subdomain == subdomain).first()

        if not tunnel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subdomain '{subdomain}' not found"
            )

        return {
            "success": True,
            "subdomain": tunnel.to_dict()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subdomain details: {str(e)}"
        )
