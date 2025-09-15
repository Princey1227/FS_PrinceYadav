FUNCTION createRoute(req, res):
    TRY:
        user_id = req.user.user_id // From JWT middleware
        {start_address, end_address, departure_time, days_of_week} = req.body
        
        // Validate input
        IF NOT start_address OR NOT end_address OR NOT departure_time:
            RETURN res.status(400).json({error: "Missing required fields"})
        
        // Geocode addresses
        start_coords = AWAIT geocodeAddress(start_address)
        end_coords = AWAIT geocodeAddress(end_address)
        
        // Calculate route details
        route_details = AWAIT calculateRouteDetails(
            [start_coords.latitude, start_coords.longitude],
            [end_coords.latitude, end_coords.longitude]
        )
        
        // Create fuzzy locations for privacy
        fuzzy_start = createFuzzyLocation(start_coords.latitude, start_coords.longitude)
        fuzzy_end = createFuzzyLocation(end_coords.latitude, end_coords.longitude)
        
        // Save route to database
        route = AWAIT Route.create({
            user_id: user_id,
            start_location: `POINT(${start_coords.longitude} ${start_coords.latitude})`,
            end_location: `POINT(${end_coords.longitude} ${end_coords.latitude})`,
            fuzzy_start_location: `POINT(${fuzzy_start.longitude} ${fuzzy_start.latitude})`,
            fuzzy_end_location: `POINT(${fuzzy_end.longitude} ${fuzzy_end.latitude})`,
            route_polyline: `LINESTRING(${route_details.polyline.map(p => p.join(' ')).join(',')})`,
            departure_time: departure_time,
            days_of_week: days_of_week,
            route_distance_meters: route_details.distance_meters,
            estimated_duration_minutes: route_details.duration_minutes
        })
        
        // Find initial matches
        matches = AWAIT findRouteMatches(route.route_id)
        
        // Cache results
        AWAIT redis.setex(`route_matches_${route.route_id}`, 300, JSON.stringify(matches))
        
        res.status(201).json({
            route_id: route.route_id,
            matches: matches.slice(0, 10), // Return top 10
            route_details: {
                distance_meters: route_details.distance_meters,
                duration_minutes: route_details.duration_minutes
            }
        })
        
    CATCH error:
        LOG("Create route error:", error)
        res.status(500).json({error: "Route creation failed"})

FUNCTION getNearbyStudents(req, res):
    TRY:
        user_id = req.user.user_id
        route_id = req.params.route_id
        
        // Check if results are cached
        cached_matches = AWAIT redis.get(`route_matches_${route_id}`)
        
        IF cached_matches:
            RETURN res.json({
                matches: JSON.parse(cached_matches),
                cached: true
            })
        
        // Get fresh matches
        matches = AWAIT findRouteMatches(route_id)
        
        // Cache for 5 minutes
        AWAIT redis.setex(`route_matches_${route_id}`, 300, JSON.stringify(matches))
        
        res.json({
            matches: matches,
            cached: false
        })
        
    CATCH error:
        LOG("Get nearby students error:", error)
        res.status(500).json({error: "Failed to find nearby students"})

FUNCTION updateRouteStatus(req, res):
    TRY:
        user_id = req.user.user_id
        route_id = req.params.route_id
        {is_active} = req.body
        
        // Verify route ownership
        route = AWAIT Route.findOne({
            where: {route_id: route_id, user_id: user_id}
        })
        
        IF NOT route:
            RETURN res.status(404).json({error: "Route not found"})
        
        // Update status
        AWAIT route.update({is_active: is_active})
        
        // Clear cached matches
        AWAIT redis.del(`route_matches_${route_id}`)
        
        res.json({message: "Route status updated"})
        
    CATCH error:
        LOG("Update route status error:", error)
        res.status(500).json({error: "Failed to update route"})