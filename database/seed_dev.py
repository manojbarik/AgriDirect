import sys
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select  # noqa: E402

from app.db.models import (  # noqa: E402
    Community,
    CommunityComment,
    CommunityLike,
    CommunityMember,
    CommunityPost,
    ConsumerProfile,
    Crop,
    Farm,
    FarmerProfile,
    LogisticsPartnerProfile,
    Order,
    OrderItem,
    Shipment,
    TrackingEvent,
    User,
    WeatherForecast,
)
from app.db.session import SessionLocal  # noqa: E402
from app.modules.identity.security import hash_password  # noqa: E402

DEV_PASSWORD = "Sandbox@123"

DEMO_LOCATIONS = [
    ("Odisha", "Bhubaneswar"),
    ("Odisha", "Cuttack"),
    ("Odisha", "Puri"),
    ("West Bengal", "Kolkata"),
    ("Jharkhand", "Ranchi"),
    ("Telangana", "Hyderabad"),
]


def _seed_crop_catalog(session: object) -> None:
    catalogue = [
        ("Tomato", "Hybrid", "Vegetable", "kg"),
        ("Tomato", "Desi", "Vegetable", "kg"),
        ("Potato", "Local", "Vegetable", "kg"),
        ("Onion", "Red", "Vegetable", "kg"),
        ("Green Chilli", "Local", "Spice", "kg"),
        ("Rice", "Basmati", "Cereal", "kg"),
        ("Rice", "Common", "Cereal", "kg"),
        ("Wheat", "Common", "Cereal", "kg"),
        ("Maize", "Hybrid", "Cereal", "kg"),
        ("Soybean", "Local", "Oilseed", "kg"),
        ("Groundnut", "Local", "Oilseed", "kg"),
        ("Mango", "Local", "Fruit", "kg"),
    ]
    for name, variety, category, default_unit in catalogue:
        existing = session.scalar(select(Crop).where(Crop.name == name, Crop.variety == variety))
        if existing is None:
            session.add(
                Crop(name=name, variety=variety, category=category, default_unit=default_unit)
            )


def _seed_consumer_accounts(session) -> None:
    consumers = [
        ("+919000000201", "Odisha", "Bhubaneswar", "en", "Vegetarian"),
        ("+919000000202", "Odisha", "Cuttack", "en", None),
        ("+919000000203", "Maharashtra", "Pune", "en", "Vegan"),
        ("+919000000204", "West Bengal", "Kolkata", "bn", "Non-vegetarian"),
        ("+919000000205", "Jharkhand", "Ranchi", "en", None),
        ("+919000000206", "Telangana", "Hyderabad", "te", "Vegetarian"),
        ("+919000000207", "Maharashtra", "Mumbai", "en", "Vegan"),
        ("+919000000208", "Odisha", "Puri", "en", "Vegetarian"),
        ("+919000000209", "West Bengal", "Howrah", "bn", None),
        ("+919000000210", "Jharkhand", "Jamshedpur", "en", "Non-vegetarian"),
    ]
    for phone, state, district, lang, diet in consumers:
        if session.scalar(select(User).where(User.phone_e164 == phone)) is not None:
            continue
        user = User(
            phone_e164=phone,
            role="CONSUMER",
            status="ACTIVE",
            phone_verified_at=datetime.now(UTC),
        )
        session.add(user)
        session.flush()
        session.add(
            ConsumerProfile(
                user_id=user.id,
                state=state,
                district=district,
                preferred_language=lang,
                dietary_preference=diet,
            )
        )
        user.password_hash = hash_password(DEV_PASSWORD)


