import os
import mysql.connector
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
load_dotenv()
c=mysql.connector.connect(host=os.getenv('DB_HOST','localhost'),port=int(os.getenv('DB_PORT','3306')),
 user=os.getenv('DB_USER','root'),password=os.getenv('DB_PASSWORD',''),database=os.getenv('DB_NAME','real_estate_crm'))
cur=c.cursor()
for e,p in [('admin@crm.local','admin123'),('sales@crm.local','sales123')]:
 cur.execute('UPDATE users SET password_hash=%s WHERE email=%s',(generate_password_hash(p),e))
c.commit();cur.close();c.close();print('Demo users ready.')
