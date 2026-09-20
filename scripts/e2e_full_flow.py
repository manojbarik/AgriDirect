import json, urllib.request, urllib.error, random, sys

BASE="http://127.0.0.1:8001/api/v1"
SUF=str(random.randint(1000,9999))

def call(method, path, token=None, body=None, **extra):
    url=BASE+path
    if extra and isinstance(body,dict): body={**body,**extra}
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type","application/json")
    if token: req.add_header("Authorization",f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw=r.read().decode()
            j=json.loads(raw) if raw else None
            return r.status, j
    except urllib.error.HTTPError as e:
        raw=e.read().decode()
        try: j=json.loads(raw)
        except: j=raw[:300]
        return e.code, j

def show(tag, res):
    code,j=res
    if isinstance(j,dict):
        jj={k:j[k] for k in list(j)[:6]}
    else: jj=j
    print(f"  {tag:42s} -> {code} {json.dumps(jj, default=str)[:240]}")

print("="*10,"PHASE A: FARMER ONBOARD","="*10)
fphone="+9198500"+SUF
res=call("POST","/auth/register",body={"phone_e164":fphone,"role":"FARMER","password":"Passw0rd!x"})
show("register farmer",res); challenge=res[1]["challenge_id"]; mock_code=res[1]["mock_code"]
res=call("POST","/auth/otp/verify",body={"challenge_id":challenge,"code":mock_code})
ftok=res[1]["tokens"]["access_token"]; show("verify farmer",res)

res=call("GET","/farmer/status",ftok); show("farmer status",res)
res=call("GET","/farmer/profile",ftok); show("farmer profile get",res)
if res[0]==404:
    res=call("POST","/farmer/profile",ftok,body={"full_name":"Demo Farmer","farm_location_supported":True,"state":"Odisha","district":"Khordha"})
    show("farmer profile create",res)

res=call("POST","/farmer/farms",ftok,body={"name":"Green Valley Farm","acreage":5.5,"farming_type":"FARMER"})
show("create farm",res); farm_id=res[1].get("id") or res[1].get("farm_id") or (res[1].get("data") or {}).get("id")
res=call("GET","/marketplace/crops"); crops=res[1] if isinstance(res[1],list) else res[1].get("data",[])
print("   crops catalog count:", len(crops), "name:", crops[0].get("name") if crops else None)
crop=next((c for c in crops if c.get("name") and c.get("id")), None) or crops[0]
crop_id=crop["id"]; crop_name=crop.get("name","Tomato")
res=call("POST",f"/farmer/farms/{farm_id}/crops",ftok,body={"crop_id":crop_id,"season":"RABI","expected_harvest_start":"2026-10-01","expected_harvest_end":"2026-10-20","estimated_quantity":2500,"cultivation_method":"ORGANIC"})
show("add crop plan",res)

res=call("POST","/farmer/listings",ftok,body={"farm_id":farm_id,"crop_id":crop_id,"title":"Fresh "+crop_name,"unit":"KG","available_quantity":2500,"unit_price":48.0,"currency":"INR","grade":"A","available_from":"2026-10-01","available_until":"2026-11-15"})
show("create listing",res); listing=res[1]
lid=listing.get("id") or (listing.get("data") or {}).get("id")

res=call("PUT",f"/farmer/farms/{farm_id}/location",ftok,body={"state":"Odisha","district":"Khordha","locality":"Bhubaneswar","postal_code":"751015","latitude":20.2961,"longitude":85.8245})
show("farm location",res)
res=call("POST","/farmer/verification/submit",ftok,body={}); show("farmer verification submit",res)
res=call("PUT",f"/farmer/listings/{lid}/publish",ftok,body={}); show("publish listing",res)
res=call("POST","/ai/price-prediction",ftok,body={"crop_name":crop_name,"state":"Odisha","district":"Khordha"})
show("AI price prediction",res)
res=call("POST","/ai/match/buyers",ftok,body={"crop_name":crop_name,"available_quantity":2500,"unit":"KG","expected_price":48.0,"state":"Odisha","district":"Khordha"})
show("AI match buyers",res)

print("="*10,"PHASE B: BUYER + ORDER","="*10)
bphone="+9198501"+SUF
res=call("POST","/auth/register",body={"phone_e164":bphone,"role":"BUYER","password":"Passw0rd!x"})
show("register buyer",res); challenge=res[1]["challenge_id"]; mock_code=res[1]["mock_code"]
res=call("POST","/auth/otp/verify",body={"challenge_id":challenge,"code":mock_code})
btok=res[1]["tokens"]["access_token"]; show("verify buyer",res)
res=call("POST","/buyer/profile",btok,body={"full_name":"Demo Buyer","buyer_type":"WHOLESALER","business_name":"Demo Traders"})
show("buyer profile",res)
res=call("PUT","/buyer/location",btok,body={"state":"Odisha","district":"Khordha","locality":"Bhubaneswar","postal_code":"751015","latitude":20.2961,"longitude":85.8245})
show("buyer location",res)
res=call("POST","/buyer/verification/identity/submit",btok,body={}); show("buyer identity submit",res)
res=call("POST","/buyer/verification/payment/submit",btok,body={}); show("buyer payment submit",res)
res=call("GET","/buyer/status",btok); show("buyer status after verify",res)

lph="+9198530"+SUF
res=call("POST","/auth/register",body={"phone_e164":lph,"role":"LOGISTICS","password":"Passw0rd!x"})
show("register logistics",res); lc=res[1]["challenge_id"]
res=call("POST","/auth/otp/verify",body={"challenge_id":lc,"code":res[1]["mock_code"]})
ltok=res[1]["tokens"]["access_token"]; show("verify logistics",res)

res=call("GET","/marketplace/listings")
myl=[l for l in (res[1] if isinstance(res[1],list) else res[1].get("data",[])) if l.get("id")==lid]
print("   marketplace listings:", len(res[1]) if isinstance(res[1],list) else res[1].get("data",[]).__class__)
res=call("POST","/orders",btok,body={"listing_id":lid,"quantity":500,"unit":"KG","price":48.0,"currency":"INR","delivery_date":"2026-10-25","note":"deliver to Bhubaneswar","delivery_address_summary":"Demo Warehouse, Bhubaneswar"})
show("create order",res); order=res[1]; oid=order.get("id") or (order.get("data") or {}).get("id"); print("   ORDER_ID",oid)

print("="*10,"PHASE C: FULFILLMENT","="*10)
res=call("POST",f"/orders/{oid}/accept",ftok); show("farmer accept order",res)
res=call("GET",f"/orders/{oid}",btok); show("order after accept",res)
res=call("POST","/payments/intents",btok,body={"order_id":oid,"operation":"ADVANCE"})
show("payment intent",res); pid=(res[1].get("payment") or res[1]).get("id")
res=call("POST",f"/payments/{pid}/confirm",btok,body={}); show("confirm payment",res)
res=call("POST",f"/batches/orders/{oid}/prepare",ftok,body={"prepared_quantity":500,"harvest_date":"2026-10-01","quality_grade":"A","preparation_notes":"cleaned and graded"})
show("prepare batch",res); batch=res[1]; bid=batch.get("id") or (batch.get("data") or {}).get("id")
print("   BATCH_ID",bid,"QR:", (batch.get("qr_identifier") if isinstance(batch,dict) else None))
res=call("POST",f"/orders/{oid}/status",ftok,body={"status":"READY_FOR_PICKUP"}); show("order ready_for_pickup",res)
res=call("POST",f"/logistics/shipments",ltok,body={"order_id":oid,"driver_name":"Driver Rao","vehicle_label":"OD-02-AX-8921"})
show("create shipment",res); ship=(res[1].get("data") or res[1]); sid=ship.get("id") or ship.get("shipment_id"); print("   SHIPMENT_ID",sid)
res=call("POST",f"/batches/{bid}/inspect",ftok,body={},result="PASS"); show("batch inspect",res)
res=call("POST",f"/batches/{bid}/pickup",ftok,body={}); show("batch pickup",res)
res=call("POST",f"/logistics/shipments/{sid}/start",ltok,body={}); show("start trip",res)
res=call("POST",f"/logistics/shipments/{sid}/advance",ltok,body={}); show("advance gps",res)
res=call("POST",f"/logistics/shipments/{sid}/advance",ltok,body={}); show("advance gps 2",res)
res=call("POST",f"/batches/{bid}/deliver",ftok,body={}); show("batch deliver",res)
res=call("POST",f"/logistics/shipments/{sid}/deliver",ltok,body={}); show("shipment deliver",res)
res=call("POST",f"/orders/{oid}/status",btok,body={"status":"QUALITY_CHECK"}); show("buyer quality_check",res)
res=call("POST",f"/orders/{oid}/status",btok,body={"status":"COMPLETED"}); show("buyer complete",res)

print("="*10,"PHASE D: RATE + TRUST","="*10)
res=call("POST","/ratings",btok,body={"order_id":oid,"rating":5,"comment":"Great quality"})
show("buyer rating",res)
res=call("POST","/ratings",ftok,body={"order_id":oid,"rating":5,"comment":"Good buyer"})
show("farmer rating",res)
res=call("GET","/trust-score/me",ftok); show("farmer trust score",res)
res=call("GET","/trust-score/me",btok); show("buyer trust score",res)
res=call("GET",f"/orders/{oid}",ftok); show("final order state",res)
print("DONE")