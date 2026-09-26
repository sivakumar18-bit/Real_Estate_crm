# Real Estate CRM

Full-stack CRM using React + Vite frontend, Flask/Python backend and MySQL.

Features:
- JWT authentication with ADMIN and SALES roles
- Lead CRUD/search, stages, assignment, notes and follow-ups
- Projects, buildings and units
- Booking flow from lead to property unit
- MySQL row locking prevents double-booking
- Sales dashboard

## Run

1. MySQL: create the database with `backend/schema.sql`.
2. Backend:
   - `cd backend`
   - `python -m venv venv`
   - Windows: `venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - Copy `.env.example` to `.env` and set MySQL password.
   - `python create_demo_users.py`
   - `python app.py`
3. Frontend:
   - Open a second terminal.
   - `cd frontend`
   - `npm install`
   - `npm run dev`
4. Open `http://localhost:5173`

Demo accounts:
- Admin: `admin@crm.local` / `admin123`
- Sales: `sales@crm.local` / `sales123`

Change demo passwords before production use.
