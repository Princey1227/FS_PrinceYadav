CONST adjectives = [
    "Swift", "Bright", "Smart", "Quick", "Wise", "Cool", "Sharp", "Bold",
    "Calm", "Fast", "Keen", "Alert", "Active", "Brave", "Clear", "Fresh"
]

CONST animals = [
    "Falcon", "Eagle", "Tiger", "Wolf", "Fox", "Lion", "Hawk", "Bear",
    "Deer", "Rabbit", "Shark", "Dolphin", "Panther", "Cheetah", "Owl", "Raven"
]

FUNCTION generateUsername():
    adjective = RANDOM_ELEMENT(adjectives)
    animal = RANDOM_ELEMENT(animals)
    number = RANDOM_NUMBER(1000, 9999)
    username = adjective + animal + number
    RETURN username

FUNCTION assignUniqueUsername(user_id):
    max_attempts = 100
    
    FOR attempt = 1 TO max_attempts:
        // First try from pre-generated pool
        available_username = QUERY "
            SELECT username FROM username_pool 
            WHERE is_used = FALSE 
            LIMIT 1 FOR UPDATE"
        
        IF available_username EXISTS:
            // Mark as used and assign
            UPDATE username_pool 
            SET is_used = TRUE, assigned_at = NOW() 
            WHERE username = available_username.username
            
            UPDATE users 
            SET anonymous_username = available_username.username 
            WHERE user_id = user_id
            
            RETURN available_username.username
        ELSE:
            // Generate new username
            new_username = generateUsername()
            
            // Check if unique across all tables
            existing = QUERY "
                SELECT 1 FROM users WHERE anonymous_username = $1
                UNION
                SELECT 1 FROM username_pool WHERE username = $1
            " WITH [new_username]
            
            IF NOT existing:
                UPDATE users 
                SET anonymous_username = new_username 
                WHERE user_id = user_id
                
                RETURN new_username
    
    THROW ERROR("Unable to generate unique username after max attempts")

// Background job to pre-populate username pool
FUNCTION populateUsernamePool():
    WHILE TRUE:
        pool_count = COUNT(*) FROM username_pool WHERE is_used = FALSE
        
        IF pool_count < 1000:
            FOR i = 1 TO 5000:
                username = generateUsername()
                
                TRY:
                    INSERT INTO username_pool (username) VALUES (username)
                CATCH DUPLICATE_KEY_ERROR:
                    // Skip duplicates
                    CONTINUE
        
        SLEEP(3600) // Run every hour