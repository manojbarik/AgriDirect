"""HTML template for account verification emails."""


def render_otp_email(code: str, *, ttl_minutes: int = 5) -> str:
    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #173b2f; line-height: 1.5;">
        <h2>Verify your AgriDirect account</h2>
        <p>Use the verification code below to continue:</p>
        <p style="font-size: 30px; font-weight: 700; letter-spacing: 8px;">{code}</p>
        <p>This code expires in {ttl_minutes} minutes. If you did not request it, you can ignore this email.</p>
      </body>
    </html>
    """