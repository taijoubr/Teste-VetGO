import enum
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Float, Numeric, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class InventoryItemType(str, enum.Enum):
    MEDICAMENTO = "MEDICAMENTO"
    PRODUTO = "PRODUTO"

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    item_type = Column(SQLEnum(InventoryItemType), default=InventoryItemType.MEDICAMENTO, nullable=False)
    name = Column(String(150), nullable=False, index=True)
    active_ingredient = Column(String(150), nullable=True) # Princípio ativo
    presentation = Column(String(100), nullable=True)     # Apresentação (ex: Frasco 10ml, Comprimidos)
    concentration = Column(String(100), nullable=True)    # Concentração (ex: 50mg/ml)
    manufacturer = Column(String(100), nullable=True)     # Fabricante / Laboratório
    unit = Column(String(30), default="un", nullable=False) # un, ml, cx, ampola
    
    stock_quantity = Column(Float, default=0.0, nullable=False)
    min_stock = Column(Float, default=5.0, nullable=False)
    cost_price = Column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    sale_price = Column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    supplier_name = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="inventory_items")