def _seed_logistics_accounts(session) -> None:
    logistics = [
        ("+919000000301", "Sheetal Logistics", 12, "Odisha", "Bhubaneswar", "Bhubaneswar"),
        ("+919000000302", "CoolChain Express", 8, "Maharashtra", "Nashik", "Nashik"),
        ("+919000000303", "Agri Haul", 20, "Telangana", "Hyderabad", "Hyderabad"),
        ("+919000000304", "RuralRoad Movers", 6, "Jharkhand", "Ranchi", "Ranchi"),
        ("+919000000305", "Harvest Transport", 15, "West Bengal", "Kolkata", "Kolkata"),
        ("+919000000306", "East Coast Logistics", 10, "Odisha", "Cuttack", "Cuttack"),
        ("+919000000307", "Kisan Freight", 9, "Maharashtra", "Pune", "Pune"),
        ("+919000000308", "Coastal Cool", 11, "Odisha", "Puri", "Puri"),
    ]
    for phone, company, vehicles, area, district, city in logistics:
        if session.scalar(select(User).where(User.phone_e164 == phone)) is not None:
            continue
        user = User(
            phone_e164=phone,
            role="LOGISTICS",
            status="ACTIVE",
            phone_verified_at=datetime.now(UTC),
        )
        session.add(user)
        session.flush()
        session.add(
            LogisticsPartnerProfile(
                user_id=user.id,
                company_name=company,
                vehicle_count=vehicles,
                service_area=area,
                district=district,
                contact_city=city,
                verification_status="VERIFIED",
            )
        )
        user.password_hash = hash_password(DEV_PASSWORD)


def _seed_weather(session) -> None:
    conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain"]
    tips = {
        "Sunny": "Good day for field work and harvesting.",
        "Partly Cloudy": "Ideal for transplanting seedlings.",
        "Cloudy": "Monitor crops for pest activity.",
        "Light Rain": "Avoid spraying; ensure drainage is clear.",
    }
    today = date.today()
    for state, district in DEMO_LOCATIONS:
        for i in range(5):
            d = today + timedelta(days=i)
            exists = session.scalar(
                select(WeatherForecast).where(
                    WeatherForecast.state == state,
                    WeatherForecast.district == district,
                    WeatherForecast.forecast_date == d,
                )
            )
            if exists is not None:
                continue
            cond = conditions[i % len(conditions)]
            temp = 30.0 + (i % 3) - (0.5 if "Rain" in cond else 0)
            session.add(
                WeatherForecast(
                    state=state,
                    district=district,
                    forecast_date=d,
                    condition=cond,
                    temperature_c=temp,
                    temp_high_c=temp + 3.0,
                    temp_low_c=temp - 4.0,
                    humidity=70.0 + (i * 2) % 8,
                    precipitation_mm=8.0 if "Rain" in cond else 0.0,
                    wind_speed_kmh=10.0 + i,
                    pressure_hpa=1012.0,
                    rain_probability=70.0 if "Rain" in cond else 15.0,
                    sunrise=time(6, 0),
                    sunset=time(18, 0),
                    is_demo=True,
                    farming_tip=tips[cond],
                )
            )


