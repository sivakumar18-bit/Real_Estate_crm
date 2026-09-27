import os
from datetime import date,datetime
from decimal import Decimal
import mysql.connector
from flask import Flask,jsonify,request
from flask_cors import CORS
from flask_jwt_extended import JWTManager,jwt_required,get_jwt,get_jwt_identity,create_access_token
from werkzeug.security import check_password_hash
from dotenv import load_dotenv
load_dotenv()
app=Flask(__name__)
app.config["JWT_SECRET_KEY"]=os.getenv("JWT_SECRET_KEY","dev-jwt")
JWTManager(app);CORS(app)
DB=dict(host=os.getenv("DB_HOST","localhost"),port=int(os.getenv("DB_PORT","3306")),
 user=os.getenv("DB_USER","root"),password=os.getenv("DB_PASSWORD",""),database=os.getenv("DB_NAME","real_estate_crm"))
def db(): return mysql.connector.connect(**DB)
def clean(rows):
 for r in rows:
  for k,v in list(r.items()):
   if isinstance(v,(date,datetime)): r[k]=v.isoformat()
   elif isinstance(v,Decimal): r[k]=float(v)
 return rows
def err(m,c=400): return jsonify(message=m),c
def role(*roles):
 def deco(fn):
  from functools import wraps
  @wraps(fn)
  @jwt_required()
  def w(*a,**kw):
   if get_jwt().get("role") not in roles:return err("Permission denied",403)
   return fn(*a,**kw)
  return w
 return deco

@app.get("/api/health")
def health():
 try:c=db();c.close();return jsonify(status="ok",database="connected")
 except Exception as e:return err(str(e),500)

@app.post("/api/auth/login")
def login():
 b=request.get_json() or {};c=db();q=c.cursor(dictionary=True)
 q.execute("SELECT * FROM users WHERE email=%s",(b.get("email","").lower(),));u=q.fetchone();q.close();c.close()
 if not u or not check_password_hash(u["password_hash"],b.get("password","")):return err("Invalid email or password",401)
 t=create_access_token(identity=str(u["id"]),additional_claims={k:u[k] for k in ["name","email","role"]})
 return jsonify(token=t,user={k:u[k] for k in ["id","name","email","role"]})

@app.get("/api/auth/me")
@jwt_required()
def me(): return jsonify(id=int(get_jwt_identity()),**{k:get_jwt()[k] for k in ["name","email","role"]})

@app.get("/api/users/sales")
@jwt_required()
def sales():
 c=db();q=c.cursor(dictionary=True);q.execute("SELECT id,name,email FROM users WHERE role='SALES' ORDER BY name");x=q.fetchall();q.close();c.close();return jsonify(x)

@app.get("/api/leads")
@jwt_required()
def leads():
 s=request.args.get("search","");st=request.args.get("stage","");c=db();q=c.cursor(dictionary=True)
 sql="""SELECT l.*,u.name assigned_name FROM leads l LEFT JOIN users u ON u.id=l.assigned_to
 WHERE (l.name LIKE %s OR l.phone LIKE %s OR l.email LIKE %s) AND (%s='' OR l.stage=%s)
 ORDER BY l.created_at DESC"""
 z=f"%{s}%";q.execute(sql,(z,z,z,st,st));x=clean(q.fetchall());q.close();c.close();return jsonify(x)

@app.post("/api/leads")
@jwt_required()
def add_lead():
 b=request.get_json() or {};c=db();q=c.cursor()
 if not b.get("name") or not b.get("phone"):return err("Name and phone are required")
 q.execute("""INSERT INTO leads(name,phone,email,source,stage,assigned_to,notes,follow_up_date)
 VALUES(%s,%s,%s,%s,%s,%s,%s,%s)""",(b["name"],b["phone"],b.get("email"),b.get("source"),b.get("stage","New"),b.get("assigned_to") or None,b.get("notes"),b.get("follow_up_date") or None))
 c.commit();i=q.lastrowid;q.close();c.close();return jsonify(id=i),201

@app.put("/api/leads/<int:i>")
@jwt_required()
def edit_lead(i):
 b=request.get_json() or {};allowed=["name","phone","email","source","stage","assigned_to","notes","follow_up_date"]
 sets=[f"{k}=%s" for k in allowed if k in b];vals=[b[k] or None for k in allowed if k in b]
 if not sets:return err("Nothing to update")
 c=db();q=c.cursor();q.execute("UPDATE leads SET "+",".join(sets)+" WHERE id=%s",vals+[i]);c.commit();q.close();c.close();return jsonify(message="Updated")

@app.get("/api/properties/projects")
@jwt_required()
def projects():
 c=db();q=c.cursor(dictionary=True);q.execute("SELECT * FROM projects ORDER BY name");x=clean(q.fetchall());q.close();c.close();return jsonify(x)
@app.post("/api/properties/projects")
@role("ADMIN")
def add_project():
 b=request.get_json() or {};c=db();q=c.cursor();q.execute("INSERT INTO projects(name,location,description) VALUES(%s,%s,%s)",(b.get("name"),b.get("location"),b.get("description")));c.commit();i=q.lastrowid;q.close();c.close();return jsonify(id=i),201

