import enum
from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class FinancialType(str, enum.Enum):
    RECEITA = "RECEITA"
    DESPESA = "DESPESA"

class FinancialCategory(str, enum.Enum):
    # Receitas
    CONSULTA = "Consulta"
    PROCEDIMENTO = "Procedimento"
    VACINA = "Vacina"
    EXAME = "Exame"
    VENDA_PRODUTO = "Venda de Produto"
    OUTRA_RECEITA = "Outra Receita"
    
    # Despesas
    MEDICAMENTOS = "Medicamentos"
    PRODUTOS_INSUMOS = "Produtos e Insumos"
    FORNECEDOR = "Fornecedor"
    COMBUSTIVEL_DESLOCAMENTO = "Combustível / Deslocamento"
    ALUGUEL_ESPACO = "Aluguel / Parceria"
    EQUIPAMENTOS = "Equipamentos"
    OUTRA_DESPESA = "Outra Despesa"

class PaymentMethod(str, enum.Enum):
    PIX = "Pix"
    DINHEIRO = "Dinheiro"
    CARTAO_DEBITO = "Cartão de Débito"
    CARTAO_CREDITO_VISTA = "Cartão de Crédito à Vista"
    CARTAO_CREDITO_PARCELADO = "Cartão de Crédito Parcelado"
    TRANSFERENCIA = "Transferência / TED"
    BOLETO = "Boleto"
    OUTRO = "Outro"

class FinancialStatus(str, enum.Enum):
    PENDENTE = "Pendente"
    PAGO = "Pago"
    CANCELADO = "Cancelado"

class FinancialEntry(Base):
    __tablename__ = "financial_entries"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    description = Column(String(255), nullable=False)
    entry_type = Column(SQLEnum(FinancialType), nullable=False)
    category = Column(String(100), default="Outra Receita", nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    
    due_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=True)
    payment_method = Column(SQLEnum(PaymentMethod), default=PaymentMethod.PIX, nullable=False)
    status = Column(SQLEnum(FinancialStatus), default=FinancialStatus.PAGO, nullable=False)
    
    tutor_id = Column(Integer, ForeignKey("tutors.id", ondelete="SET NULL"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="financial_entries")
