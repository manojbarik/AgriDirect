from __future__ import annotations

from datetime import datetime
import re
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    phone_e164: str = Field(min_length=8, max_length=20, pattern=r"^\+[1-9]\d{7,14}$")
    role: Literal["FARMER", "BUYER", "CONSUMER", "LOGISTICS", "BULK_BUYER"]
    password: str = Field(min_length=8, max_length=72)
    email: str | None = Field(default=None, max_length=320)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is not None and "@" not in value:
            raise ValueError("must be a valid email address")
        return value


class ChallengeResponse(BaseModel):
    user_id: UUID
    challenge_id: UUID
    purpose: str
    expires_at: datetime
    resend_after_seconds: int = 30
    mock_code: str | None = None


class RegisterResponse(ChallengeResponse):
    phone_e164: str
    email: str | None
    role: str
    status: str


class OtpResendRequest(BaseModel):
    user_id: UUID


class LoginRequest(BaseModel):
    phone_e164: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=320)
    password: str = Field(min_length=1, max_length=72)

    @model_validator(mode="before")
    @classmethod
    def normalize_login_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            raw_email = data.get("email")
            raw_phone = data.get("phone_e164")
            if raw_email and not raw_phone and "@" not in str(raw_email):
                data = dict(data)
                data["phone_e164"] = data.pop("email")
                raw_phone = data["phone_e164"]
                raw_email = None

            if raw_phone:
                clean_digits = re.sub(r"\D", "", str(raw_phone))
                if len(clean_digits) == 10:
                    phone_str = f"+91{clean_digits}"
                elif clean_digits.startswith("91") and len(clean_digits) == 12:
                    phone_str = f"+{clean_digits}"
                elif not str(raw_phone).startswith("+") and clean_digits:
                    phone_str = f"+{clean_digits}"
                else:
                    phone_str = str(raw_phone).strip()
                data = dict(data)
                data["phone_e164"] = phone_str

            if raw_email:
                data = dict(data)
                data["email"] = str(raw_email).strip().lower()
        return data

    @field_validator("email")
    @classmethod
    def validate_login_email(cls, value: str | None) -> str | None:
        if value is not None and "@" not in value:
            raise ValueError("must be a valid email address")
        return value

    @model_validator(mode="after")
    def validate_login_identity(self) -> "LoginRequest":
        if not self.phone_e164 and not self.email:
            raise ValueError("email or phone number is required")
        return self


class RoleResponse(BaseModel):
    role: str


class VerifyOtpRequest(BaseModel):
    challenge_id: UUID
    code: str = Field(min_length=4, max_length=10)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class VerifyResponse(BaseModel):
    user_id: UUID
    role: str
    status: str
    tokens: TokenResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    tokens: TokenResponse


class LogoutRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=320)

    @field_validator("identifier")
    @classmethod
    def validate_identifier(cls, value: str) -> str:
        value = value.strip()
        if "@" in value and "@" not in value.split()[0]:
            raise ValueError("must be a valid email address or phone number")
        if "@" not in value and not value.startswith("+"):
            raise ValueError("must be a valid email address or phone number")
        return value


class ForgotPasswordResponse(BaseModel):
    message: str
    expires_in_minutes: int
    mock_reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=32, max_length=512)
    new_password: str = Field(min_length=8, max_length=72)


class ResetPasswordResponse(BaseModel):
    message: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    phone_e164: str
    email: str | None
    role: str
    status: str
    phone_verified_at: datetime | None
    created_at: datetime
