// PostgreSQL with PostGIS extension for geospatial queries
IMPORT pg, PostGIS extension
IMPORT redis for caching

CONNECTION_CONFIG = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
    }
}

FUNCTION connectDatabase():
    TRY:
        connection = NEW PostgreSQLConnection(CONNECTION_CONFIG)
        AWAIT connection.authenticate()
        
        // Enable PostGIS extension
        AWAIT connection.query('CREATE EXTENSION IF NOT EXISTS postgis')
        
        LOG("Database connected successfully with PostGIS")
        RETURN connection
    CATCH error:
        LOG("Database connection failed:", error)
        THROW error

FUNCTION connectRedis():
    redis_client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
    })
    
    redis_client.on('error', (err) => LOG('Redis Error:', err))
    RETURN redis_client