def _seed_community(session) -> None:
    groups = [
        ("Bhubaneswar Farmers Circle", "Farmers circle for sharing tips", "🌾"),
        ("Organic Produce Hub", "Organic growers community", "🥦"),
        ("Waste Smart Agriculture", "Reduce farm wastage together", "♻️"),
    ]
    community_ids = []
    owners: dict = {}
    for name, desc, emoji in groups:
        existing = session.scalar(select(Community).where(Community.name == name))
        if existing is not None:
            community_ids.append(existing.id)
            continue
        user = session.scalar(
            select(User).where(User.phone_e164 == "+919000000001")
        )
        creator_id = user.id if user else None
        slug = name.lower().replace(" ", "-").replace("'", "")[:100]
        group = Community(
            name=name,
            slug=slug,
            description=desc,
            cover_emoji=emoji,
            member_count=0,
            is_public=True,
            created_by=creator_id,
        )
        session.add(group)
        session.flush()
        if creator_id is not None:
            community_ids.append(group.id)
        else:
            session.delete(group)
            continue
        session.add(
            CommunityMember(
                community_id=group.id,
                user_id=creator_id,
                role="OWNER",
                joined_at=datetime.now(UTC),
            )
        )
        group.member_count += 1
        owners[group.id] = creator_id

    sample_users = session.scalars(
        select(User).where(User.role == "FARMER").limit(3)
    ).all()
    joined_ids = set()
    for community_id, owner_id in owners.items():
        for u in sample_users[:2]:
            if u.id == owner_id:
                continue
            key = (community_id, u.id)
            if key in joined_ids:
                continue
            joined_ids.add(key)
            if (
                session.scalar(
                    select(CommunityMember).where(
                        CommunityMember.community_id == community_id,
                        CommunityMember.user_id == u.id,
                    )
                )
                is None
            ):
                session.add(
                    CommunityMember(
                        community_id=community_id,
                        user_id=u.id,
                        role="MEMBER",
                        joined_at=datetime.now(UTC),
                    )
                )
                group = session.get(Community, community_id)
                if group:
                    group.member_count += 1

    seed_posts = [
        ("Tomato harvest tips", "Water deeply and mulch to retain moisture."),
        ("Onion storage advice", "Keep onions dry and well ventilated."),
        ("Join our waste reduction drive", "Share your tips for reducing post-harvest waste."),
    ]
    if session.scalar(select(CommunityPost)) is None:
        for idx, (title, body) in enumerate(seed_posts):
            community_id = community_ids[idx % len(community_ids)]
            author = sample_users[idx % len(sample_users)] if sample_users else None
            if author is None:
                continue
            post = CommunityPost(
                community_id=community_id,
                user_id=author.id,
                title=title,
                body=body,
            )
            session.add(post)
            session.flush()
            session.add(
                CommunityComment(
                    post_id=post.id,
                    user_id=sample_users[(idx + 1) % len(sample_users)].id,
                    body="Thanks for sharing, very useful!",
                )
            )
            post.comment_count += 1
            if len(sample_users) > 1:
                session.add(
                    CommunityLike(
                        post_id=post.id,
                        user_id=sample_users[(idx + 1) % len(sample_users)].id,
                    )
                )
                post.like_count += 1


