"""Seed demo livestock listings."""
import sys
from decimal import Decimal
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.models.livestock import LivestockListing
from app.db.models.people import User
from app.db.session import SessionLocal

DEMO_LIVESTOCK = [
    {
        "title": "Gir Cow - First Calving, High Milk Yield",
        "category": "CATTLE",
        "breed": "Gir (Desi)",
        "age_months": 36,
        "health_status": "HEALTHY",
        "price": Decimal("52000.00"),
        "location": "Anand, Gujarat",
        "quantity": 1,
        "description": "Pure indigenous Gir cow. 12-14 liters daily yield. Complete vaccination record and health certificate available.",
        "contact_phone": "+919876543210",
        "image_url": "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&auto=format&fit=crop&q=80",
    },
    {
        "title": "Murrah Dairy Buffalo",
        "category": "BUFFALO",
        "breed": "Murrah",
        "age_months": 40,
        "health_status": "HEALTHY",
        "price": Decimal("75000.00"),
        "location": "Karnal, Haryana",
        "quantity": 1,
        "description": "High-fat dairy Murrah buffalo. Docile temperament, current lactation cycle, vet-inspected.",
        "contact_phone": "+919876543211",
        "image_url": "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&auto=format&fit=crop&q=80",
    },
    {
        "title": "Osmanabadi Breeding Goats (Pair)",
        "category": "GOAT",
        "breed": "Osmanabadi",
        "age_months": 14,
        "health_status": "HEALTHY",
        "price": Decimal("18000.00"),
        "location": "Solapur, Maharashtra",
        "quantity": 2,
        "description": "Hardy Osmanabadi breed goats suitable for meat and breeding. Dewormed and healthy.",
        "contact_phone": "+919876543212",
        "image_url": "https://images.unsplash.com/photo-1524024973431-2ad916746881?w=800&auto=format&fit=crop&q=80",
    },
    {
        "title": "Kadaknath Free-Range Poultry Flock",
        "category": "POULTRY",
        "breed": "Kadaknath (Aseel)",
        "age_months": 6,
        "health_status": "HEALTHY",
        "price": Decimal("9500.00"),
        "location": "Jhabua, Madhya Pradesh",
        "quantity": 10,
        "description": "Pure black meat Kadaknath flock (10 birds). Organic farm raised with balanced nutrition.",
        "contact_phone": "+919876543213",
        "image_url": "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&auto=format&fit=crop&q=80",
    },
]


def seed():
    db = SessionLocal()
    try:
        farmer = db.query(User).filter(User.role == "FARMER").first()
        if not farmer:
            print("No farmer found in database to attach livestock to. Please register/seed users first.")
            return

        for item in DEMO_LIVESTOCK:
            existing = (
                db.query(LivestockListing)
                .filter(LivestockListing.title == item["title"])
                .first()
            )
            if not existing:
                listing = LivestockListing(seller_id=farmer.id, **item)
                db.add(listing)
                print(f"Added livestock listing: {item['title']}")
            else:
                print(f"Listing already exists: {item['title']}")
        db.commit()
        print("Livestock seeding finished successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
