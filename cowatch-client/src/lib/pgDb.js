import { Pool } from "pg";

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: true } : false,
});

(async () => {
    try {
        const client = await pool.connect();
        console.log("Database Connected Successfully!");
        client.release();
    } catch (error) {
        console.error("Database Connection Failed:", error.message);
    }
})();

export default pool;
