FUNCTION findRouteMatches(user_route_id, max_distance_km = 5):
    // Get user's route details
    user_route = QUERY "
        SELECT r.*, u.anonymous_username 
        FROM routes r 
        JOIN users u ON r.user_id = u.user_id 
        WHERE r.route_id = $1 AND r.is_active = TRUE
    " WITH [user_route_id]
    
    IF NOT user_route:
        THROW ERROR("Route not found")
    
    // Find nearby routes using spatial query
    nearby_routes = QUERY "
        SELECT 
            r.*,
            u.anonymous_username,
            ST_Distance_Sphere(r.start_location, $1) as start_distance,
            ST_Distance_Sphere(r.end_location, $2) as end_distance
        FROM routes r
        JOIN users u ON r.user_id = u.user_id
        WHERE 
            r.user_id != $3 
            AND r.is_active = TRUE
            AND (
                ST_DWithin(r.start_location, $1, $4) OR
                ST_DWithin(r.end_location, $2, $4) OR
                ST_DWithin(r.route_polyline, $5, $4)
            )
            AND ABS(EXTRACT(EPOCH FROM r.departure_time - $6)) < 3600
        ORDER BY 
            LEAST(
                ST_Distance_Sphere(r.start_location, $1),
                ST_Distance_Sphere(r.end_location, $2)
            )
        LIMIT 50
    " WITH [
        user_route.start_location,
        user_route.end_location,
        user_route.user_id,
        max_distance_km * 1000, // Convert to meters
        user_route.route_polyline,
        user_route.departure_time
    ]
    
    potential_matches = []
    
    FOR each route IN nearby_routes:
        match_analysis = calculateRouteCompatibility(user_route, route)
        
        IF match_analysis.overall_score >= 0.6: // 60% minimum compatibility
            potential_matches.PUSH({
                route_id: route.route_id,
                user_id: route.user_id,
                anonymous_username: route.anonymous_username,
                overlap_percentage: match_analysis.overlap_percentage,
                compatibility_score: match_analysis.overall_score,
                shared_distance: match_analysis.shared_distance,
                time_difference: match_analysis.time_difference,
                fuzzy_start_location: route.fuzzy_start_location,
                fuzzy_end_location: route.fuzzy_end_location
            })
    
    // Sort by compatibility score
    potential_matches.SORT_BY(match => match.compatibility_score, DESC)
    
    // Store matches in database for future reference
    FOR each match IN potential_matches.SLICE(0, 20): // Top 20 matches
        UPSERT INTO route_matches (
            requester_route_id,
            matched_route_id,
            overlap_percentage,
            shared_distance_meters,
            time_compatibility_score,
            overall_match_score
        ) VALUES (
            user_route_id,
            match.route_id,
            match.overlap_percentage,
            match.shared_distance,
            match.time_difference,
            match.compatibility_score
        )
    
    RETURN potential_matches

FUNCTION calculateRouteCompatibility(route1, route2):
    // 1. Calculate route overlap using buffer zones
    buffer_distance = 500 // meters
    
    route1_buffer = ST_Buffer(route1.route_polyline, buffer_distance)
    route2_buffer = ST_Buffer(route2.route_polyline, buffer_distance)
    
    intersection = ST_Intersection(route1_buffer, route2_buffer)
    overlap_length = ST_Length(intersection)
    
    total_route_length = (
        ST_Length(route1.route_polyline) + 
        ST_Length(route2.route_polyline)
    ) / 2
    
    overlap_percentage = (overlap_length / total_route_length) * 100
    
    // 2. Calculate time compatibility
    time1 = EXTRACT(EPOCH FROM route1.departure_time)
    time2 = EXTRACT(EPOCH FROM route2.departure_time)
    time_diff_minutes = ABS(time1 - time2) / 60
    
    time_compatibility = MAX(0, 1 - (time_diff_minutes / 60)) // Max 1 hour difference
    
    // 3. Calculate proximity scores
    start_proximity = calculateProximityScore(
        route1.start_location, 
        route2.start_location,
        2000 // 2km max
    )
    
    end_proximity = calculateProximityScore(
        route1.end_location,
        route2.end_location, 
        2000 // 2km max
    )
    
    // 4. Calculate overall compatibility score
    weights = {
        overlap: 0.4,
        time: 0.3,
        start_proximity: 0.15,
        end_proximity: 0.15
    }
    
    overall_score = (
        overlap_percentage/100 * weights.overlap +
        time_compatibility * weights.time +
        start_proximity * weights.start_proximity +
        end_proximity * weights.end_proximity
    )
    
    RETURN {
        overlap_percentage: overlap_percentage,
        time_compatibility: time_compatibility,
        start_proximity: start_proximity,
        end_proximity: end_proximity,
        overall_score: overall_score,
        shared_distance: overlap_length,
        time_difference: time_diff_minutes
    }

FUNCTION calculateProximityScore(location1, location2, max_distance_meters):
    distance = ST_Distance_Sphere(location1, location2)
    
    IF distance >= max_distance_meters:
        RETURN 0
    
    // Linear decay: closer = higher score
    proximity_score = 1 - (distance / max_distance_meters)
    RETURN MAX(0, proximity_score)