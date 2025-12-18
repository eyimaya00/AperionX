# AperionX Project

## Overview
AperionX is a dynamic article management system built with Node.js, Express, and MySQL.

## Prerequisites
- Node.js (v14 or higher)
- MySQL Server

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/eyimaya00/AperionX.git
   cd AperionX
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   - Create a `.env` file in the root directory (copy from `.env.example`).
   - Add your database credentials and secret keys.

4. **Database Setup:**
   - The application will automatically attempt to create the database (`aperionx_db`) and tables on the first run if they don't exist.
   - Ensure your MySQL server is running.

## Running the Server

### Development
```bash
node server.js
```

### Production (using PM2)
It is recommended to use PM2 for production deployment.

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Start the application:**
   ```bash
   pm2 start ecosystem.config.js
   ```

3. **Monitor:**
   ```bash
   pm2 list
   pm2 logs
   ```