@app.get("/api/properties/buildings")
@jwt_required()
def buildings():
 c=db();q=c.cursor(dictionary=True);q.execute("SELECT b.*,p.name project_name FROM buildings b JOIN projects p ON p.id=b.project_id ORDER BY p.name,b.name");x=clean(q.fetchall());q.close();c.close();return jsonify(x)
@app.post("/api/properties/buildings")
@role("ADMIN")
def add_building():
 b=request.get_json() or {};c=db();q=c.cursor();q.execute("INSERT INTO buildings(project_id,name,floors) VALUES(%s,%s,%s)",(b.get("project_id"),b.get("name"),b.get("floors",1)));c.commit();i=q.lastrowid;q.close();c.close();return jsonify(id=i),201

@app.get("/api/properties/units")
@jwt_required()
def units():
 c=db();q=c.cursor(dictionary=True);q.execute("""SELECT u.*,b.name building_name,p.name project_name
 FROM units u JOIN buildings b ON b.id=u.building_id JOIN projects p ON p.id=b.project_id ORDER BY p.name,b.name,u.unit_no""");x=clean(q.fetchall());q.close();c.close();return jsonify(x)
@app.post("/api/properties/units")
@role("ADMIN")
def add_unit():
 b=request.get_json() or {};c=db();q=c.cursor()
 try:q.execute("INSERT INTO units(building_id,unit_no,unit_type,price,status) VALUES(%s,%s,%s,%s,%s)",(b.get("building_id"),b.get("unit_no"),b.get("unit_type"),b.get("price"),b.get("status","AVAILABLE")));c.commit();i=q.lastrowid
 except Exception as e:c.rollback();q.close();c.close();return err(str(e))
 q.close();c.close();return jsonify(id=i),201

@app.get("/api/bookings")
@jwt_required()
def get_bookings():
 c=db();q=c.cursor(dictionary=True);q.execute("""SELECT bk.*,l.name lead_name,l.phone,u.unit_no,u.unit_type,b.name building_name,p.name project_name,us.name booked_by_name
 FROM bookings bk JOIN leads l ON l.id=bk.lead_id JOIN units u ON u.id=bk.unit_id JOIN buildings b ON b.id=u.building_id JOIN projects p ON p.id=b.project_id JOIN users us ON us.id=bk.booked_by ORDER BY bk.booking_date DESC""");x=clean(q.fetchall());q.close();c.close();return jsonify(x)

@app.post("/api/bookings")
@jwt_required()
def book():
 b=request.get_json() or {}
 if not b.get("lead_id") or not b.get("unit_id"):return err("Lead and unit are required")
 c=db()
 try:
  c.start_transaction();q=c.cursor(dictionary=True)
  q.execute("SELECT id,status,price FROM units WHERE id=%s FOR UPDATE",(b["unit_id"],));u=q.fetchone()
  if not u:c.rollback();return err("Unit not found",404)
  if u["status"]!="AVAILABLE":c.rollback();return err("Unit is already booked",409)
  q.execute("SELECT id FROM leads WHERE id=%s",(b["lead_id"],))
  if not q.fetchone():c.rollback();return err("Lead not found",404)
  q.execute("INSERT INTO bookings(lead_id,unit_id,booked_by,amount) VALUES(%s,%s,%s,%s)",(b["lead_id"],b["unit_id"],int(get_jwt_identity()),b.get("amount") or u["price"]))
  i=q.lastrowid;q.execute("UPDATE units SET status='BOOKED' WHERE id=%s",(b["unit_id"],));q.execute("UPDATE leads SET stage='Booked' WHERE id=%s",(b["lead_id"],));c.commit()
 except Exception as e:c.rollback();return err(str(e),500)
 finally:c.close()
 return jsonify(id=i,message="Booking confirmed"),201

@app.get("/api/dashboard")
@jwt_required()
def dashboard():
 c=db();q=c.cursor(dictionary=True)
 def n(sql):q.execute(sql);return q.fetchone()["n"]
 data={"leads":n("SELECT COUNT(*) n FROM leads"),"bookings":n("SELECT COUNT(*) n FROM bookings WHERE status='CONFIRMED'"),"today_followups":n("SELECT COUNT(*) n FROM leads WHERE follow_up_date=CURDATE()"),"available_units":n("SELECT COUNT(*) n FROM units WHERE status='AVAILABLE'")}
 q.execute("SELECT stage,COUNT(*) n FROM leads GROUP BY stage");st=q.fetchall()
 q.execute("""SELECT l.id,l.name,l.phone,l.stage,l.follow_up_date,u.name assigned_name FROM leads l LEFT JOIN users u ON u.id=l.assigned_to
 WHERE l.follow_up_date IS NOT NULL ORDER BY l.follow_up_date LIMIT 8""");fu=clean(q.fetchall());q.close();c.close()
 return jsonify(stats=data,stages=st,upcoming_followups=fu)

if __name__=="__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