def _seed_sample_orders_and_shipments(session) -> None:
    farmer_profile = session.scalar(select(FarmerProfile).limit(1))
    buyer_profile = session.scalar(select(BuyerProfile).limit(1))
    logistics_user = session.scalar(select(User).where(User.role == "LOGISTICS").limit(1))
    tomato = session.scalar(select(Crop).where(Crop.name == "Tomato").limit(1))
    rice = session.scalar(select(Crop).where(Crop.name == "Rice").limit(1))
    onion = session.scalar(select(Crop).where(Crop.name == "Onion").limit(1))

    if not farmer_profile or not buyer_profile or not logistics_user:
        return

    now = datetime.now(UTC)

    shipment_defs = [
        {
            "order_number": "AGR-1024",
            "status": "IN_TRANSIT",
            "crop": tomato,
            "quantity": Decimal("500.00"),
            "price": Decimal("28.00"),
            "driver": "Rajesh Behera",
            "vehicle": "OD-02-AG-1024",
            "origin": "Patia Green Farms, Bhubaneswar",
            "origin_lat": 20.3540,
            "origin_lng": 85.8190,
            "dest": "Malgodown Wholesale Mandi, Cuttack",
            "dest_lat": 20.4625,
            "dest_lng": 85.8830,
            "curr_lat": 20.4010,
            "curr_lng": 85.8480,
            "rem_km": 14.8,
            "eta": 35,
            "waypoints": [
                {"label": "Patia Green Farms, Bhubaneswar", "latitude": 20.3540, "longitude": 85.8190},
                {"label": "Palasuni Toll Gate Hub, NH-16", "latitude": 20.3200, "longitude": 85.8500},
                {"label": "Phulnakhara Expressway Junction", "latitude": 20.4010, "longitude": 85.8480},
                {"label": "Link Road Crossing, Cuttack", "latitude": 20.4350, "longitude": 85.8720},
                {"label": "Malgodown Wholesale Mandi, Cuttack", "latitude": 20.4625, "longitude": 85.8830},
            ],
            "events": [
                ("ASSIGNED", "Order Placed", "Order confirmed with escrow deposit.", 20.3540, 85.8190, -180),
                ("ASSIGNED", "Logistics Partner Assigned", "Sheetal Logistics assigned for refrigerated transport.", 20.3540, 85.8190, -140),
                ("CHECKPOINT", "Pickup Scheduled", "Vehicle OD-02-AG-1024 scheduled for loading.", 20.3540, 85.8190, -110),
                ("PICKUP", "Cargo Loaded & Quality Checked", "500 kg fresh tomatoes loaded into temperature-controlled bay.", 20.3540, 85.8190, -70),
                ("CHECKPOINT", "In Transit on NH-16", "Vehicle crossing Phulnakhara junction toward Cuttack.", 20.4010, 85.8480, -20),
            ],
        },
        {
            "order_number": "AGR-1025",
            "status": "NEAR_DESTINATION",
            "crop": rice or tomato,
            "quantity": Decimal("1200.00"),
            "price": Decimal("45.00"),
            "driver": "Santosh Das",
            "vehicle": "OD-33-TC-8890",
            "origin": "Puri Coastal Paddy Hub, Puri",
            "origin_lat": 19.8135,
            "origin_lng": 85.8312,
            "dest": "Master Canteen Distribution Center, Bhubaneswar",
            "dest_lat": 20.2660,
            "dest_lng": 85.8430,
            "curr_lat": 20.2450,
            "curr_lng": 85.8280,
            "rem_km": 4.2,
            "eta": 12,
            "waypoints": [
                {"label": "Puri Coastal Paddy Hub, Puri", "latitude": 19.8135, "longitude": 85.8312},
                {"label": "Pipili Highway Checkpoint", "latitude": 20.1180, "longitude": 85.8320},
                {"label": "Uttara Square Hub", "latitude": 20.2100, "longitude": 85.8350},
                {"label": "Lingaraj Flyover Crossing", "latitude": 20.2450, "longitude": 85.8280},
                {"label": "Master Canteen Distribution Center, Bhubaneswar", "latitude": 20.2660, "longitude": 85.8430},
            ],
            "events": [
                ("ASSIGNED", "Order Placed", "Buyer confirmed 1,200 kg premium grain consignment.", 19.8135, 85.8312, -260),
                ("ASSIGNED", "Carrier Assigned", "Coastal Cool Express assigned vehicle OD-33-TC-8890.", 19.8135, 85.8312, -200),
                ("PICKUP", "Pickup Completed", "Produce inspected and sealed with tamper-evident RFID tag.", 19.8135, 85.8312, -120),
                ("CHECKPOINT", "In Transit", "Cruising on Puri-Bhubaneswar highway at 54 km/h.", 20.1180, 85.8320, -50),
                ("CHECKPOINT", "Near Destination (~4 km away)", "Vehicle approaching Bhubaneswar bypass, delivery crew notified.", 20.2450, 85.8280, -10),
            ],
        },
        {
            "order_number": "AGR-1026",
            "status": "DELIVERED",
            "crop": onion or tomato,
            "quantity": Decimal("800.00"),
            "price": Decimal("32.00"),
            "driver": "Debendra Jena",
            "vehicle": "OD-05-EX-4421",
            "origin": "Jatni Krishi Mandi, Khordha",
            "origin_lat": 20.1630,
            "origin_lng": 85.7060,
            "dest": "Saheed Nagar Superstore, Bhubaneswar",
            "dest_lat": 20.2880,
            "dest_lng": 85.8480,
            "curr_lat": 20.2880,
            "curr_lng": 85.8480,
            "rem_km": 0.0,
            "eta": 0,
            "waypoints": [
                {"label": "Jatni Krishi Mandi, Khordha", "latitude": 20.1630, "longitude": 85.7060},
                {"label": "Khandagiri Crossing", "latitude": 20.2580, "longitude": 85.7870},
                {"label": "Vani Vihar Junction", "latitude": 20.2920, "longitude": 85.8380},
                {"label": "Saheed Nagar Superstore, Bhubaneswar", "latitude": 20.2880, "longitude": 85.8480},
            ],
            "events": [
                ("ASSIGNED", "Order Placed", "Wholesale purchase order generated.", 20.1630, 85.7060, -320),
                ("ASSIGNED", "Logistics Assigned", "Carrier confirmed assignment.", 20.1630, 85.7060, -280),
                ("PICKUP", "Pickup Completed", "800 kg organic onions loaded.", 20.1630, 85.7060, -180),
                ("CHECKPOINT", "In Transit", "Dispatched via Khandagiri bypass.", 20.2580, 85.7870, -90),
                ("DELIVERED", "Consignment Delivered", "Goods received, digitally signed and verified with QR code.", 20.2880, 85.8480, -15),
            ],
        },
    ]

    for sdef in shipment_defs:
        existing_order = session.scalar(
            select(Order).where(Order.public_order_number == sdef["order_number"])
        )
        if existing_order is not None:
            continue

        tot = sdef["quantity"] * sdef["price"]
        order = Order(
            public_order_number=sdef["order_number"],
            farmer_id=farmer_profile.id,
            buyer_id=buyer_profile.id,
            order_type="B2B",
            status="IN_TRANSIT" if sdef["status"] != "DELIVERED" else "DELIVERED",
            currency="INR",
            total_amount=tot,
            unit="kg",
            requested_quantity=sdef["quantity"],
            requested_price=sdef["price"],
            agreed_quantity=sdef["quantity"],
            agreed_price=sdef["price"],
            crop_id=sdef["crop"].id if sdef["crop"] else None,
            delivery_address_snapshot=f"{sdef['dest']}, Odisha",
        )
        session.add(order)
        session.flush()

        if sdef["crop"]:
            session.add(
                OrderItem(
                    order_id=order.id,
                    crop_id=sdef["crop"].id,
                    quantity=sdef["quantity"],
                    unit="kg",
                    unit_price=sdef["price"],
                    line_total=tot,
                )
            )

        shipment = Shipment(
            order_id=order.id,
            provider_user_id=logistics_user.id,
            driver_name=sdef["driver"],
            vehicle_label=sdef["vehicle"],
            status=sdef["status"],
            waypoints=sdef["waypoints"],
            current_stop_index=2 if sdef["status"] == "IN_TRANSIT" else (3 if sdef["status"] == "NEAR_DESTINATION" else len(sdef["waypoints"]) - 1),
            total_stops=len(sdef["waypoints"]),
            eta_minutes=sdef["eta"],
            started_at=now - timedelta(minutes=120),
            delivered_at=now - timedelta(minutes=15) if sdef["status"] == "DELIVERED" else None,
            pickup_location=sdef["origin"],
            pickup_latitude=sdef["origin_lat"],
            pickup_longitude=sdef["origin_lng"],
            destination_location=sdef["dest"],
            destination_latitude=sdef["dest_lat"],
            destination_longitude=sdef["dest_lng"],
            current_latitude=sdef["curr_lat"],
            current_longitude=sdef["curr_lng"],
            distance_remaining_km=sdef["rem_km"],
            is_demo_gps=False,
        )
        session.add(shipment)
        session.flush()

        for idx, (etype, elabel, edesc, elat, elng, mins_ago) in enumerate(sdef["events"]):
            session.add(
                TrackingEvent(
                    shipment_id=shipment.id,
                    sequence=idx,
                    event_type=etype,
                    label=elabel,
                    description=edesc,
                    latitude=elat,
                    longitude=elng,
                    occurred_at=now + timedelta(minutes=mins_ago),
                    updated_by=sdef["driver"],
                )
            )


def seed() -> None:
    with SessionLocal() as session:
        _seed_crop_catalog(session)
        # Farmer
        farmer_user = session.scalar(select(User).where(User.phone_e164 == "+919000000001"))
        if farmer_user is None:
            farmer_user = User(
                phone_e164="+919000000001",
                role="FARMER",
                status="ACTIVE",
                phone_verified_at=datetime.now(UTC),
            )
            session.add(farmer_user)
            session.flush()
            session.add(
                FarmerProfile(
                    user_id=farmer_user.id,
                    full_name="Manoj Barik",
                    verification_status="VERIFIED",
                    land_size_acres=Decimal("4.50"),
                    experience_years=8,
                    state="Odisha",
                    district="Bhubaneswar",
                    postal_code="751024",
                )
            )
            session.flush()
            farmer_profile = session.scalar(
                select(FarmerProfile).where(FarmerProfile.user_id == farmer_user.id)
            )
            if farmer_profile is not None:
                session.add(
                    Farm(
                        farmer_id=farmer_profile.id,
                        name="Patia Green Farm",
                        latitude=Decimal("20.3540"),
                        longitude=Decimal("85.8190"),
                        locality="Patia",
                        district="Bhubaneswar",
                        state="Odisha",
                        postal_code="751024",
                        size_acres=Decimal("4.50"),
                        ownership_type="OWNED",
                    )
                )
        farmer_user.password_hash = hash_password(DEV_PASSWORD)

        # Buyer
        buyer_user = session.scalar(select(User).where(User.phone_e164 == "+919000000002"))
        if buyer_user is None:
            buyer_user = User(
                phone_e164="+919000000002",
                role="BUYER",
                status="ACTIVE",
                phone_verified_at=datetime.now(UTC),
            )
            session.add(buyer_user)
            session.flush()
            session.add(
                BuyerProfile(
                    user_id=buyer_user.id,
                    full_name="Demo Wholesale Buyer",
                    buyer_type="RETAILER",
                    business_name="BigBasket Wholesale Hub",
                    verification_status="VERIFIED",
                    payment_verification_status="VERIFIED",
                    address_summary="Malgodown, Cuttack",
                    state="Odisha",
                    district="Cuttack",
                    locality="Malgodown",
                    postal_code="753003",
                    latitude=Decimal("20.4625"),
                    longitude=Decimal("85.8830"),
                    payment_profile_reference="mock-payment-buyer-001",
                )
            )
        buyer_user.password_hash = hash_password(DEV_PASSWORD)

        # Admin
        admin_user = session.scalar(select(User).where(User.phone_e164 == "+919000000000"))
        if admin_user is None:
            admin_user = User(
                phone_e164="+919000000000",
                email="admin@example.test",
                role="ADMIN",
                status="ACTIVE",
                phone_verified_at=datetime.now(UTC),
            )
            session.add(admin_user)
        admin_user.password_hash = hash_password(DEV_PASSWORD)

        # Primary Admin
        primary_admin = session.scalar(
            select(User).where(
                (User.email == "alphacadet009@gmail.com") | (User.phone_e164 == "+916370355406")
            )
        )
        if primary_admin is None:
            primary_admin = User(
                phone_e164="+916370355406",
                email="alphacadet009@gmail.com",
                role="ADMIN",
                status="ACTIVE",
                phone_verified_at=datetime.now(UTC),
            )
            session.add(primary_admin)
        else:
            primary_admin.role = "ADMIN"
            primary_admin.status = "ACTIVE"
            primary_admin.email = "alphacadet009@gmail.com"
            primary_admin.phone_e164 = "+916370355406"
            primary_admin.phone_verified_at = datetime.now(UTC)
        primary_admin.password_hash = hash_password("Abhi@1234")

        _seed_consumer_accounts(session)
        _seed_logistics_accounts(session)
        _seed_weather(session)
        _seed_community(session)
        _seed_sample_orders_and_shipments(session)

        session.commit()

    print("Development seed data is ready with live shipments.")


if __name__ == "__main__":
    seed()
